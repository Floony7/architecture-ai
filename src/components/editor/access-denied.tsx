import { LockKeyhole } from "lucide-react";
import Link from "next/link";

export function AccessDenied() {
  return (
    <main className="grid min-h-dvh place-items-center bg-base p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <LockKeyhole className="size-8 text-copy-muted" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-copy-muted">This project is unavailable or you don’t have access.</p>
        <Link href="/editor" className="rounded-xl text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand">
          Back to editor
        </Link>
      </div>
    </main>
  );
}
