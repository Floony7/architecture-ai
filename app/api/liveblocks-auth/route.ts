import { auth, currentUser } from "@clerk/nextjs/server";

import { getLiveblocks } from "@/lib/liveblocks";
import { getAccessibleProject } from "@/lib/project-access";
import { getUserColor } from "@/lib/user-color";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const input: unknown = await request.json().catch(() => null);
    if (
      !input || typeof input !== "object" || !("room" in input) ||
      typeof input.room !== "string" || !input.room.trim() ||
      input.room.length > 128 || input.room.includes("*")
    ) {
      return Response.json({ error: "A valid project room ID is required" }, { status: 400 });
    }

    const user = await currentUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const project = await getAccessibleProject(input.room, {
      userId,
      email: user.primaryEmailAddress?.emailAddress ?? null,
    });
    if (!project) return Response.json({ error: "Forbidden" }, { status: 403 });

    const liveblocks = getLiveblocks();
    await liveblocks.getOrCreateRoom(project.id, { defaultAccesses: [] });

    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name: user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "User",
        avatar: user.imageUrl,
        color: getUserColor(userId),
      },
    });
    session.allow(project.id, session.FULL_ACCESS);
    const { body, status } = await session.authorize();
    return new Response(body, {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Liveblocks authentication failed", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
