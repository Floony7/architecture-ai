import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { EditorDialogContent } from "./editor-dialog-content";
import type { ProjectDialog } from "./use-project-dialogs";

interface ProjectDialogsProps {
  dialog: ProjectDialog | null;
  name: string;
  isPending: boolean;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onRestoreFocus: () => void;
}

function projectSlug(name: string) {
  return name
    .normalize()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

const titles = {
  create: "Create Project",
  rename: "Rename Project",
  delete: "Delete Project",
};

export function ProjectDialogs({
  dialog,
  name,
  isPending,
  onNameChange,
  onSubmit,
  onClose,
  onRestoreFocus,
}: ProjectDialogsProps) {
  const formId = useId();
  const nameId = useId();
  const slugId = useId();
  if (!dialog) return null;

  const isCreate = dialog.type === "create";
  const isDelete = dialog.type === "delete";
  const title = titles[dialog.type];
  let description = "Enter a name for your new architecture project.";
  if (dialog.type === "rename") {
    description = `Change the name of “${dialog.project.name}”.`;
  } else if (dialog.type === "delete") {
    description = `Delete “${dialog.project.name}”? This action cannot be undone.`;
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <EditorDialogContent
        title={title}
        description={description}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
        footer={
          <>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form={formId}
              variant={isDelete ? "destructive" : "default"}
              className="rounded-xl"
              disabled={isPending || (!isDelete && !name.trim())}
            >
              {isPending ? "Working…" : title}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          className={isDelete ? "hidden" : "grid gap-2"}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {!isDelete && (
            <>
              <label htmlFor={nameId} className="font-medium">
                Project name
              </label>
              <Input
                id={nameId}
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                aria-describedby={isCreate ? slugId : undefined}
                className="rounded-xl"
                required
              />
              {isCreate && (
                <p id={slugId} className="wrap-anywhere text-copy-muted">
                  Slug preview:{" "}
                  <code className="font-mono">{projectSlug(name) || "—"}</code>
                </p>
              )}
            </>
          )}
        </form>
      </EditorDialogContent>
    </Dialog>
  );
}
