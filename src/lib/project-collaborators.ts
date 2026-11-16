import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProjectIdentity } from "@/lib/project-access";
import type { ProjectCollaborator } from "@/types/sharing";

export async function readCollaboratorEmail(request: Request): Promise<string | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = body && typeof body === "object" && !Array.isArray(body) && "email" in body
    && typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[^\s@\x00-\x1f\x7f]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  return email;
}

export async function enrichCollaborators(rows: { email: string }[]): Promise<ProjectCollaborator[]> {
  const collaborators = rows.map(({ email }) => ({ email, name: null, imageUrl: null } as ProjectCollaborator));
  if (!rows.length) return collaborators;

  try {
    const client = await clerkClient();
    const profiles = new Map<string, { name: string | null; imageUrl: string }>();
    // Bound each email filter and paginate results rather than issuing one request per collaborator.
    for (let start = 0; start < rows.length; start += 100) {
      const emailAddress = rows.slice(start, start + 100).map(({ email }) => email);
      let offset = 0;
      while (true) {
        const { data, totalCount } = await client.users.getUserList({ emailAddress, limit: 100, offset });
        for (const user of data) {
          const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || null;
          for (const address of user.emailAddresses) {
            profiles.set(address.emailAddress.toLowerCase(), { name, imageUrl: user.imageUrl });
          }
        }
        offset += data.length;
        if (!data.length || offset >= totalCount) break;
      }
    }
    return collaborators.map((collaborator) => ({ ...collaborator, ...profiles.get(collaborator.email.toLowerCase()) }));
  } catch {
    console.error("Unable to load Clerk collaborator profiles");
    return collaborators;
  }
}

export async function listProjectCollaborators(projectId: string, identity: ProjectIdentity) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      collaborators: { select: { email: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const isOwner = project.ownerId === identity.userId;
  if (!isOwner && !project.collaborators.some(({ email }) => email.toLowerCase() === identity.email?.toLowerCase())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return Response.json({ isOwner, collaborators: await enrichCollaborators(project.collaborators) });
}

export async function inviteProjectCollaborator(projectId: string, ownerId: string, email: string) {
  const existing = await prisma.projectCollaborator.findFirst({
    where: { projectId, email: { equals: email, mode: "insensitive" } },
    select: { email: true },
  });
  if (existing) return Response.json({ error: "This email already has access" }, { status: 409 });

  await prisma.projectCollaborator.create({
    data: { email, project: { connect: { id: projectId, ownerId } } },
  });
  const [collaborator] = await enrichCollaborators([{ email }]);
  return Response.json({ collaborator }, { status: 201 });
}

export async function removeProjectCollaborator(projectId: string, ownerId: string, email: string) {
  const result = await prisma.projectCollaborator.deleteMany({
    where: { projectId, email: { equals: email, mode: "insensitive" }, project: { ownerId } },
  });
  if (!result.count) return Response.json({ error: "Collaborator not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}

export function collaboratorApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return Response.json({ error: "This email already has access" }, { status: 409 });
    if (error.code === "P2025") return Response.json({ error: "Project not found" }, { status: 404 });
  }
  console.error("Collaborator API request failed", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
