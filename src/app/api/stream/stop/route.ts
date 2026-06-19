import { NextResponse } from "next/server";
import { getStreamManager } from "@/lib/stream-manager";

export async function POST() {
  try {
    const manager = getStreamManager();
    const state = await manager.stop();
    return NextResponse.json({ success: true, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to stop stream";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
