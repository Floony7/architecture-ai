import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface ProjectNameInput {
  name: string;
}

export async function readProjectName(
  request: Request,
  defaultName?: string,
): Promise<ProjectNameInput | Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "Expected a JSON object" }, { status: 400 });
  }

  const name = "name" in body ? body.name : defaultName;

  if (typeof name !== "string" || !name.trim()) {
    return Response.json(
      { error: "Name must be a non-empty string" },
      { status: 400 },
    );
  }

  return { name: name.trim() };
}

export async function checkProjectOwner(
  projectId: string,
  ownerId: string,
): Promise<Response | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId !== ownerId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export function projectApiError(error: unknown): Response {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  console.error("Project API request failed", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
