import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Column as ColumnType, Task } from "../../features/tasks/types/task.types";
import { DraggableCard } from "./DraggableCard";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
}

export const Column = ({ column, tasks }: ColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.status}`,
  });

  return (
    <section
      ref={setNodeRef}
      className={`vb-panel flex min-h-[420px] flex-col gap-3 p-3 transition ${
        isOver ? "border-violet-500/60" : ""
      }`}
    >
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="vb-text text-sm font-semibold">
            {column.title}
          </h3>
        </div>
        <span className="vb-muted text-xs">{tasks.length}</span>
      </header>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <DraggableCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
};
