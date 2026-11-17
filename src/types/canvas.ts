import type { Edge, Node } from "@xyflow/react";

export const NODE_SHAPES = ["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"] as const;
export type NodeShape = (typeof NODE_SHAPES)[number];

export const DEFAULT_NODE_COLOR = "#1F1F1F";

export interface ShapeSize {
  width: number;
  height: number;
}

export const SHAPE_SIZES: Record<NodeShape, ShapeSize> = {
  rectangle: { width: 160, height: 96 },
  diamond: { width: 180, height: 140 },
  circle: { width: 120, height: 120 },
  pill: { width: 160, height: 80 },
  cylinder: { width: 140, height: 120 },
  hexagon: { width: 160, height: 120 },
};

export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  color: string;
  shape: NodeShape;
}

export type CanvasNode = Node<CanvasNodeData, "canvasNode">;
export type CanvasEdge = Edge<Record<string, unknown>, "canvasEdge">;
