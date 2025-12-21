import { useMemo } from "react";
import { useTaskStore } from "../stores/taskStore";
import type { TaskStatus } from "../types/task.types";

export const useTasks = () => {
  const tasks = useTaskStore((state) => state.tasks);
  const columns = useTaskStore((state) => state.columns);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => !task.deletedAt),
    [tasks],
  );

  const getTasksByStatus = (status: TaskStatus) =>
    visibleTasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.order - b.order);

  return {
    tasks: visibleTasks,
    columns,
    getTasksByStatus,
  };
};
