import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Payment from "./Payment";
import { useAuth } from "../lib/AuthContext";
import Auth from "./Auth";
import { useLocation, useNavigate } from "react-router-dom";

const RATE_PER_MINUTE = 200; // cents

export default function Chat() {
  /* -------------------- STATE -------------------- */
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("online");
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [balance, setBalance] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [adminOnline, setAdminOnline] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const success = searchParams.get("success");

  useEffect(() => {
    if (success === "true") {
      (async () => {
        // refresh wallet after Stripe
        await loadWallet();

        // open chat UI
        setOpen(true);

        // clean URL so refresh doesn't retrigger
        navigate("/chat", { replace: true });
      })();
    }
  }, [success]);

  /* -------------------- LOAD WALLET -------------------- */
  useEffect(() => {
    loadWallet();
  }, []);

  async function loadWallet() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    const { data } = await supabase
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (data) setBalance(data.balance_cents / 100);
  }

  useEffect(() => {
    const channel = supabase
      .channel("wallet-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", table: "wallets" },
        (payload) => setBalance(payload.new.balance_cents / 100)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* -------------------- START CHAT -------------------- */
  async function startChat() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      alert("Please log in to start chat");
      return;
    }
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", auth.user.id)
      .single();

    if (!wallet || wallet.balance_cents <= 0) {
      setShowPayment(true);
      return;
    }

    // Resume existing session
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("id, started_at")
      .eq("user_id", auth.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      setSessionId(existing.id);
      setStartedAt(existing.started_at);
      setStatus("active");
      setOpen(true);
      return;
    }

    // Create new session
    const { data, error } = await supabase.rpc("start_chat_session", {
      uid: auth.user.id,
      rate_per_minute_cents: RATE_PER_MINUTE,
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    const { data: session } = await supabase
      .from("chat_sessions")
      .select("started_at")
      .eq("id", data)
      .single();

    setSessionId(data);
    setStartedAt(session.started_at);
    setStatus("active");
    setOpen(true);
  }

  /* -------------------- RESTORE SESSION -------------------- */
  useEffect(() => {
    if (!user) return;

    const restoreSession = async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("id, started_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (data) {
        setSessionId(data.id);
        setStartedAt(data.started_at);
        setStatus("active");
        setOpen(true);
      }
    };

    restoreSession();
  }, [user]);

  /* -------------------- LOAD + SUBSCRIBE MESSAGES -------------------- */
  useEffect(() => {
    if (!sessionId) return;

    loadMessages();

    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((m) => [...m, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sessionId]);

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at");

    setMessages(data || []);
  }

  /* -------------------- SEND MESSAGE -------------------- */
  async function sendMessage() {
    if (!input.trim() || !sessionId || status !== "active" || !adminOnline)
      return;

    // 🔥 BILL FIRST
    await supabase.rpc("bill_active_session", {
      p_session_id: sessionId,
    });

    // THEN send message
    await supabase.rpc("send_message", {
      session_uuid: sessionId,
      role: "user",
      message: input,
    });

    setInput("");
  }

  /* -------------------- ADMIN PRESENCE -------------------- */
  useEffect(() => {
    const loadPresence = async () => {
      const { data } = await supabase
        .from("presence")
        .select("is_online")
        .eq("id", true)
        .single();

      if (data) setAdminOnline(data.is_online);
    };

    loadPresence();

    const channel = supabase
      .channel("admin-presence")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          table: "presence",
          filter: "id=eq.true",
        },
        (payload) => {
          setAdminOnline(payload.new.is_online);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* -------------------- TIMER -------------------- */
  useEffect(() => {
    if (!startedAt || status !== "active") return;

    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - new Date(startedAt)) / 1000));
    };

    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [startedAt, status]);

  /* -------------------- END CHAT -------------------- */
  async function endChat() {
    if (sessionId) {
      const { error } = await supabase.rpc("end_chat_session", {
        session_uuid: sessionId,
      });

      if (error) {
        console.error("Failed to end chat:", error.message);
      }
    }

    setSessionId(null);
    setStatus("online");
    setStartedAt(null);
    setElapsedSeconds(0);
  }

  function handleOpenChat() {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setOpen(true);
  }

  function handleCloseChat() {
    setOpen(false);
  }
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-status:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          table: "chat_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new.status !== "active") {
            setStatus("online");
            setSessionId(null);
            setStartedAt(null);
            setElapsedSeconds(0);

            if (payload.new.status === "ended_out_of_funds") {
              setShowPayment(true);
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [sessionId]);

  /* -------------------- RENDER -------------------- */
  return (
    <>
      {/* ================= ACCOUNT MENU ================= */}
      {user && (
        <div className="fixed top-4 right-4 z-[1000]">
          <button
            onClick={() => setShowAccount((v) => !v)}
            className="px-3 py-2 rounded-lg bg-black/80 text-white text-sm"
          >
            Account ▾
          </button>

          {showAccount && (
            <div className="mt-2 bg-white rounded-lg shadow-lg overflow-hidden text-sm">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setOpen(false);
                  setStatus("idle");
                  setShowAccount(false);
                }}
                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= AUTH MODAL ================= */}
      {showAuth && (
        <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center">
          <Auth onSuccess={() => setShowAuth(false)} />
        </div>
      )}

      {/* ================= PAYMENT MODAL ================= */}
      {showPayment && (
        <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center">
          <Payment
            onClose={() => setShowPayment(false)}
            onSuccess={async () => {
              setShowPayment(false);
              await loadWallet();
            }}
          />
        </div>
      )}

      {/* ================= FLOATING CHAT BUTTON ================= */}
      {!open && (
        <button
          onClick={handleOpenChat}
          className="
          fixed bottom-5 right-5 z-50
          w-14 h-14 rounded-full
          bg-[var(--chat-primary)]
          text-white shadow-lg
          flex items-center justify-center
        "
        >
          💬
          {adminOnline && (
            <span
              className="
              absolute top-1 right-1
              w-3 h-3 rounded-full
              bg-[var(--chat-online)]
              border-2 border-white
            "
            />
          )}
        </button>
      )}

      {/* ================= ACTIVE CHAT WINDOW ================= */}
      {open && status === "active" && (
        <div
          className="
          fixed bottom-5 right-5 z-50
          w-[90vw] max-w-sm h-[70vh]
          bg-[var(--chat-bg)]
          text-[var(--chat-text)]
          rounded-xl shadow-xl
          flex flex-col
        "
        >
          {/* HEADER */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--chat-border)]">
            <div>
              <p className="font-semibold">Live Chat</p>
              <p className="text-xs text-[var(--chat-muted)]">
                {adminOnline ? "Admin online" : "Admin offline"}
              </p>
            </div>

            <button
              onClick={() => {
                setOpen(false);
                setStatus("idle");
              }}
            >
              ✕
            </button>
          </header>

          {/* MESSAGES */}
          <main className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                  msg.sender_role === "user"
                    ? "ml-auto bg-[var(--chat-primary)] text-white"
                    : "mr-auto bg-[var(--chat-admin-msg)]"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </main>

          {/* FOOTER */}
          <footer className="border-t border-[var(--chat-border)] p-3">
            <div className="flex justify-between text-xs mb-2 text-[var(--chat-muted)]">
              <span>
                Time: {Math.floor(elapsedSeconds / 60)}:
                {String(elapsedSeconds % 60).padStart(2, "0")}
              </span>
              <span>${balance.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!adminOnline}
                placeholder={
                  adminOnline ? "Type a message..." : "Admin offline"
                }
                className="
                flex-1 px-3 py-2 rounded-md
                bg-transparent border border-[var(--chat-border)]
                text-sm outline-none
              "
              />

              <button
                onClick={sendMessage}
                disabled={!input.trim() || !adminOnline}
                className="
                px-4 rounded-md
                bg-[var(--chat-primary)]
                text-white disabled:opacity-50
              "
              >
                Send
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* ================= START CHAT CTA ================= */}
      {open && status !== "active" && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            onClick={() => {
              if (!user) {
                setShowAuth(true);
                return;
              }

              if (balance <= 0) {
                setShowPayment(true);
                return;
              }

              setStatus("active");
            }}
            className="
            w-[90vw] max-w-sm py-3 rounded-xl
            bg-[var(--chat-primary)]
            text-white shadow-lg
          "
          >
            {balance <= 0
              ? "Add credit to start chat"
              : "Start chat ($2 / min)"}
          </button>
        </div>
      )}
    </>
  );
}
