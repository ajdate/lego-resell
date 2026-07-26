import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { count } = await supabase
    .from("portfolio")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    alive: true,
    portfolioCount: count,
    timestamp: new Date().toISOString(),
  });
}
