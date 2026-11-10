import { Network } from "lucide-react";
import { Suspense, type ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden place-items-center border-r border-surface-border bg-surface p-10 lg:grid">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Network aria-hidden="true" className="size-5 text-brand" />
            Architecture AI
          </div>
          <p className="text-lg font-medium">Design systems together.</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-copy-secondary">
            <li>Generate architecture from a prompt.</li>
            <li>Collaborate on a shared canvas.</li>
            <li>Turn your design into a technical spec.</li>
          </ul>
        </div>
      </aside>
      <div className="grid min-w-0 place-items-center py-6 sm:p-8">
        <Suspense>{children}</Suspense>
      </div>
    </main>
  );
}
