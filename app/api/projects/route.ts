import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { projectApiError, readProjectName } from "@/lib/project-api";

export async function GET() {
  const { userId, isAuthenticated } = await auth();

  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ projects });
  } catch (error) {
    return projectApiError(error);
  }
}

export async function POST(request: Request) {
  const { userId, isAuthenticated } = await auth();

  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = await readProjectName(request, "Untitled Project");
  if (input instanceof Response) return input;

  try {
    const project = await prisma.project.create({
      data: { name: input.name, ownerId: userId },
    });

    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return projectApiError(error);
  }
}
