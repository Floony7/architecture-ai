import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onNewProject?: () => void;
}

export function ProjectSidebar({
  id,
  isOpen,
  onClose,
  onNewProject,
}: ProjectSidebarProps) {
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
        <TabsContent
          value="my-projects"
          className="grid place-items-center overflow-y-auto text-copy-muted"
        >
          <p>No projects yet.</p>
        </TabsContent>
        <TabsContent
          value="shared"
          className="grid place-items-center overflow-y-auto text-copy-muted"
        >
          <p>No shared projects yet.</p>
        </TabsContent>
      </Tabs>

      <footer className="shrink-0 border-t border-surface-border p-4">
        <Button
          type="button"
          className="w-full rounded-xl"
          disabled={!onNewProject}
          onClick={onNewProject}
        >
          <Plus className="size-5" aria-hidden="true" data-icon="inline-start" />
          New Project
        </Button>
      </footer>
    </aside>
  );
}
