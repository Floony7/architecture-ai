import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { EditorWorkspace } from "@/components/editor/editor-workspace";

export const metadata: Metadata = {
  title: "Editor | Architecture AI",
};

export default async function EditorPage() {
  await auth.protect();

  return <EditorWorkspace />;
}
