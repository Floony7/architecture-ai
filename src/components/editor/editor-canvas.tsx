"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useErrorListener,
  useLostConnectionListener,
} from "@liveblocks/react";
import { Component, useState, type ReactNode } from "react";

import { BaseCanvas } from "./base-canvas";

function CanvasError() {
  return (
    <div role="alert" className="grid h-full place-items-center bg-base p-6 text-center">
      <div>
        <h2 className="text-lg font-semibold text-copy-primary">Unable to connect to the canvas</h2>
        <p className="mt-2 text-sm text-copy-muted">Check your connection and reload to try again.</p>
      </div>
    </div>
  );
}

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? <CanvasError /> : this.props.children;
  }
}

function RoomCanvas() {
  const [hasConnectionError, setHasConnectionError] = useState(false);

  // Room authentication and WebSocket failures are asynchronous, so they also
  // need a listener outside the suspended canvas and its render error boundary.
  useErrorListener(() => setHasConnectionError(true));
  useLostConnectionListener((event) => {
    if (event === "failed") setHasConnectionError(true);
    if (event === "restored") setHasConnectionError(false);
  });

  if (hasConnectionError) return <CanvasError />;

  return (
    <ClientSideSuspense
      fallback={
        <div role="status" className="grid h-full place-items-center bg-base text-sm text-copy-muted">
          Loading canvas…
        </div>
      }
    >
      <BaseCanvas />
    </ClientSideSuspense>
  );
}

interface EditorCanvasProps {
  roomId: string;
}

export function EditorCanvas({ roomId }: EditorCanvasProps) {
  return (
    <CanvasErrorBoundary key={roomId}>
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider key={roomId} id={roomId} initialPresence={{ cursor: null, isThinking: false }}>
          <RoomCanvas />
        </RoomProvider>
      </LiveblocksProvider>
    </CanvasErrorBoundary>
  );
}
