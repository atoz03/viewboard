import { LayoutGrid, List } from "lucide-react";

interface ViewSwitcherProps {
  value: "board" | "table";
  onChange: (value: "board" | "table") => void;
}

export const ViewSwitcher = ({ value, onChange }: ViewSwitcherProps) => {
  return (
    <div className="vb-switcher">
      <button
        type="button"
        className={`vb-button ${
          value === "table" ? "vb-button-active" : ""
        }`}
        onClick={() => onChange("table")}
      >
        <List size={14} />
        表格
      </button>
      <button
        type="button"
        className={`vb-button ${
          value === "board" ? "vb-button-active" : ""
        }`}
        onClick={() => onChange("board")}
      >
        <LayoutGrid size={14} />
        看板
      </button>
    </div>
  );
};
