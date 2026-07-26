import { NextRequest, NextResponse } from "next/server";
import eanMap from "@/data/ean-map.json";

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("code");
  if (!barcode) {
    return NextResponse.json({ error: "No barcode" }, { status: 400 });
  }

  const setNumber = (eanMap as Record<string, string>)[barcode];

  if (setNumber) {
    return NextResponse.json({ found: true, setNumber });
  }

  return NextResponse.json({ found: false, barcode });
}
