import { UserButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EditorNavbarProps {
  sidebarId: string;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  center?: ReactNode;
  actions?: ReactNode;
}

export function EditorNavbar({
  sidebarId,
  isSidebarOpen,
  onSidebarToggle,
  center,
  actions,
}: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <nav
      aria-label="Editor"
      className="grid h-14 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-surface-border bg-surface px-4"
    >
      <div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl"
          aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
          aria-expanded={isSidebarOpen}
          aria-controls={sidebarId}
          onClick={onSidebarToggle}
        >
          <SidebarIcon className="size-5" aria-hidden="true" />
        </Button>
      </div>
      <div className="min-w-0 text-center">{center}</div>
      <div className="flex items-center justify-end gap-2">
        {actions}
        <UserButton />
      </div>
    </nav>
  );
}
