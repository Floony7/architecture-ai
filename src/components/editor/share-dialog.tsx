"use client";

import { Check, Copy, Share2, UserRound, X } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProjectSharing } from "@/hooks/use-project-sharing";
import type { SidebarProject } from "@/types/project";

import { EditorDialogContent } from "./editor-dialog-content";

function ShareDialogContent({ project }: { project: SidebarProject }) {
  const emailId = useId();
  const { sharing, email, setEmail, error, pending, copied, retry, copyLink, invite, remove } = useProjectSharing(project.id);

  return (
    <EditorDialogContent
      title="Share project"
      description={`Collaborators with access to “${project.name}”.`}
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      footer={sharing?.isOwner && (
        <Button type="button" variant="outline" className="rounded-xl" onClick={copyLink} disabled={copied}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          <span role="status">{copied ? "Copied!" : "Copy project link"}</span>
        </Button>
      )}
    >
      {!sharing && !error && <p role="status" className="text-copy-muted">Loading collaborators…</p>}
      {sharing?.isOwner && (
        <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); void invite(); }}>
          <label htmlFor={emailId} className="font-medium">Invite by email</label>
          <div className="flex flex-wrap gap-2">
            <Input id={emailId} type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 basis-40 rounded-xl text-copy-primary" required maxLength={254} disabled={pending !== null} />
            <Button type="submit" className="rounded-xl" disabled={pending !== null || !email.trim()}>
              {pending === "invite" ? "Inviting…" : "Invite"}
            </Button>
          </div>
        </form>
      )}
      {sharing && (
        <section aria-label="Collaborators" className="grid gap-3">
          <h2 className="font-medium">Collaborators</h2>
          {!sharing.isOwner && <p className="text-copy-muted">Only the project owner can manage access.</p>}
          {sharing.collaborators.length ? (
            <ul className="grid gap-2">
              {sharing.collaborators.map((person) => (
                <li key={person.email} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                  {person.imageUrl ? (
                    <Image src={person.imageUrl} alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded-full" />
                  ) : (
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle text-copy-muted"><UserRound className="size-4" aria-hidden="true" /></span>
                  )}
                  <div className="min-w-0 flex-1 wrap-anywhere">
                    <p className="font-medium">{person.name || person.email}</p>
                    {person.name && <p className="text-xs text-copy-muted">{person.email}</p>}
                  </div>
                  {sharing.isOwner && (
                    <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 rounded-xl text-error hover:text-error" aria-label={`Remove ${person.email}`} disabled={pending !== null} onClick={() => void remove(person.email)}>
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-copy-muted">No collaborators yet.</p>}
        </section>
      )}
      {error && (
        <div className="grid gap-2">
          <p role="alert" className="text-error">{error}</p>
          {!sharing && <Button type="button" variant="outline" className="rounded-xl" onClick={retry}>Try again</Button>}
        </div>
      )}
    </EditorDialogContent>
  );
}

export function ShareDialog({ project }: { project: SidebarProject }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="rounded-xl" aria-label="Share project" title="Share project">
          <Share2 className="size-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      {open && <ShareDialogContent project={project} />}
    </Dialog>
  );
}
