import type { CanvasNodeData } from "@/types/canvas";

const shapePaths = {
  diamond: "M 50 1 L 99 50 L 50 99 L 1 50 Z",
  cylinder: "M 1 16 C 1 -4 99 -4 99 16 V 84 C 99 104 1 104 1 84 Z",
  hexagon: "M 22 1 H 78 L 99 50 L 78 99 H 22 L 1 50 Z",
};

export function CanvasNodeShape({ shape, color }: Pick<CanvasNodeData, "shape" | "color">) {
  if (shape === "diamond" || shape === "cylinder" || shape === "hexagon") {
    return (
      <svg className="canvas-node-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={shapePaths[shape]} fill={color} vectorEffect="non-scaling-stroke" />
        {shape === "cylinder" && (
          <path d="M 1 16 C 1 36 99 36 99 16" fill="none" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    );
  }

  return <div className="canvas-node-shape" style={{ backgroundColor: color }} aria-hidden="true" />;
}
