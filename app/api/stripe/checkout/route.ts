import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let plan: "monthly" | "yearly" = "monthly";
  try {
    const body = (await request.json()) as { plan?: string };
    if (body.plan === "yearly") plan = "yearly";
  } catch {
    // ignore
  }

  try {
    const secretKey = requiredEnv("STRIPE_SECRET_KEY");
    const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
    const priceMonthly = requiredEnv("STRIPE_PRICE_MONTHLY");
    const priceYearly = requiredEnv("STRIPE_PRICE_YEARLY");
    const price = plan === "yearly" ? priceYearly : priceMonthly;

    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${site.replace(/\/$/, "")}/subscribe?success=1`,
      cancel_url: `${site.replace(/\/$/, "")}/subscribe?canceled=1`,
      metadata: {
        userId: user.id,
        plan,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
