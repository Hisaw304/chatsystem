import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Payment({ onClose }) {
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (loading) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;

      if (error || !session) {
        alert("Please log in to continue");
        setLoading(false);
        return;
      }

      const cents = Math.max(100, Math.floor(amount * 100));

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount_cents: cents,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Payment failed");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Unable to start payment. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[90vw] max-w-sm bg-[var(--chat-bg)] text-[var(--chat-text)] rounded-xl shadow-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">Add chat credit</h2>
          <button
            onClick={onClose}
            className="text-[var(--chat-muted)] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[5, 10, 20].map((value) => (
            <button
              key={value}
              onClick={() => setAmount(value)}
              className={`py-2 rounded-md text-sm border ${
                amount === value
                  ? "bg-[var(--chat-primary)] text-white border-transparent"
                  : "border-[var(--chat-border)]"
              }`}
            >
              ${value}
            </button>
          ))}
        </div>

        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
          className="w-full mb-4 px-3 py-2 rounded-md bg-transparent border border-[var(--chat-border)] text-sm outline-none"
        />

        <p className="text-xs text-[var(--chat-muted)] mb-4">
          You’ll be charged <strong>$2 per minute</strong>. Chat ends
          automatically when balance runs out.
        </p>

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-2 rounded-md bg-[var(--chat-primary)] text-white disabled:opacity-60"
        >
          {loading ? "Processing..." : `Pay $${amount}`}
        </button>
      </div>
    </div>
  );
}
