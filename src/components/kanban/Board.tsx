import { DndContext } from "@dnd-kit/core";
import { useTasks } from "../../features/tasks/hooks/useTasks";
import { useDragDrop } from "../../features/tasks/hooks/useDragDrop";
import { Column } from "./Column";

export const Board = () => {
  const { columns, getTasksByStatus } = useTasks();
  const { handleDragEnd } = useDragDrop();

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={getTasksByStatus(column.status)}
            />
          ))}
      </div>
    </DndContext>
  );
};
