"use client";

import { Circle, Cylinder, Diamond, Hexagon, Pill, RectangleHorizontal } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { createPortal, flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { SHAPE_DRAG_TYPE, type ShapeDragPayload } from "@/lib/canvas-shapes";
import { DEFAULT_NODE_COLOR, NODE_SHAPES, SHAPE_SIZES, type NodeShape } from "@/types/canvas";

import { CanvasNodeShape } from "./canvas-node-shape";

const shapeIcons = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
};

export function ShapePanel() {
  const [preview, setPreview] = useState<ShapeDragPayload | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  function startShapeDrag(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
    const payload = { shape, ...SHAPE_SIZES[shape] };
    event.dataTransfer.setData(SHAPE_DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "copy";

    // The browser reads the preview during dragstart, before a normal React update would commit.
    flushSync(() => setPreview(payload));
    if (previewRef.current) {
      event.dataTransfer.setDragImage(previewRef.current, payload.width / 2, payload.height / 2);
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Shapes"
      className="nodrag nopan flex gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-lg backdrop-blur-sm"
    >
      {NODE_SHAPES.map((shape) => {
        const Icon = shapeIcons[shape];
        const label = shape[0].toUpperCase() + shape.slice(1);
        return (
          <Button
            key={shape}
            type="button"
            variant="ghost"
            size="icon-lg"
            draggable
            aria-label={label}
            title={`Drag ${shape} onto the canvas`}
            className="cursor-grab rounded-full text-copy-secondary hover:text-brand active:cursor-grabbing"
            onDragStart={(event) => startShapeDrag(event, shape)}
            onDragEnd={() => setPreview(null)}
          >
            <Icon className="size-5" aria-hidden="true" />
          </Button>
        );
      })}
      {preview && createPortal(
        <div
          ref={previewRef}
          className="canvas-node canvas-shape-drag-preview"
          data-shape={preview.shape}
          style={{ width: preview.width, height: preview.height }}
          aria-hidden="true"
        >
          <CanvasNodeShape shape={preview.shape} color={DEFAULT_NODE_COLOR} />
        </div>,
        document.body,
      )}
    </div>
  );
}
