import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { findUserIdByStripeCustomerId, setSubscriptionForUser } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function mapStripeStatus(status: string): "active" | "canceled" | "past_due" | "incomplete" {
  const s = String(status || "").toLowerCase();
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "incomplete" || s === "incomplete_expired") return "incomplete";
  return "canceled";
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = requiredEnv("STRIPE_SECRET_KEY");
    const webhookSecret = requiredEnv("STRIPE_WEBHOOK_SECRET");
    const sig = request.headers.get("stripe-signature") || "";
    const body = await request.text();

    const stripe = new Stripe(secretKey);
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.userId || "";
      const customerId = typeof session.customer === "string" ? session.customer : "";
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : "";
      const plan = session.metadata?.plan;

      if (userId) {
        await setSubscriptionForUser(userId, {
          status: "active",
          plan,
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: subscriptionId || undefined,
        });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : "";
      const userId = customerId ? await findUserIdByStripeCustomerId(customerId) : null;
      if (userId) {
        await setSubscriptionForUser(userId, {
          status: event.type === "customer.subscription.deleted" ? "canceled" : mapStripeStatus(sub.status),
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: sub.id || undefined,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ received: false, error: message }, { status: 400 });
  }
}

