import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

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
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const userId = session.metadata.user_id;
    const amount = Number(session.metadata.amount_cents);

    if (!userId || !amount) {
      return new Response("Invalid metadata", { status: 400 });
    }

    /* 🔒 Idempotency: only credit once */
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existing) {
      return new Response("Already processed", { status: 200 });
    }

    /* ✅ Record payment */
    await supabase.from("payments").insert({
      stripe_session_id: session.id,
      user_id: userId,
      amount_cents: amount,
    });

    /* 💰 Increment wallet safely */
    await supabase.rpc("increment_wallet_balance", {
      uid: userId,
      amount_cents: amount,
    });
  }

  return new Response("OK", { status: 200 });
};
