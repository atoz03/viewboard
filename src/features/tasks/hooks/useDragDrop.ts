import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useTaskStore } from "../stores/taskStore";
import type { TaskStatus } from "../types/task.types";

export const useDragDrop = () => {
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const reorderTasks = useTaskStore((state) => state.reorderTasks);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (overId.startsWith("column-")) {
      const newStatus = overId.replace("column-", "") as TaskStatus;
      updateTask(activeId, { status: newStatus });
      return;
    }

    if (overId === activeId) {
      return;
    }

    const activeTask = tasks.find((task) => task.id === activeId);
    const overTask = tasks.find((task) => task.id === overId);
    if (!activeTask || !overTask) {
      return;
    }

    const targetStatus = overTask.status;
    const statusTasks = tasks
      .filter((task) => task.status === targetStatus && !task.deletedAt)
      .sort((a, b) => a.order - b.order);

    const oldIndex = statusTasks.findIndex((task) => task.id === activeId);
    const newIndex = statusTasks.findIndex((task) => task.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
      if (activeTask.status !== targetStatus) {
        const inserted = statusTasks.slice();
        const nextActive = { ...activeTask, status: targetStatus };
        const insertAt = newIndex >= 0 ? newIndex : statusTasks.length;
        inserted.splice(insertAt, 0, nextActive);
        reorderTasks(inserted);
      }
      return;
    }

    const reordered = arrayMove(statusTasks, oldIndex, newIndex);
    if (activeTask.status !== targetStatus) {
      reordered[reordered.findIndex((task) => task.id === activeId)] = {
        ...activeTask,
        status: targetStatus,
      };
    }
    reorderTasks(reordered);
  };

  return { handleDragEnd };
};
