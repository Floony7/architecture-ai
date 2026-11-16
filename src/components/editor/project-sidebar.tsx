import { Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import type { MouseEventHandler, Ref } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type { SidebarProject, ProjectDialog } from "@/types/project";

interface ProjectSidebarProps {
  id: string;
  isOpen: boolean;
  ownedProjects: SidebarProject[];
  sharedProjects: SidebarProject[];
  onClose: () => void;
  onNewProject: MouseEventHandler<HTMLButtonElement>;
  onProjectAction: (
    dialog: Exclude<ProjectDialog, { type: "create" }>,
    trigger: HTMLButtonElement,
  ) => void;
  createButtonRef: Ref<HTMLButtonElement>;
}

export function ProjectSidebar({
  id,
  isOpen,
  ownedProjects,
  sharedProjects,
  onClose,
  onNewProject,
  onProjectAction,
  createButtonRef,
}: ProjectSidebarProps) {
  const projectGroups = [
    {
      tab: "my-projects",
      projects: ownedProjects,
      isOwned: true,
      emptyMessage: "No projects yet.",
    },
    {
      tab: "shared",
      projects: sharedProjects,
      isOwned: false,
      emptyMessage: "No shared projects yet.",
    },
  ];

  return (
    <aside
      id={id}
      aria-label="Projects"
      inert={!isOpen}
      className={cn(
        "absolute inset-y-4 left-4 z-20 flex w-80 max-w-[calc(100%-2rem)] flex-col rounded-2xl border border-surface-border bg-surface/95 shadow-lg backdrop-blur-sm motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-out",
        !isOpen && "-translate-x-full opacity-0",
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-surface-border p-3 pl-4">
        <h2 className="text-sm font-semibold">Projects</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl"
          aria-label="Close projects"
          onClick={onClose}
        >
          <X className="size-5" aria-hidden="true" />
        </Button>
      </header>

      <Tabs defaultValue="my-projects" className="min-h-0 flex-1 gap-3 p-4">
        <TabsList aria-label="Project lists" className="w-full shrink-0 rounded-xl">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>
        {projectGroups.map(({ tab, projects, isOwned, emptyMessage }) => (
          <TabsContent key={tab} value={tab} className="overflow-y-auto">
            {projects.length ? (
              <ul className="space-y-1">
                {projects.map((project) => (
                  <li
                    key={project.id}
                    className="flex items-center gap-1 rounded-xl bg-elevated px-2 py-1 pl-3"
                  >
                    <Link
                      href={`/editor/${encodeURIComponent(project.id)}`}
                      onClick={onClose}
                      className="min-w-0 flex-1 wrap-anywhere rounded-xl py-1 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      {project.name}
                    </Link>
                    {isOwned && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-xl"
                          aria-label={`Rename ${project.name}`}
                          onClick={(event) =>
                            onProjectAction({ type: "rename", project }, event.currentTarget)
                          }
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-xl text-error hover:text-error"
                          aria-label={`Delete ${project.name}`}
                          onClick={(event) =>
                            onProjectAction({ type: "delete", project }, event.currentTarget)
                          }
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="grid h-full place-items-center text-copy-muted">{emptyMessage}</p>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <footer className="shrink-0 border-t border-surface-border p-4">
        <Button
          ref={createButtonRef}
          type="button"
          className="w-full rounded-xl"
          onClick={onNewProject}
        >
          <Plus className="size-5" aria-hidden="true" data-icon="inline-start" />
          New Project
        </Button>
      </footer>
    </aside>
  );
}
