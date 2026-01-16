export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { amount_cents } = await req.json();

  if (!amount_cents || amount_cents <= 0) {
    return new Response("Invalid amount", { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const baseUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

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

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
}
