import { NextResponse } from "next/server";
import { getStreamManager } from "@/lib/stream-manager";

export async function POST() {
  try {
    const manager = getStreamManager();
    const state = await manager.start();
    return NextResponse.json({ success: true, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start stream";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
