import type { Edge, Node } from "@xyflow/react";

export const NODE_SHAPES = ["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"] as const;
export type NodeShape = (typeof NODE_SHAPES)[number];

export const DEFAULT_NODE_COLOR = "#1F1F1F";

export const NODE_COLORS = [
  { name: "Neutral", fill: DEFAULT_NODE_COLOR, text: "var(--canvas-node-text)" },
  { name: "Blue", fill: "#10233D", text: "#52A8FF" },
  { name: "Purple", fill: "#2E1938", text: "#BF7AF0" },
  { name: "Orange", fill: "#331B00", text: "#FF990A" },
  { name: "Red", fill: "#3C1618", text: "#FF6166" },
  { name: "Pink", fill: "#3A1726", text: "#F75F8F" },
  { name: "Green", fill: "#0F2E18", text: "#62C073" },
  { name: "Teal", fill: "#062822", text: "#0AC7B4" },
] as const;

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
