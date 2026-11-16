import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { checkProjectOwner, projectApiError, readProjectName } from "@/lib/project-api";

interface ProjectRouteContext {
  params: Promise<{ projectId: string }>;
}

export async function PATCH(request: Request, { params }: ProjectRouteContext) {
  const { userId, isAuthenticated } = await auth();

  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = await readProjectName(request);
  if (input instanceof Response) return input;

  const { projectId } = await params;

  try {
    const denied = await checkProjectOwner(projectId, userId);
    if (denied) return denied;

    const project = await prisma.project.update({
      where: { id: projectId, ownerId: userId },
      data: { name: input.name },
    });

    return Response.json({ project });
  } catch (error) {
    return projectApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: ProjectRouteContext) {
  const { userId, isAuthenticated } = await auth();

  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    const denied = await checkProjectOwner(projectId, userId);
    if (denied) return denied;

    await prisma.project.delete({
      where: { id: projectId, ownerId: userId },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return projectApiError(error);
  }
}
