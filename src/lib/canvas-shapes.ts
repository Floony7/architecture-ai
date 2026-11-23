import { DEFAULT_NODE_COLOR, NODE_SHAPES, type CanvasNode, type NodeShape } from "@/types/canvas";

export const SHAPE_DRAG_TYPE = "application/architecture-ai-shape";

export interface ShapeDragPayload {
  shape: NodeShape;
  width: number;
  height: number;
}

export function readShapeDragPayload(value: string): ShapeDragPayload | null {
  try {
    const payload: unknown = JSON.parse(value);
    if (
      !payload || typeof payload !== "object" ||
      !("shape" in payload) || !NODE_SHAPES.includes(payload.shape as NodeShape) ||
      !("width" in payload) || typeof payload.width !== "number" || !Number.isFinite(payload.width) || payload.width <= 0 ||
      !("height" in payload) || typeof payload.height !== "number" || !Number.isFinite(payload.height) || payload.height <= 0
    ) return null;

    return { shape: payload.shape as NodeShape, width: payload.width, height: payload.height };
  } catch {
    return null;
  }
}

let nodeCounter = 0;

export function createCanvasNode(payload: ShapeDragPayload, position: CanvasNode["position"]): CanvasNode {
  return {
    id: `${payload.shape}-${Date.now()}-${++nodeCounter}`,
    type: "canvasNode",
    position,
    width: payload.width,
    height: payload.height,
    data: { label: "", color: DEFAULT_NODE_COLOR, shape: payload.shape },
  };
}
