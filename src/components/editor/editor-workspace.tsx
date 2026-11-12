"use client";

import { Plus } from "lucide-react";
import { useId, useRef, useState, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";

import { EditorNavbar } from "./editor-navbar";
import { ProjectDialogs } from "./project-dialogs";
import { ProjectSidebar } from "./project-sidebar";
import { useProjectDialogs } from "./use-project-dialogs";

export function EditorWorkspace() {
  const sidebarId = useId();
  const sidebarCreateButton = useRef<HTMLButtonElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projectDialogs = useProjectDialogs();

  function openCreateDialog(event: MouseEvent<HTMLButtonElement>) {
    projectDialogs.openDialog({ type: "create" }, event.currentTarget);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="flex h-dvh flex-col">
      <EditorNavbar
        sidebarId={sidebarId}
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
        center={<h1 className="text-sm font-semibold">Editor</h1>}
      />
      <div className="relative isolate min-h-0 flex-1 overflow-hidden">
        <main aria-label="Editor home" className="absolute inset-0 grid place-items-center overflow-y-auto p-6">
          <div className="flex max-w-lg flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Create a project or open an existing one
            </h2>
            <p className="text-copy-muted">
              Start a new architecture workspace, or choose a project from the sidebar.
            </p>
            <Button type="button" className="mt-2 rounded-xl" onClick={openCreateDialog}>
              <Plus className="size-5" aria-hidden="true" data-icon="inline-start" />
              New Project
            </Button>
          </div>
        </main>
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Dismiss project sidebar"
            tabIndex={-1}
            className="absolute inset-0 z-10 bg-base/75 sm:hidden"
            onClick={closeSidebar}
          />
        )}
        <ProjectSidebar
          id={sidebarId}
          isOpen={isSidebarOpen}
          projects={projectDialogs.projects}
          onClose={closeSidebar}
          onNewProject={openCreateDialog}
          onProjectAction={projectDialogs.openDialog}
          createButtonRef={sidebarCreateButton}
        />
      </div>
      <ProjectDialogs
        dialog={projectDialogs.dialog}
        name={projectDialogs.name}
        isPending={projectDialogs.isPending}
        onNameChange={projectDialogs.setName}
        onSubmit={projectDialogs.submitDialog}
        onClose={projectDialogs.closeDialog}
        onRestoreFocus={() => projectDialogs.restoreFocus(sidebarCreateButton.current)}
      />
    </div>
  );
}
