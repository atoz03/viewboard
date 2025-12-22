import { useMemo, useState } from "react";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import type { Tag } from "../../features/tasks/types/task.types";
import { createUuid } from "../../lib/utils/uuid";

interface TagPickerProps {
  value: Tag[];
  availableTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export const TagPicker = ({ value, availableTags, onChange }: TagPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");

  const options = useMemo(() => {
    const map = new Map<string, Tag>();
    [...availableTags, ...value].forEach((tag) => {
      map.set(tag.label, tag);
    });
    return Array.from(map.values());
  }, [availableTags, value]);

  const toggleTag = (tag: Tag) => {
    const exists = value.some((item) => item.label === tag.label);
    if (exists) {
      onChange(value.filter((item) => item.label !== tag.label));
    } else {
      onChange([...value, tag]);
    }
  };

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) {
      return;
    }
    const existing = options.find((tag) => tag.label === label);
    if (existing) {
      toggleTag(existing);
    } else {
      onChange([
        ...value,
        { id: createUuid(), label, color: newColor || "#6b7280" },
      ]);
    }
    setNewLabel("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="vb-button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <TagIcon size={14} />
        标签管理
      </button>

      {isOpen && (
        <div className="vb-popover absolute z-10 mt-2 w-72">
          <div className="vb-muted flex items-center justify-between text-xs">
            <span>已有标签</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="vb-muted-strong hover:text-[color:var(--vb-text)]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {options.length === 0 && (
              <span className="vb-muted-strong text-xs">暂无标签</span>
            )}
            {options.map((tag) => {
              const selected = value.some((item) => item.label === tag.label);
              return (
                <button
                  key={tag.label}
                  type="button"
                  className={`vb-chip transition ${
                    selected ? "border-transparent" : "opacity-70"
                  }`}
                  style={{ color: tag.color, borderColor: `${tag.color}66` }}
                  onClick={() => toggleTag(tag)}
                >
                  <TagIcon size={12} />
                  {tag.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-2">
            <label className="vb-muted text-xs">新增标签</label>
            <input
              className="vb-input"
              placeholder="输入标签名称"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                className="vb-color-input"
                type="color"
                value={newColor}
                onChange={(event) => setNewColor(event.target.value)}
              />
              <button
                type="button"
                className="vb-button"
                onClick={handleAdd}
              >
                <Plus size={14} />
                添加标签
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
