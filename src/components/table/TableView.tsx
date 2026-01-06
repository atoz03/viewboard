import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  DEFAULT_COLUMNS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "../../features/tasks/types/task.types";
import type { Priority, Tag, TaskStatus } from "../../features/tasks/types/task.types";
import { useTaskStore } from "../../features/tasks/stores/taskStore";
import { TagPicker } from "../shared/TagPicker";

export const TableView = () => {
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);

  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"updated" | "created" | "status">(
    "updated",
  );

  const statusOrder = useMemo(() => {
    return new Map(DEFAULT_COLUMNS.map((column, index) => [column.status, index]));
  }, []);

  const availableTags = useMemo(() => {
    const map = new Map<string, Tag>();
    tasks.forEach((task) => {
      task.tags.forEach((tag) => {
        map.set(tag.label, tag);
      });
    });
    return Array.from(map.values());
  }, [tasks]);

  const tags = useMemo(
    () => availableTags.map((tag) => tag.label),
    [availableTags],
  );

  const filtered = useMemo(() => {
    return tasks
      .filter((task) => !task.deletedAt)
      .filter((task) =>
        statusFilter === "all" ? true : task.status === statusFilter,
      )
      .filter((task) =>
        tagFilter === "all"
          ? true
          : task.tags.some((tag) => tag.label === tagFilter),
      )
      .sort((a, b) => {
        switch (sortKey) {
          case "created":
            return b.createdAt.getTime() - a.createdAt.getTime();
          case "status":
            return (
              (statusOrder.get(a.status) ?? 0) -
              (statusOrder.get(b.status) ?? 0)
            );
          default:
            return b.updatedAt.getTime() - a.updatedAt.getTime();
        }
      });
  }, [tasks, statusFilter, tagFilter, sortKey, statusOrder]);

  return (
    <div className="vb-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="vb-select w-36"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as TaskStatus | "all")
            }
          >
            <option value="all">全部状态</option>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="vb-select w-36"
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
          >
            <option value="all">全部标签</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="vb-muted-strong text-xs">排序</span>
          <select
            className="vb-select w-36"
            value={sortKey}
            onChange={(event) =>
              setSortKey(event.target.value as "updated" | "created" | "status")
            }
          >
            <option value="updated">更新时间</option>
            <option value="created">创建时间</option>
            <option value="status">状态</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-auto">
        <table className="w-full border-separate border-spacing-y-2 text-sm">
          <thead className="vb-muted-strong text-left text-xs">
            <tr>
              <th className="pb-2">标题</th>
              <th className="pb-2">状态</th>
              <th className="pb-2">优先级</th>
              <th className="pb-2">标签</th>
              <th className="pb-2">更新时间</th>
              <th className="pb-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr key={task.id} className="vb-row">
                <td className="rounded-l-xl px-3 py-3">
                  <input
                    className="vb-input"
                    value={task.title}
                    onChange={(event) =>
                      updateTask(task.id, { title: event.target.value })
                    }
                  />
                </td>
                <td className="px-3 py-3">
                  <select
                    className="vb-select"
                    value={task.status}
                    onChange={(event) =>
                      updateTask(task.id, {
                        status: event.target.value as TaskStatus,
                      })
                    }
                  >
                    {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <select
                    className="vb-select"
                    value={task.priority ?? ""}
                    onChange={(event) =>
                      updateTask(task.id, {
                        priority: event.target.value
                          ? (event.target.value as Priority)
                          : undefined,
                      })
                    }
                  >
                    <option value="">未设置</option>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {task.tags.length === 0 ? (
                      <span className="vb-muted-strong text-xs">暂无</span>
                    ) : (
                      task.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="vb-chip"
                          style={{
                            borderColor: `${tag.color}66`,
                            color: tag.color,
                          }}
                        >
                          {tag.label}
                        </span>
                      ))
                    )}
                    <TagPicker
                      value={task.tags}
                      availableTags={availableTags}
                      onChange={(tags) => updateTask(task.id, { tags })}
                    />
                  </div>
                </td>
                <td className="vb-muted px-3 py-3 text-xs">
                  {task.updatedAt.toLocaleString()}
                </td>
                <td className="rounded-r-xl px-3 py-3 text-right">
                  <button
                    type="button"
                    className="vb-icon-button"
                    aria-label="删除任务"
                    title="删除任务"
                    onClick={() => {
                      const confirmed = window.confirm(
                        `确定删除“${task.title}”吗？删除后将从本地移除，并在下次同步时同步到远端。此操作不可撤销。`,
                      );
                      if (!confirmed) {
                        return;
                      }
                      deleteTask(task.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="vb-muted-strong py-8 text-center text-sm">
            暂无匹配任务
          </div>
        )}
      </div>
    </div>
  );
};
