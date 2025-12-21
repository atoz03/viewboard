import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Clock,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Settings,
} from "lucide-react";
import { Board } from "./components/kanban/Board";
import { TableView } from "./components/table/TableView";
import { NewTaskDialog } from "./components/shared/NewTaskDialog";
import { ViewSwitcher } from "./components/shared/ViewSwitcher";
import { WebDAVSettings } from "./features/settings/components/WebDAVSettings";
import { useSync } from "./features/sync/hooks/useSync";
import { TASK_STATUS_LABELS } from "./features/tasks/types/task.types";
import { useTaskStore } from "./features/tasks/stores/taskStore";

function App() {
  const tasks = useTaskStore((state) => state.tasks);
  const columns = useTaskStore((state) => state.columns);
  const syncStatus = useTaskStore((state) => state.syncStatus);
  const lastSyncTime = useTaskStore((state) => state.lastSyncTime);
  const loadFromDB = useTaskStore((state) => state.loadFromDB);
  const [view, setView] = useState<"board" | "table">("board");
  const { syncNow, syncConfig, setSyncConfig } = useSync();

  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => !task.deletedAt),
    [tasks],
  );

  const statusSummary = useMemo(() => {
    const counts = new Map(columns.map((column) => [column.status, 0]));
    visibleTasks.forEach((task) => {
      counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
    });
    return columns.map((column) => ({
      ...column,
      count: counts.get(column.status) ?? 0,
    }));
  }, [columns, visibleTasks]);

  const syncLabel =
    syncStatus === "syncing"
      ? "同步中"
      : syncStatus === "error"
        ? "同步失败"
        : "空闲";
  const lastSyncLabel = lastSyncTime
    ? format(lastSyncTime, "MM-dd HH:mm")
    : "尚未同步";

  return (
    <div className="min-h-screen px-6 pb-12 pt-8 lg:px-10">
      <header className="mb-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="vb-section-title text-4xl font-bold text-white">
              Task List - week
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              全局视图保持轻量，重点任务随时拖拽归档
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="vb-icon-button"
              type="button"
              onClick={() => setView("table")}
            >
              <Filter size={16} />
            </button>
            <button
              className="vb-icon-button"
              type="button"
              onClick={() => setView("board")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className="vb-icon-button"
              type="button"
              onClick={() => setView("table")}
            >
              <List size={16} />
            </button>
            <NewTaskDialog />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="vb-pill">
            <span>📌</span>
            <span>今日任务看板</span>
          </div>
          <ViewSwitcher value={view} onChange={setView} />
          <button className="vb-button" type="button" onClick={syncNow}>
            <RefreshCw size={16} />
            立即同步
          </button>
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Clock size={16} />
            <span>状态：{syncLabel}</span>
            <span className="text-neutral-600">·</span>
            <span>上次：{lastSyncLabel}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_260px]">
        <div className="min-h-[520px]">
          {view === "board" ? <Board /> : <TableView />}
        </div>
        <aside className="space-y-4">
          <div className="vb-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-200">
                固定定群组
              </h2>
              <span className="text-xs text-neutral-500">统计</span>
            </div>
            <div className="space-y-2">
              {statusSummary.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-800/60 bg-neutral-900/70 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <span>{TASK_STATUS_LABELS[column.status]}</span>
                  </div>
                  <span className="text-neutral-400">{column.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vb-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-200">同步设置</h2>
              <Settings size={16} className="text-neutral-400" />
            </div>
            <WebDAVSettings
              config={syncConfig}
              onConfigChange={setSyncConfig}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
