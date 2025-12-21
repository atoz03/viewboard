import type { Column } from "../features/tasks/types/task.types";

export interface Board {
  id: string;
  title: string;
  columns: Column[];
}
