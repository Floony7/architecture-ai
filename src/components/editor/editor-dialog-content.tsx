import type { ComponentProps, ReactNode } from "react";

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface EditorDialogContentProps extends ComponentProps<typeof DialogContent> {
  title: string;
  description: string;
  footer: ReactNode;
}

export function EditorDialogContent({
  title,
  description,
  footer,
  children,
  className,
  ...props
}: EditorDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        "rounded-3xl border border-surface-border bg-elevated text-copy-primary ring-0",
        className,
      )}
      {...props}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="text-copy-muted">
          {description}
        </DialogDescription>
      </DialogHeader>
      {children}
      <DialogFooter>{footer}</DialogFooter>
    </DialogContent>
  );
}
