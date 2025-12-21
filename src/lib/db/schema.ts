import type { DBSchema } from "idb";
import type { Task } from "../../features/tasks/types/task.types";

export type SyncStatus = "synced" | "pending" | "conflict";

export interface StoredTask extends Task {
  _syncStatus: SyncStatus;
  _localVersion: number;
}

export interface SyncQueueItem {
  id: string;
  operation: "create" | "update" | "delete";
  entityId: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

export interface ConflictRecord {
  id: string;
  localVersion: Task;
  remoteVersion: Task;
  timestamp: number;
}

export interface ViewBoardDB extends DBSchema {
  tasks: {
    key: string;
    value: StoredTask;
    indexes: { "by-status": string; "by-updated": Date };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
  };
  conflicts: {
    key: string;
    value: ConflictRecord;
  };
}
