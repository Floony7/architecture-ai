import { NodeToolbar } from "@xyflow/react";

import { NODE_COLORS } from "@/types/canvas";

interface NodeColorToolbarProps {
  activeFill: string | undefined;
  onColorChange: (fill: string) => void;
}

export function NodeColorToolbar({ activeFill, onColorChange }: NodeColorToolbarProps) {
  return (
    <NodeToolbar
      isVisible
      offset={12}
      className="nodrag nopan nowheel flex gap-1 rounded-full border border-surface-border bg-surface p-1.5 shadow-lg"
      role="group"
      aria-label="Node colors"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {NODE_COLORS.map(({ name, fill, text }) => (
        <button
          key={fill}
          type="button"
          className="canvas-node-color-swatch"
          aria-label={name}
          aria-pressed={fill === activeFill}
          title={name}
          style={{ backgroundColor: fill, color: text }}
          onClick={() => onColorChange(fill)}
        />
      ))}
    </NodeToolbar>
  );
}
