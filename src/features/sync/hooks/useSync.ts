import { useCallback, useEffect, useState } from "react";
import { syncAll } from "../services/syncEngine";
import type { WebDAVConfig } from "../services/webdavClient";
import { useTaskStore } from "../../tasks/stores/taskStore";

const SYNC_CONFIG_KEY = "viewboard:sync-config";

const loadSyncConfig = (): WebDAVConfig | null => {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    return raw ? (JSON.parse(raw) as WebDAVConfig) : null;
  } catch {
    return null;
  }
};

const saveSyncConfig = (config: WebDAVConfig | null) => {
  if (!config) {
    localStorage.removeItem(SYNC_CONFIG_KEY);
    return;
  }
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
};

export const useSync = () => {
  const [syncConfig, setSyncConfigState] = useState<WebDAVConfig | null>(() =>
    loadSyncConfig(),
  );

  const setTasks = useTaskStore((state) => state.setTasks);
  const setSyncStatus = useTaskStore((state) => state.setSyncStatus);
  const setLastSyncTime = useTaskStore((state) => state.setLastSyncTime);

  const setSyncConfig = useCallback((config: WebDAVConfig | null) => {
    setSyncConfigState(config);
    saveSyncConfig(config);
  }, []);

  const syncNow = useCallback(async () => {
    // 使用最新 store 快照，避免依赖变更导致无限更新
    const { tasks, syncStatus } = useTaskStore.getState();
    if (!syncConfig || syncStatus === "syncing") {
      return;
    }
    setSyncStatus("syncing");
    try {
      const result = await syncAll(syncConfig, tasks);
      setTasks(result.mergedTasks, "synced");
      setSyncStatus("idle");
      setLastSyncTime(new Date());
    } catch (error) {
      console.error(error);
      setSyncStatus("error");
    }
  }, [syncConfig, setTasks, setSyncStatus, setLastSyncTime]);

  useEffect(() => {
    if (syncConfig) {
      void syncNow();
    }
  }, [syncConfig, syncNow]);

  useEffect(() => {
    if (!syncConfig) {
      return;
    }
    const timer = window.setInterval(() => {
      void syncNow();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [syncConfig, syncNow]);

  return { syncNow, syncConfig, setSyncConfig };
};
