"use client";

import { Circle, Cylinder, Diamond, Hexagon, Pill, RectangleHorizontal } from "lucide-react";
import type { DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { SHAPE_DRAG_TYPE } from "@/lib/canvas-shapes";
import { NODE_SHAPES, SHAPE_SIZES, type NodeShape } from "@/types/canvas";

const shapeIcons = {
  rectangle: RectangleHorizontal,
  diamond: Diamond,
  circle: Circle,
  pill: Pill,
  cylinder: Cylinder,
  hexagon: Hexagon,
};

function startShapeDrag(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
  event.dataTransfer.setData(SHAPE_DRAG_TYPE, JSON.stringify({ shape, ...SHAPE_SIZES[shape] }));
  event.dataTransfer.effectAllowed = "copy";
}

export function ShapePanel() {
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
          >
            <Icon className="size-5" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
