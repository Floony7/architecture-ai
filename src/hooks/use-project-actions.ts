"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { projectRoomId } from "@/lib/project-room";
import type { ProjectDialog } from "@/types/project";

async function mutateProject(url: string, method: string, body?: object) {
  const response = await fetch(url, {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null);
    throw new Error(
      result && typeof result === "object" && "error" in result && typeof result.error === "string"
        ? result.error
        : "Unable to save project. Please try again.",
    );
  }
  return response;
}

export function useProjectActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [dialog, setDialog] = useState<ProjectDialog | null>(null);
  const [name, setName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const invoker = useRef<HTMLButtonElement>(null);
  const roomId = suffix ? projectRoomId(name, suffix) : "";

  function openDialog(nextDialog: ProjectDialog, trigger: HTMLButtonElement) {
    if (submitting.current) return;
    invoker.current = trigger;
    setName(nextDialog.type === "rename" ? nextDialog.project.name : "");
    setError(null);
    if (nextDialog.type === "create") {
      setSuffix(crypto.randomUUID().replaceAll("-", "").slice(0, 12));
    }
    setDialog(nextDialog);
  }

  function closeDialog() {
    if (!submitting.current) setDialog(null);
  }

  function restoreFocus(fallback: HTMLButtonElement | null) {
    const target = invoker.current?.isConnected ? invoker.current : fallback;
    target?.focus();
  }

  async function submitDialog() {
    const trimmedName = name.trim();
    if (!dialog || submitting.current || (dialog.type !== "delete" && !trimmedName)) return;

    submitting.current = true;
    setIsPending(true);
    setError(null);
    try {
      if (dialog.type === "create") {
        const response = await mutateProject("/api/projects", "POST", { name: trimmedName, roomId });
        const result: unknown = await response.json();
        if (!result || typeof result !== "object" || !("project" in result) ||
          !result.project || typeof result.project !== "object" ||
          !("id" in result.project) || result.project.id !== roomId) {
          throw new Error("The created project did not return the expected room ID.");
        }
        router.push(`/editor/${encodeURIComponent(result.project.id)}`);
      } else {
        await mutateProject(
          `/api/projects/${encodeURIComponent(dialog.project.id)}`,
          dialog.type === "rename" ? "PATCH" : "DELETE",
          dialog.type === "rename" ? { name: trimmedName } : undefined,
        );
        if (dialog.type === "delete" && pathname === `/editor/${encodeURIComponent(dialog.project.id)}`) {
          router.replace("/editor");
          router.refresh();
        } else {
          router.refresh();
        }
      }
      setDialog(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save project. Please try again.");
    } finally {
      submitting.current = false;
      setIsPending(false);
    }
  }

  return { dialog, name, setName, roomId, error, isPending, openDialog, closeDialog, restoreFocus, submitDialog };
}
