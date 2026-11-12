import { useRef, useState, useTransition } from "react";

export interface MockProject {
  id: number;
  name: string;
  isOwned: boolean;
}

export type ProjectDialog =
  | { type: "create" }
  | { type: "rename" | "delete"; project: MockProject };

const mockProjects: MockProject[] = [
  { id: 1, name: "Payments Platform", isOwned: true },
  { id: 2, name: "Event Pipeline", isOwned: false },
];

export function useProjectDialogs() {
  const [projects, setProjects] = useState(mockProjects);
  const [dialog, setDialog] = useState<ProjectDialog | null>(null);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const nextId = useRef(mockProjects.length + 1);
  const invoker = useRef<HTMLButtonElement>(null);

  function openDialog(nextDialog: ProjectDialog, trigger: HTMLButtonElement) {
    if (nextDialog.type !== "create" && !nextDialog.project.isOwned) return;

    invoker.current = trigger;
    setName(nextDialog.type === "rename" ? nextDialog.project.name : "");
    setDialog(nextDialog);
  }

  function closeDialog() {
    setDialog(null);
  }

  function restoreFocus(fallback: HTMLButtonElement | null) {
    const target = invoker.current?.isConnected ? invoker.current : fallback;
    target?.focus();
  }

  function submitDialog() {
    const trimmedName = name.trim();
    if (!dialog || isPending || (dialog.type !== "delete" && !trimmedName)) return;

    startTransition(() => {
      if (dialog.type === "create") {
        const project = { id: nextId.current++, name: trimmedName, isOwned: true };
        setProjects((current) => [...current, project]);
      } else if (dialog.type === "rename") {
        setProjects((current) =>
          current.map((project) =>
            project.id === dialog.project.id ? { ...project, name: trimmedName } : project,
          ),
        );
      } else {
        setProjects((current) => current.filter((project) => project.id !== dialog.project.id));
      }

      closeDialog();
    });
  }

  return {
    projects,
    dialog,
    name,
    setName,
    isPending,
    openDialog,
    closeDialog,
    restoreFocus,
    submitDialog,
  };
}
