import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const cookie = getSessionCookieOptions();
  const response = NextResponse.json({ success: true });
  response.cookies.set(cookie.name, "", { ...cookie, maxAge: 0 });
  return response;
}
