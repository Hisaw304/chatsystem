import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server only
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { amount_cents } = req.body;

    if (!amount_cents || amount_cents <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const baseUrl = process.env.SITE_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Chat Credit" },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        amount_cents,
      },
      success_url: `${baseUrl}/chat?success=true`,
      cancel_url: `${baseUrl}/chat?cancel=true`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
