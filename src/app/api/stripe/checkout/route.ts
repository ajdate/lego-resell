import Stripe from "stripe";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { BRICKVALUE_APP_ORIGIN } from "@/lib/site-url";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { priceId, billingPeriod } = await request.json();

  if (!priceId) {
    return Response.json({ error: "Missing price ID" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? BRICKVALUE_APP_ORIGIN;
  const email = user.emailAddresses[0]?.emailAddress;

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${appUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: {
      userId: user.id,
      billingPeriod,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
      },
    },
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
