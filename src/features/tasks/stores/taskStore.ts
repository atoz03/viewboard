import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Priority,
  Tag,
  Task,
  TaskStatus,
} from "../types/task.types";
import { DEFAULT_COLUMNS } from "../types/task.types";
import {
  clearStoredTasks,
  getAllStoredTasks,
  putStoredTasks,
} from "../../../lib/db/indexedDB";
import type { StoredTask, SyncStatus } from "../../../lib/db/schema";
import { enqueueSyncItem } from "../../../lib/storage/syncQueue";
import { loadCache, saveCache } from "../../../lib/storage/cache";
import { createUuid } from "../../../lib/utils/uuid";

export interface TaskStore {
  tasks: Task[];
  columns: typeof DEFAULT_COLUMNS;
  syncStatus: "idle" | "syncing" | "error";
  lastSyncTime?: Date;
  isHydrated: boolean;
  loadFromDB: () => Promise<void>;
  addTask: (input: {
    title: string;
    description?: string;
    status?: TaskStatus;
    tags?: Tag[];
    priority?: Priority;
  }) => Task | null;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (tasks: Task[]) => void;
  setTasks: (tasks: Task[], syncStatus?: SyncStatus) => void;
  setSyncStatus: (status: TaskStore["syncStatus"]) => void;
  setLastSyncTime: (time?: Date) => void;
}

const toStoredTask = (task: Task, status: SyncStatus): StoredTask => ({
  ...task,
  _syncStatus: status,
  _localVersion: task.version,
});

const fromStoredTask = (task: StoredTask): Task => {
  const { _syncStatus, _localVersion, ...rest } = task;
  void _syncStatus;
  void _localVersion;
  return rest;
};

const createSeedTasks = (): Task[] => {
  const now = new Date();
  const tags: Tag[] = [
    { id: createUuid(), label: "设计", color: "#7C5C3C" },
    { id: createUuid(), label: "写作", color: "#3F5B8C" },
    { id: createUuid(), label: "研究", color: "#3F6B57" },
    { id: createUuid(), label: "工具", color: "#5C5C5C" },
  ];

  const getTag = (label: string) =>
    tags.find((tag) => tag.label === label) ?? tags[0];

  return [
    {
      id: createUuid(),
      title: "整理 25daysofagents 选题",
      status: "not-started",
      tags: [getTag("研究")],
      priority: "medium",
      createdAt: now,
      updatedAt: now,
      order: 0,
      version: 1,
    },
    {
      id: createUuid(),
      title: "补齐 IJCAI 论文材料",
      status: "not-started",
      tags: [getTag("写作")],
      priority: "high",
      createdAt: now,
      updatedAt: now,
      order: 1,
      version: 1,
    },
    {
      id: createUuid(),
      title: "复盘实验日志",
      status: "in-progress",
      tags: [getTag("研究")],
      priority: "medium",
      createdAt: now,
      updatedAt: now,
      order: 0,
      version: 1,
    },
    {
      id: createUuid(),
      title: "优化评审汇报结构",
      status: "in-progress",
      tags: [getTag("写作"), getTag("设计")],
      priority: "high",
      createdAt: now,
      updatedAt: now,
      order: 1,
      version: 1,
    },
    {
      id: createUuid(),
      title: "确认 WebDAV 同步流程",
      status: "completed",
      tags: [getTag("工具")],
      priority: "low",
      createdAt: now,
      updatedAt: now,
      order: 0,
      version: 1,
    },
    {
      id: createUuid(),
      title: "整理 UI 交互细节",
      status: "completed",
      tags: [getTag("设计")],
      priority: "medium",
      createdAt: now,
      updatedAt: now,
      order: 1,
      version: 1,
    },
    {
      id: createUuid(),
      title: "归档旧版本需求",
      status: "archived",
      tags: [getTag("工具")],
      priority: "low",
      createdAt: now,
      updatedAt: now,
      order: 0,
      version: 1,
    },
  ];
};

const getNextOrder = (tasks: Task[], status: TaskStatus): number => {
  const maxOrder = tasks
    .filter((task) => task.status === status && !task.deletedAt)
    .reduce((max, task) => Math.max(max, task.order), -1);
  return maxOrder + 1;
};

