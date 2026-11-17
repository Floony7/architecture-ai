import "server-only";

import { Liveblocks } from "@liveblocks/node";

const globalForLiveblocks = globalThis as typeof globalThis & {
  liveblocks?: Liveblocks;
};

export function getLiveblocks(): Liveblocks {
  if (!globalForLiveblocks.liveblocks) {
    const secret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!secret) {
      throw new Error("LIVEBLOCKS_SECRET_KEY is required to initialize Liveblocks.");
    }
    globalForLiveblocks.liveblocks = new Liveblocks({ secret });
  }

  return globalForLiveblocks.liveblocks;
}
