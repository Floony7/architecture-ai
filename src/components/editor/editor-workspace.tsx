"use client";

import { useId, useState } from "react";

import { EditorNavbar } from "./editor-navbar";
import { ProjectSidebar } from "./project-sidebar";

export function EditorWorkspace() {
  const sidebarId = useId();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col">
      <EditorNavbar
        sidebarId={sidebarId}
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
        center={<h1 className="text-sm font-semibold">Editor</h1>}
      />
      <div className="relative isolate min-h-0 flex-1 overflow-hidden">
        <main aria-label="Editor canvas" className="absolute inset-0" />
        <ProjectSidebar
          id={sidebarId}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
    </div>
  );
}
