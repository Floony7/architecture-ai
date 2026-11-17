"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background, BackgroundVariant, ConnectionMode, MiniMap, Panel,
  ReactFlow, ReactFlowProvider, useReactFlow,
} from "@xyflow/react";
import type { DragEvent } from "react";

import { createCanvasNode, readShapeDragPayload, SHAPE_DRAG_TYPE } from "@/lib/canvas-shapes";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

import { CanvasNodeRenderer } from "./canvas-node";
import { ShapePanel } from "./shape-panel";

import "@xyflow/react/dist/style.css";
import "./canvas.css";

const nodeTypes = { canvasNode: CanvasNodeRenderer };

function CollaborativeCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    });
  const { screenToFlowPosition } = useReactFlow<CanvasNode, CanvasEdge>();

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes(SHAPE_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    const payload = readShapeDragPayload(event.dataTransfer.getData(SHAPE_DRAG_TYPE));
    if (!payload) return;
    event.preventDefault();
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onNodesChange([{ type: "add", item: createCanvasNode(payload, position) }]);
  }

  return (
    <div className="canvas-wrapper h-full w-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow<CanvasNode, CanvasEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        colorMode="dark"
        fitView
        className="architecture-flow"
      >
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} />
        <Panel position="bottom-center" className="shape-panel">
          <ShapePanel />
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function BaseCanvas() {
  return <ReactFlowProvider><CollaborativeCanvas /></ReactFlowProvider>;
}