export const useTaskStore = create<TaskStore>()(
  immer((set, get) => ({
    tasks: [],
    columns: DEFAULT_COLUMNS,
    syncStatus: "idle",
    lastSyncTime: undefined,
    isHydrated: false,
    loadFromDB: async () => {
      const storedTasks = await getAllStoredTasks();
      if (storedTasks.length === 0) {
        const seed = createSeedTasks();
        set((state) => {
          state.tasks = seed;
          state.isHydrated = true;
        });
        await putStoredTasks(seed.map((task) => toStoredTask(task, "synced")));
      } else {
        set((state) => {
          state.tasks = storedTasks.map(fromStoredTask);
          state.isHydrated = true;
        });
      }

      const cache = loadCache();
      if (cache.lastSyncTime) {
        set((state) => {
          state.lastSyncTime = new Date(cache.lastSyncTime as string);
        });
      }
    },
    addTask: (input) => {
      if (!input.title.trim()) {
        return null;
      }
      const now = new Date();
      const status = input.status ?? "not-started";
      const nextOrder = getNextOrder(get().tasks, status);
      const description = input.description?.trim();
      const task: Task = {
        id: createUuid(),
        title: input.title.trim(),
        description: description || undefined,
        status,
        tags: input.tags ?? [],
        priority: input.priority,
        createdAt: now,
        updatedAt: now,
        order: nextOrder,
        version: 1,
      };
      set((state) => {
        state.tasks.push(task);
      });
      void putStoredTasks([toStoredTask(task, "pending")]);
      void enqueueSyncItem({
        operation: "create",
        entityId: task.id,
        data: task,
      });
      return task;
    },
    updateTask: (id, updates) => {
      const now = new Date();
      const normalizedUpdates: Partial<Task> = { ...updates };
      if (typeof updates.title === "string") {
        const trimmedTitle = updates.title.trim();
        if (trimmedTitle) {
          normalizedUpdates.title = trimmedTitle;
        } else {
          delete normalizedUpdates.title;
        }
      }
      if (typeof updates.description === "string") {
        const trimmed = updates.description.trim();
        normalizedUpdates.description = trimmed ? trimmed : undefined;
      }
      set((state) => {
        const task = state.tasks.find((item) => item.id === id);
        if (!task) {
          return;
        }
        const nextStatus = updates.status ?? task.status;
        const nextOrder =
          nextStatus !== task.status
            ? getNextOrder(state.tasks, nextStatus)
            : task.order;
        Object.assign(task, normalizedUpdates, {
          status: nextStatus,
          order: nextOrder,
          updatedAt: now,
          version: task.version + 1,
        });
      });
      const taskToSync = get().tasks.find((task) => task.id === id);
      if (taskToSync) {
        void putStoredTasks([toStoredTask(taskToSync, "pending")]);
        void enqueueSyncItem({
          operation: "update",
          entityId: taskToSync.id,
          data: taskToSync,
        });
      }
    },
    deleteTask: (id) => {
      const now = new Date();
      const existing = get().tasks.find((item) => item.id === id);
      if (!existing) {
        return;
      }
      const deletedTask: Task = {
        ...existing,
        deletedAt: now,
        updatedAt: now,
        version: existing.version + 1,
      };
      set((state) => {
        const task = state.tasks.find((item) => item.id === id);
        if (!task) {
          return;
        }
        Object.assign(task, deletedTask);
      });
      void putStoredTasks([toStoredTask(deletedTask, "pending")]);
      void enqueueSyncItem({
        operation: "delete",
        entityId: id,
        data: deletedTask,
      });
    },
    reorderTasks: (tasks: Task[]) => {
      if (tasks.length === 0) {
        return;
      }
      const updated: Task[] = tasks.map((task, index) => ({
        ...task,
        order: index,
        updatedAt: new Date(),
        version: task.version + 1,
      }));
      set((state) => {
        const map = new Map(updated.map((task) => [task.id, task]));
        state.tasks = state.tasks.map((task) => map.get(task.id) ?? task);
      });
      void putStoredTasks(updated.map((task) => toStoredTask(task, "pending")));
      updated.forEach((task) => {
        void enqueueSyncItem({
          operation: "update",
          entityId: task.id,
          data: task,
        });
      });
    },
    setTasks: (tasks, syncStatus = "synced") => {
      set((state) => {
        state.tasks = tasks;
      });
      void clearStoredTasks().then(() => {
        void putStoredTasks(tasks.map((task) => toStoredTask(task, syncStatus)));
      });
    },
    setSyncStatus: (status) => {
      set((state) => {
        state.syncStatus = status;
      });
    },
    setLastSyncTime: (time) => {
      set((state) => {
        state.lastSyncTime = time;
      });
      if (time) {
        saveCache({ lastSyncTime: time.toISOString() });
      }
    },
  })),
);
