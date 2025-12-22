import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus } from "lucide-react";
import type {
  Priority,
  Tag,
  TaskStatus,
} from "../../features/tasks/types/task.types";
import {
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "../../features/tasks/types/task.types";
import { useTaskStore } from "../../features/tasks/stores/taskStore";
import { TagPicker } from "./TagPicker";

export const NewTaskDialog = () => {
  const tasks = useTaskStore((state) => state.tasks);
  const addTask = useTaskStore((state) => state.addTask);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("not-started");
  const [priority, setPriority] = useState<Priority | "">("");
  const [tags, setTags] = useState<Tag[]>([]);
  const canCreate = title.trim().length > 0;

  const availableTags = useMemo(() => {
    const map = new Map<string, Tag>();
    tasks.forEach((task) => {
      task.tags.forEach((tag) => {
        map.set(tag.label, tag);
      });
    });
    return Array.from(map.values());
  }, [tasks]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("not-started");
    setPriority("");
    setTags([]);
  };

  const handleCreate = () => {
    if (!canCreate) {
      return;
    }
    const created = addTask({
      title,
      description,
      status,
      priority: priority || undefined,
      tags,
    });
    if (created) {
      resetForm();
      setOpen(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="vb-button-primary" type="button">
          <Plus size={16} />
          新建
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="vb-overlay fixed inset-0" />
        <Dialog.Content className="vb-dialog">
          <Dialog.Title className="vb-text-strong text-lg font-semibold">
            新建任务
          </Dialog.Title>
          <Dialog.Description className="vb-muted mt-1 text-sm">
            用清晰的标题和标签标记任务
          </Dialog.Description>

          <div className="mt-5 space-y-4">
            <div>
              <label className="vb-muted text-xs">标题</label>
              <input
                className="vb-input mt-2"
                placeholder="输入任务标题"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div>
              <label className="vb-muted text-xs">描述</label>
              <textarea
                className="vb-input mt-2 min-h-[90px]"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="vb-muted text-xs">状态</label>
                <select
                  className="vb-select mt-2"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as TaskStatus)
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
                  value={priority}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPriority(value ? (value as Priority) : "");
                  }}
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
                  value={tags}
                  availableTags={availableTags}
                  onChange={setTags}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close className="vb-button" type="button">
              取消
            </Dialog.Close>
            <button
              className="vb-button-primary disabled:opacity-50"
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
            >
              创建任务
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
