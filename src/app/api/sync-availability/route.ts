import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Use local script: node scripts/sync-availability.mjs" });
}
