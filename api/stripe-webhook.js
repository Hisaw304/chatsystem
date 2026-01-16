import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-12-15.clover",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

export default async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")
    );
  } catch (err) {
    console.error("Webhook verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (!session.metadata?.user_id) {
      return new Response("Missing user metadata", { status: 400 });
    }

    const userId = session.metadata.user_id;
    const amount = session.amount_total; // ✅ Stripe truth

    /* 🔒 Idempotency */
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existing) {
      return new Response("Already processed", { status: 200 });
    }

    /* 💾 Record payment */
    await supabase.from("payments").insert({
      stripe_session_id: session.id,
      user_id: userId,
      amount_cents: amount,
    });

    /* 💰 Credit wallet */
    const { error } = await supabase.rpc("increment_wallet_balance", {
      uid: userId,
      amount_cents: amount,
    });

    if (error) {
      console.error("Wallet credit failed", error);
      return new Response("Wallet update failed", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
};
