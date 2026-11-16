"use client";

import {
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Sparkles,
} from "lucide-react";
import { useId, useRef, useState, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";
import type { SidebarProject } from "@/types/project";

import { EditorNavbar } from "./editor-navbar";
import { ProjectDialogs } from "./project-dialogs";
import { ProjectSidebar } from "./project-sidebar";
import { ShareDialog } from "./share-dialog";

interface EditorWorkspaceProps {
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
  project?: SidebarProject;
}

export function EditorWorkspace({
  ownedProjects,
  sharedProjects,
  project,
}: EditorWorkspaceProps) {
  const sidebarId = useId();
  const aiSidebarId = useId();
  const sidebarCreateButton = useRef<HTMLButtonElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const projectDialogs = useProjectActions();

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
        center={
          <h1 className="truncate font-semibold text-3xl" title={project?.name}>
            {project?.name ?? "Editor"}
          </h1>
        }
        actions={
          project && (
            <>
              <ShareDialog project={project} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl"
                aria-label={
                  isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"
                }
                aria-expanded={isAiSidebarOpen}
                aria-controls={aiSidebarId}
                onClick={() => setIsAiSidebarOpen((open) => !open)}
              >
                {isAiSidebarOpen ? (
                  <PanelRightClose className="size-5" aria-hidden="true" />
                ) : (
                  <PanelRightOpen className="size-5" aria-hidden="true" />
                )}
              </Button>
            </>
          )
        }
      />
      <div className="relative isolate min-h-0 flex-1 overflow-hidden">
        {project ? (
          <div className="flex h-full min-h-0">
            <main
              aria-label="Architecture canvas"
              className="grid min-w-0 flex-1 place-items-center overflow-y-auto bg-base p-6"
            >
              <div className="max-w-md text-center">
                <h2 className="text-xl font-semibold">
                  Your architecture canvas
                </h2>
                <p className="mt-2 text-copy-muted">
                  Your system design will take shape here.
                </p>
              </div>
            </main>
            {isAiSidebarOpen && (
              <aside
                id={aiSidebarId}
                aria-label="AI assistant"
                className="absolute inset-y-4 right-4 z-10 flex w-80 max-w-[calc(100%-2rem)] flex-col rounded-2xl border border-surface-border bg-surface/95 p-5 shadow-lg backdrop-blur-sm sm:static sm:m-4 sm:ml-0 sm:shrink-0"
              >
                <h2 className="flex items-center gap-2 font-semibold">
                  <Sparkles className="size-5 text-ai" aria-hidden="true" />
                  AI assistant
                </h2>
                <p className="mt-3 text-sm text-copy-muted">
                  AI chat is coming soon.
                </p>
              </aside>
            )}
          </div>
        ) : (
          <main
            aria-label="Editor home"
            className="absolute inset-0 grid place-items-center overflow-y-auto p-6"
          >
            <div className="flex max-w-lg flex-col items-center gap-3 text-center">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Create a project or open an existing one
              </h2>
              <p className="text-copy-muted">
                Start a new architecture workspace, or choose a project from the
                sidebar.
              </p>
              <Button
                type="button"
                className="mt-2 rounded-xl"
                onClick={openCreateDialog}
              >
                <Plus
                  className="size-5"
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                New Project
              </Button>
            </div>
          </main>
        )}
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
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          currentRoomId={project?.id}
          onClose={closeSidebar}
          onNewProject={openCreateDialog}
          onProjectAction={projectDialogs.openDialog}
          createButtonRef={sidebarCreateButton}
        />
      </div>
      <ProjectDialogs
        dialog={projectDialogs.dialog}
        name={projectDialogs.name}
        roomId={projectDialogs.roomId}
        error={projectDialogs.error}
        isPending={projectDialogs.isPending}
        onNameChange={projectDialogs.setName}
        onSubmit={projectDialogs.submitDialog}
        onClose={projectDialogs.closeDialog}
        onRestoreFocus={() =>
          projectDialogs.restoreFocus(sidebarCreateButton.current)
        }
      />
    </div>
  );
}
