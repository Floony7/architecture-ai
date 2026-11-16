"use client";

import { useEffect, useRef, useState } from "react";

import type { ProjectCollaborator, ProjectSharing } from "@/types/sharing";

function isCollaborator(value: unknown): value is ProjectCollaborator {
  return !!value && typeof value === "object" && "email" in value && typeof value.email === "string"
    && "name" in value && (value.name === null || typeof value.name === "string")
    && "imageUrl" in value && (value.imageUrl === null || typeof value.imageUrl === "string");
}

async function sharingRequest(url: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(url, options);
  if (response.status === 204) return null;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error : "Unable to update sharing. Please try again.");
  }
  return body;
}

export function useProjectSharing(projectId: string) {
  const url = `/api/projects/${encodeURIComponent(projectId)}/collaborators`;
  const [sharing, setSharing] = useState<ProjectSharing | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    sharingRequest(url, { signal: controller.signal }).then((body) => {
      if (controller.signal.aborted) return;
      if (!body || typeof body !== "object" || !("isOwner" in body) || typeof body.isOwner !== "boolean"
        || !("collaborators" in body) || !Array.isArray(body.collaborators) || !body.collaborators.every(isCollaborator)) {
        throw new Error("Unable to load collaborators. Please try again.");
      }
      setSharing({ isOwner: body.isOwner, collaborators: body.collaborators });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load collaborators.");
    });
    return () => controller.abort();
  }, [url, attempt]);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function mutate(removeEmail?: string) {
    if (!sharing?.isOwner || submitting.current) return;
    const address = (removeEmail ?? email).trim().toLowerCase();
    if (!address) return;
    submitting.current = true;
    setPending(removeEmail ?? "invite");
    setError(null);
    try {
      const body = await sharingRequest(url, {
        method: removeEmail ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      if (removeEmail) {
        setSharing((current) => current && ({ ...current, collaborators: current.collaborators.filter((person) => person.email !== removeEmail) }));
      } else {
        if (!body || typeof body !== "object" || !("collaborator" in body) || !isCollaborator(body.collaborator)) {
          throw new Error("Unable to read the invited collaborator. Reopen sharing to refresh the list.");
        }
        const collaborator = body.collaborator;
        setSharing((current) => current && ({ ...current, collaborators: [...current.collaborators, collaborator] }));
        setEmail("");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update sharing. Please try again.");
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  async function copyLink() {
    if (!sharing?.isOwner) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/editor/${encodeURIComponent(projectId)}`);
      setCopied(true);
    } catch {
      setError("Unable to copy the project link. Please try again.");
    }
  }

  function retry() {
    setError(null);
    setAttempt((prev) => prev + 1);
  }

  return { sharing, email, setEmail, error, pending, copied, retry, copyLink, invite: () => mutate(), remove: (email: string) => mutate(email) };
}
