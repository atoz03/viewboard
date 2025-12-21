import type { Task } from "../../tasks/types/task.types";
import { addConflict } from "../../../lib/db/indexedDB";
import { dequeueSyncItem, listSyncQueue } from "../../../lib/storage/syncQueue";
import { createUuid } from "../../../lib/utils/uuid";
import { createWebDAVClient, type WebDAVConfig } from "./webdavClient";

interface TaskDTO {
  id: string;
  title: string;
  description?: string;
  status: Task["status"];
  tags: Task["tags"];
  priority?: Task["priority"];
  createdAt: string;
  updatedAt: string;
  order: number;
  version: number;
  deletedAt?: string;
}

export interface SyncResult {
  mergedTasks: Task[];
}

const serializeTask = (task: Task): TaskDTO => ({
  ...task,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
  deletedAt: task.deletedAt ? task.deletedAt.toISOString() : undefined,
});

const deserializeTask = (task: TaskDTO): Task => ({
  ...task,
  createdAt: new Date(task.createdAt),
  updatedAt: new Date(task.updatedAt),
  deletedAt: task.deletedAt ? new Date(task.deletedAt) : undefined,
});

export const syncAll = async (
  config: WebDAVConfig,
  localTasks: Task[],
): Promise<SyncResult> => {
  const client = createWebDAVClient(config);
  const basePathRaw = config.basePath && config.basePath.trim()
    ? config.basePath.trim()
    : "/viewboard";
  const basePath = basePathRaw.startsWith("/")
    ? basePathRaw
    : `/${basePathRaw}`;
  const tasksPath = `${basePath}/tasks`;

  await client.ensureDirectory(basePath);
  await client.ensureDirectory(tasksPath);

  const queue = await listSyncQueue();
  for (const item of queue) {
    const filePath = `${tasksPath}/task-${item.entityId}.json`;
    if (item.operation === "delete") {
      await client.deleteFile(filePath);
    } else {
      const data = item.data as Task;
      await client.putFile(filePath, JSON.stringify(serializeTask(data), null, 2));
    }
    await dequeueSyncItem(item.id);
  }

  const entries = await client.listDirectory(tasksPath);
  const remoteTasks: Task[] = [];
  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }
    if (!entry.name.startsWith("task-")) {
      continue;
    }
    const content = await client.getFile(`${tasksPath}/${entry.name}`);
    try {
      const parsed = JSON.parse(content) as TaskDTO;
      remoteTasks.push(deserializeTask(parsed));
    } catch {
      // 避免单个异常文件阻塞整体同步
      continue;
    }
  }

  const localMap = new Map(localTasks.map((task) => [task.id, task]));
  const mergedMap = new Map(localMap);

  for (const remote of remoteTasks) {
    // 冲突策略：按更新时间最后写入优先，并记录冲突。
    const local = localMap.get(remote.id);
    if (!local) {
      mergedMap.set(remote.id, remote);
      continue;
    }

    if (local.version === remote.version) {
      if (remote.updatedAt > local.updatedAt) {
        mergedMap.set(remote.id, remote);
      }
      continue;
    }

    const localNewer = local.updatedAt >= remote.updatedAt;
    await addConflict({
      id: createUuid(),
      localVersion: local,
      remoteVersion: remote,
      timestamp: Date.now(),
    });

    if (localNewer) {
      mergedMap.set(local.id, local);
      const filePath = `${tasksPath}/task-${local.id}.json`;
      await client.putFile(filePath, JSON.stringify(serializeTask(local), null, 2));
    } else {
      mergedMap.set(remote.id, remote);
    }
  }

  return {
    mergedTasks: Array.from(mergedMap.values()).filter(
      (task) => !task.deletedAt,
    ),
  };
};
