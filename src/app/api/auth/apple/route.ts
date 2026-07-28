import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { idToken, nonce: _nonce } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "No token" }, { status: 400 });
    }

    const clerkResponse = await fetch("https://api.clerk.com/v1/tokens/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: idToken,
        provider: "apple",
      }),
    });

    if (!clerkResponse.ok) {
      const error = await clerkResponse.text();
      console.error("Clerk token verification failed:", error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      );
    }

    const clerkData = (await clerkResponse.json()) as { sub?: string };

    return NextResponse.json({ success: true, userId: clerkData.sub });
  } catch (err) {
    console.error("Apple auth error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
