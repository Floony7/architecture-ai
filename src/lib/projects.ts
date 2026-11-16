import "server-only";

import { prisma } from "@/lib/prisma";

export function getOwnedProjects(userId: string) {
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
}

export function getSharedProjects(userId: string, email: string | null) {
  if (!email) return Promise.resolve([]);

  return prisma.project.findMany({
    where: {
      ownerId: { not: userId },
      collaborators: { some: { email: { equals: email, mode: "insensitive" } } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
}
