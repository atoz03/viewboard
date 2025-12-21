import { createUuid } from "../utils/uuid";
import type { SyncQueueItem } from "../db/schema";
import {
  addSyncQueueItem,
  getSyncQueueItems,
  removeSyncQueueItem,
} from "../db/indexedDB";

export const enqueueSyncItem = async (
  item: Omit<SyncQueueItem, "id" | "timestamp" | "retryCount">,
): Promise<SyncQueueItem> => {
  const queueItem: SyncQueueItem = {
    ...item,
    id: createUuid(),
    timestamp: Date.now(),
    retryCount: 0,
  };
  await addSyncQueueItem(queueItem);
  return queueItem;
};

export const listSyncQueue = async (): Promise<SyncQueueItem[]> => {
  return getSyncQueueItems();
};

export const dequeueSyncItem = async (id: string): Promise<void> => {
  await removeSyncQueueItem(id);
};
