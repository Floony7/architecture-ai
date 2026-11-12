import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";

import { PrismaClient } from "@/generated/prisma/client";

type PrismaInstance = Omit<PrismaClient, "$extends" | "$on">;

function createPrismaClient(): PrismaInstance {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  if (connectionString.startsWith("prisma+postgres://")) {
    // Expose the common query API across both transports. Accelerate's generic
    // overloads otherwise make queries on the inferred union uncallable.
    return new PrismaClient({
      accelerateUrl: connectionString,
    }).$extends(withAccelerate()) as unknown as PrismaInstance;
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
