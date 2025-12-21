export type TaskStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "archived";

export type Priority = "low" | "medium" | "high";

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  tags: Tag[];
  priority?: Priority;
  createdAt: Date;
  updatedAt: Date;
  order: number;
  version: number;
  deletedAt?: Date;
}

export interface Column {
  id: string;
  title: string;
  status: TaskStatus;
  order: number;
  color?: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  "not-started": "未开始",
  "in-progress": "进行中",
  completed: "完成",
  archived: "历史",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const DEFAULT_COLUMNS: Column[] = [
  {
    id: "col-not-started",
    title: "未开始",
    status: "not-started",
    order: 0,
    color: "#6f4a33",
  },
  {
    id: "col-in-progress",
    title: "进行中",
    status: "in-progress",
    order: 1,
    color: "#2f4e7a",
  },
  {
    id: "col-completed",
    title: "完成",
    status: "completed",
    order: 2,
    color: "#2f5d48",
  },
  {
    id: "col-archived",
    title: "历史",
    status: "archived",
    order: 3,
    color: "#3b3b3f",
  },
];
