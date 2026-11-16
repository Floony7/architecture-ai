import { auth, currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { getOwnedProjects, getSharedProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Editor | Architecture AI",
};

export default async function EditorPage() {
  const { userId } = await auth.protect();
  const user = await currentUser();
  const [ownedProjects, sharedProjects] = await Promise.all([
    getOwnedProjects(userId),
    getSharedProjects(userId, user?.primaryEmailAddress?.emailAddress ?? null),
  ]);

  return <EditorWorkspace ownedProjects={ownedProjects} sharedProjects={sharedProjects} />;
}
