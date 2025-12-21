import { openDB } from "idb";
import type {
  ConflictRecord,
  StoredTask,
  SyncQueueItem,
  ViewBoardDB,
} from "./schema";

const DB_NAME = "viewboard-db";
const DB_VERSION = 1;

let dbPromise: Promise<import("idb").IDBPDatabase<ViewBoardDB>> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<ViewBoardDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("tasks")) {
          const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
          taskStore.createIndex("by-status", "status");
          taskStore.createIndex("by-updated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("conflicts")) {
          db.createObjectStore("conflicts", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
};

export const getAllStoredTasks = async (): Promise<StoredTask[]> => {
  const db = await getDb();
  return db.getAll("tasks");
};

export const putStoredTasks = async (tasks: StoredTask[]): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction("tasks", "readwrite");
  tasks.forEach((task) => {
    tx.store.put(task);
  });
  await tx.done;
};

export const deleteStoredTask = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete("tasks", id);
};

export const clearStoredTasks = async (): Promise<void> => {
  const db = await getDb();
  await db.clear("tasks");
};

export const addSyncQueueItem = async (item: SyncQueueItem): Promise<void> => {
  const db = await getDb();
  await db.put("syncQueue", item);
};

export const getSyncQueueItems = async (): Promise<SyncQueueItem[]> => {
  const db = await getDb();
  const items = await db.getAll("syncQueue");
  return items.sort((a, b) => a.timestamp - b.timestamp);
};

export const removeSyncQueueItem = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete("syncQueue", id);
};

export const clearSyncQueue = async (): Promise<void> => {
  const db = await getDb();
  await db.clear("syncQueue");
};

export const addConflict = async (record: ConflictRecord): Promise<void> => {
  const db = await getDb();
  await db.put("conflicts", record);
};

export const getConflicts = async (): Promise<ConflictRecord[]> => {
  const db = await getDb();
  return db.getAll("conflicts");
};

export const clearConflicts = async (): Promise<void> => {
  const db = await getDb();
  await db.clear("conflicts");
};
