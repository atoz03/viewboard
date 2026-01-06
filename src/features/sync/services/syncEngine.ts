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

const TASK_FILE_NAME_RE =
  /^task-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json$/i;

const sanitizeBasePath = (input?: string): string => {
  const raw = input && input.trim() ? input.trim() : "/viewboard";
  const normalized = raw.replace(/\\/g, "/");
  const withLeadingSlash = normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;
  const segments = withLeadingSlash.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "/viewboard";
  }
  if (
    segments.some((segment) =>
      segment === "." ||
      segment === ".." ||
      segment.includes("\u0000"),
    )
  ) {
    throw new Error("WebDAV basePath 不安全：禁止包含 . / .. / NUL 等特殊段");
  }
  return `/${segments.join("/")}`;
};

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

const isValidTaskDTO = (value: unknown): value is TaskDTO => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.status === "string" &&
    Array.isArray(record.tags) &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.order === "number" &&
    typeof record.version === "number" &&
    (record.description === undefined || typeof record.description === "string") &&
    (record.priority === undefined || typeof record.priority === "string") &&
    (record.deletedAt === undefined || typeof record.deletedAt === "string")
  );
};

const isTaskLike = (value: unknown): value is Task => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.createdAt instanceof Date &&
    record.updatedAt instanceof Date &&
    typeof record.title === "string" &&
    typeof record.status === "string" &&
    typeof record.order === "number" &&
    typeof record.version === "number"
  );
};

export const syncAll = async (
  config: WebDAVConfig,
  localTasks: Task[],
): Promise<SyncResult> => {
  const client = createWebDAVClient(config);
  const basePath = sanitizeBasePath(config.basePath);
  const tasksPath = `${basePath}/tasks`;

  await client.ensureDirectory(basePath);
  await client.ensureDirectory(tasksPath);

  const queue = await listSyncQueue();
  for (const item of queue) {
    const filePath = `${tasksPath}/task-${item.entityId}.json`;
    if (item.operation === "delete") {
      if (
        isTaskLike(item.data) &&
        item.data.deletedAt instanceof Date
      ) {
        await client.putFile(
          filePath,
          JSON.stringify(serializeTask(item.data), null, 2),
        );
      } else {
        await client.deleteFile(filePath);
      }
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
    // 仅允许读取我们预期格式的任务文件，避免远端投毒/路径穿越。
    if (!TASK_FILE_NAME_RE.test(entry.name)) {
      continue;
    }
    const content = await client.getFile(`${tasksPath}/${entry.name}`);
    if (content.length > 2 * 1024 * 1024) {
      // 避免超大文件导致内存/渲染压力（按需可调）。
      continue;
    }
    try {
      const parsed = JSON.parse(content) as unknown;
      if (!isValidTaskDTO(parsed)) {
        continue;
      }
      const task = deserializeTask(parsed);
      if (!(task.createdAt instanceof Date) || Number.isNaN(task.createdAt.getTime())) {
        continue;
      }
      if (!(task.updatedAt instanceof Date) || Number.isNaN(task.updatedAt.getTime())) {
        continue;
      }
      if (task.deletedAt && Number.isNaN(task.deletedAt.getTime())) {
        continue;
      }
      remoteTasks.push(task);
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

    // 删除优先：一旦任一端标记 deletedAt，则优先保留删除状态，避免“删了又回来”。
    if (local.deletedAt || remote.deletedAt) {
      if (local.deletedAt && remote.deletedAt) {
        mergedMap.set(
          local.id,
          local.updatedAt >= remote.updatedAt ? local : remote,
        );
      } else if (local.deletedAt) {
        mergedMap.set(local.id, local);
        const filePath = `${tasksPath}/task-${local.id}.json`;
        await client.putFile(
          filePath,
          JSON.stringify(serializeTask(local), null, 2),
        );
      } else {
        mergedMap.set(remote.id, remote);
      }
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
    // 返回包含 deletedAt 的任务（墓碑），由 UI 层统一过滤显示；用于避免全删后重建种子任务。
    mergedTasks: Array.from(mergedMap.values()),
  };
};
