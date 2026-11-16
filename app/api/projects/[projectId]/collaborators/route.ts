import { auth } from "@clerk/nextjs/server";
import { getCurrentIdentity } from "@/lib/project-access";
import { checkProjectOwner } from "@/lib/project-api";
import {
  collaboratorApiError,
  inviteProjectCollaborator,
  listProjectCollaborators,
  readCollaboratorEmail,
  removeProjectCollaborator,
} from "@/lib/project-collaborators";

interface CollaboratorRouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: CollaboratorRouteContext) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId } = await params;
    return await listProjectCollaborators(projectId, identity);
  } catch (error) {
    return collaboratorApiError(error);
  }
}

async function mutate(request: Request, { params }: CollaboratorRouteContext, remove: boolean) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const email = await readCollaboratorEmail(request);
    if (email instanceof Response) return email;
    const { projectId } = await params;
    const denied = await checkProjectOwner(projectId, userId);
    if (denied) return denied;
    return await (remove ? removeProjectCollaborator : inviteProjectCollaborator)(projectId, userId, email);
  } catch (error) {
    return collaboratorApiError(error);
  }
}

export async function POST(request: Request, context: CollaboratorRouteContext) {
  return mutate(request, context, false);
}

export async function DELETE(request: Request, context: CollaboratorRouteContext) {
  return mutate(request, context, true);
}
