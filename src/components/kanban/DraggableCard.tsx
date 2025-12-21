import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../../features/tasks/types/task.types";
import { Card } from "./Card";

interface DraggableCardProps {
  task: Task;
}

export const DraggableCard = ({ task }: DraggableCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-70" : ""}
      {...attributes}
      {...listeners}
    >
      <Card task={task} />
    </div>
  );
};
