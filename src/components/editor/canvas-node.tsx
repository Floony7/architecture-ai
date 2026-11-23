"use client";

import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

import { DEFAULT_NODE_COLOR, NODE_COLORS, type CanvasNode } from "@/types/canvas";

import { CanvasNodeShape } from "./canvas-node-shape";
import { NodeColorToolbar } from "./node-color-toolbar";

const labelPlaceholder = "Add label";

export function CanvasNodeRenderer({ id, data, selected }: NodeProps<CanvasNode>) {
  const { label, shape } = data;
  const fill = data.color ?? DEFAULT_NODE_COLOR;
  const activeColor = NODE_COLORS.find((option) => option.fill.toLowerCase() === fill.toLowerCase());
  const { updateNodeData } = useReactFlow<CanvasNode>();
  const [isEditing, setIsEditing] = useState(false);
  const labelInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) labelInput.current?.focus({ preventScroll: true });
  }, [isEditing]);

  return (
    <div
      className="canvas-node relative flex h-full w-full items-center justify-center text-node-label"
      data-shape={shape}
      style={{ color: activeColor?.text }}
    >
      <CanvasNodeShape shape={shape} color={fill} />
      {selected && (
        <NodeColorToolbar
          activeFill={activeColor?.fill}
          onColorChange={(color) => updateNodeData(id, { color })}
        />
      )}
      <div
        className="canvas-node-label nopan relative flex items-center justify-center text-center text-sm"
        onDoubleClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            ref={labelInput}
            aria-label="Node label"
            placeholder={labelPlaceholder}
            rows={1}
            className="canvas-node-label-text nodrag nopan nowheel cursor-text resize-none rounded-sm bg-transparent outline-none placeholder:text-current placeholder:opacity-75"
            value={label}
            onChange={(event) => updateNodeData(id, { label: event.currentTarget.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        ) : (
          <span className={`canvas-node-label-text overflow-hidden ${label ? "" : "opacity-75"}`}>
            {label || labelPlaceholder}
          </span>
        )}
      </div>
      <NodeResizer
        isVisible={selected === true}
        minWidth={56}
        minHeight={40}
        keepAspectRatio={shape === "circle"}
        color="var(--accent-primary)"
        handleClassName="canvas-resize-handle"
        lineClassName="canvas-resize-line"
      />
      {[Position.Top, Position.Right, Position.Bottom, Position.Left].map((position) => (
        <Handle
          key={position}
          id={position}
          type="source"
          position={position}
          className="canvas-node-handle"
        />
      ))}
    </div>
  );
}
