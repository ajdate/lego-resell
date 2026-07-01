import { currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bricksetUsername } = await request.json();
  if (!bricksetUsername || typeof bricksetUsername !== "string") {
    return Response.json({ error: "Username required" }, { status: 400 });
  }

  const apiKey = process.env.BRICKSET_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Brickset API is not configured" },
      { status: 500 },
    );
  }

  const username = bricksetUsername.trim();
  const params = encodeURIComponent(
    JSON.stringify({
      owned: 1,
      pageSize: 500,
      username,
    }),
  );
  const url = `https://brickset.com/api/v3.asmx/getSets?apiKey=${encodeURIComponent(apiKey)}&userHash=&params=${params}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status === "error") {
    return Response.json({ error: data.message ?? "Brickset API error" }, {
      status: 400,
    });
  }

  const sets = data.sets || [];

  const portfolioItems = sets.map(
    (set: {
      number: string;
      name: string;
      theme?: string;
      year?: number;
      USRetailPrice?: number;
      owned?: { owned?: number };
    }) => ({
      setNumber: String(set.number),
      name: set.name,
      theme: set.theme ?? "Unknown",
      year: set.year ?? 0,
      condition: "sealed",
      intent: "undecided",
      pricePaid: set.USRetailPrice ? Math.round(set.USRetailPrice * 1.55) : 0,
      quantity: set.owned?.owned || 1,
      dateAdded: new Date().toISOString(),
      source: "brickset-import",
    }),
  );

  return Response.json({
    success: true,
    sets: portfolioItems,
    total: portfolioItems.length,
  });
}
