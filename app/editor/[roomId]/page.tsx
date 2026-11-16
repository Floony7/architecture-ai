import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { getAccessibleProject, getCurrentIdentity } from "@/lib/project-access";
import { getOwnedProjects, getSharedProjects } from "@/lib/projects";

export const metadata: Metadata = { title: "Workspace | Architecture AI" };

interface WorkspacePageProps {
  params: Promise<{ roomId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");

  const { roomId } = await params;
  const project = await getAccessibleProject(roomId, identity);
  if (!project) return <AccessDenied />;

  const [ownedProjects, sharedProjects] = await Promise.all([
    getOwnedProjects(identity.userId),
    getSharedProjects(identity.userId, identity.email),
  ]);

  return <EditorWorkspace key={project.id} project={project} ownedProjects={ownedProjects} sharedProjects={sharedProjects} />;
}
