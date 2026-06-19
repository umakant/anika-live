import { NextResponse } from "next/server";
import { getStreamLogs } from "@/lib/storage";

export async function GET() {
  return NextResponse.json({ logs: getStreamLogs(500) });
}
