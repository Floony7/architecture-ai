"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { CanvasNode } from "@/types/canvas";

export function CanvasNodeRenderer({ data }: NodeProps<CanvasNode>) {
  return (
    <div
      className="canvas-node flex h-full w-full items-center justify-center border border-surface-border text-node-label"
      style={{ backgroundColor: data.color }}
    >
      <span className="truncate px-3 text-center text-sm">{data.label}</span>
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
