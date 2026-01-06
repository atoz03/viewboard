import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FilePenLine, Tag as TagIcon, Trash2 } from "lucide-react";
import type {
  Priority,
  Task,
  TaskStatus,
} from "../../features/tasks/types/task.types";
import {
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "../../features/tasks/types/task.types";
import { useTaskStore } from "../../features/tasks/stores/taskStore";
import { TagPicker } from "../shared/TagPicker";

interface CardProps {
  task: Task;
}

export const Card = ({ task }: CardProps) => {
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const availableTags = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((item) => {
      item.tags.forEach((tag) => {
        map.set(tag.label, tag.color);
      });
    });
    return Array.from(map.entries()).map(([label, color]) => ({
      id: label,
      label,
      color,
    }));
  }, [tasks]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setConfirmingDelete(false);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <div className="vb-card cursor-pointer space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="vb-text text-sm font-semibold">
              {task.title}
            </h4>
            <FilePenLine size={14} className="vb-muted" />
          </div>
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="vb-chip"
                  style={{ borderColor: `${tag.color}55`, color: tag.color }}
                >
                  <TagIcon size={12} />
                  {tag.label}
                </span>
              ))}
            </div>
          )}
          <div className="vb-muted flex items-center justify-between text-xs">
            <span>{TASK_STATUS_LABELS[task.status]}</span>
            <span>
              {task.priority ? PRIORITY_LABELS[task.priority] : "未设优先级"}
            </span>
          </div>
        </div>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="vb-overlay fixed inset-0" />
        <Dialog.Content className="vb-dialog">
          <Dialog.Title className="vb-text-strong text-lg font-semibold">
            任务详情
          </Dialog.Title>
          <Dialog.Description className="vb-muted mt-1 text-sm">
            直接修改字段会立即保存
          </Dialog.Description>

          <div className="mt-5 space-y-4">
            <div>
              <label className="vb-muted text-xs">标题</label>
              <input
                className="vb-input mt-2"
                value={task.title}
                onChange={(event) =>
                  updateTask(task.id, { title: event.target.value })
                }
              />
            </div>

            <div>
              <label className="vb-muted text-xs">描述</label>
              <textarea
                className="vb-input mt-2 min-h-[90px]"
                value={task.description ?? ""}
                onChange={(event) =>
                  updateTask(task.id, { description: event.target.value })
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="vb-muted text-xs">状态</label>
                <select
                  className="vb-select mt-2"
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
              </div>
              <div>
                <label className="vb-muted text-xs">优先级</label>
                <select
                  className="vb-select mt-2"
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
              </div>
            </div>

            <div>
              <label className="vb-muted text-xs">标签</label>
              <div className="mt-2">
                <TagPicker
                  value={task.tags}
                  availableTags={availableTags}
                  onChange={(tags) => updateTask(task.id, { tags })}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              className="vb-button"
              type="button"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 size={16} />
              删除任务
            </button>
            <Dialog.Close className="vb-button-primary" type="button">
              完成
            </Dialog.Close>
          </div>

          {confirmingDelete && (
            <div className="mt-4 rounded-xl border border-[color:var(--vb-border)] bg-[color:var(--vb-surface-strong)] p-4">
              <p className="vb-text text-sm font-semibold">
                确定删除这条任务吗？
              </p>
              <p className="vb-muted mt-1 text-xs">
                删除后会标记为已删除，并在下次同步时同步到远端。此操作不可撤销。
              </p>
              <div className="mt-3 flex justify-end gap-3">
                <button
                  type="button"
                  className="vb-button"
                  onClick={() => setConfirmingDelete(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="vb-button-primary"
                  onClick={() => {
                    deleteTask(task.id);
                    setOpen(false);
                  }}
                >
                  确认删除
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
