import { LayoutGrid, List } from "lucide-react";

interface ViewSwitcherProps {
  value: "board" | "table";
  onChange: (value: "board" | "table") => void;
}

export const ViewSwitcher = ({ value, onChange }: ViewSwitcherProps) => {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-800/70 bg-neutral-900/70 p-1">
      <button
        type="button"
        className={`vb-button ${
          value === "table" ? "border-transparent bg-neutral-700/80" : ""
        }`}
        onClick={() => onChange("table")}
      >
        <List size={14} />
        表格
      </button>
      <button
        type="button"
        className={`vb-button ${
          value === "board" ? "border-transparent bg-neutral-700/80" : ""
        }`}
        onClick={() => onChange("board")}
      >
        <LayoutGrid size={14} />
        看板
      </button>
    </div>
  );
};
