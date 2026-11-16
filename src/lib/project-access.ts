import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export interface ProjectIdentity {
  userId: string;
  email: string | null;
}

export async function getCurrentIdentity(): Promise<ProjectIdentity | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  return { userId, email: user?.primaryEmailAddress?.emailAddress ?? null };
}

export function getAccessibleProject(roomId: string, identity: ProjectIdentity) {
  return prisma.project.findFirst({
    where: {
      id: roomId,
      OR: [
        { ownerId: identity.userId },
        ...(identity.email
          ? [{ collaborators: { some: { email: { equals: identity.email, mode: "insensitive" as const } } } }]
          : []),
      ],
    },
    select: { id: true, name: true },
  });
}
