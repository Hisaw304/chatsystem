import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ChatPanel({ session }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`admin:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          table: "messages",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setMessages((m) => [...m, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session.id]);

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at");

    setMessages(data || []);
  }

  async function sendMessage() {
    if (!input.trim()) return;

    await supabase.rpc("send_message", {
      session_uuid: session.id,
      role: "admin",
      message: input,
    });

    setInput("");
  }

  async function endSession() {
    await supabase.rpc("end_chat_session", {
      session_uuid: session.id,
    });
  }

  return (
    <section className="flex-1 flex flex-col bg-[var(--chat-bg)]">
      {/* Header */}
      <header className="p-4 border-b border-[var(--chat-border)] flex justify-between items-center">
        <div>
          <p className="font-semibold">Live Chat</p>
          <p className="text-xs text-[var(--chat-muted)]">
            Session ID: {session.id.slice(0, 8)}…
          </p>
        </div>

        <button
          onClick={endSession}
          className="text-sm px-3 py-1 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30"
        >
          End Session
        </button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[70%] px-3 py-2 rounded-lg text-sm leading-relaxed
              ${
                m.sender_role === "admin"
                  ? "ml-auto bg-[var(--chat-primary)] text-white"
                  : "mr-auto bg-[var(--chat-admin-msg)] text-white"
              }
            `}
          >
            {m.content}
          </div>
        ))}
      </main>

      {/* Input */}
      <footer className="p-4 border-t border-[var(--chat-border)] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a reply..."
          className="flex-1 px-3 py-2 rounded-md bg-transparent border border-[var(--chat-border)] text-sm outline-none"
        />
        <button
          onClick={sendMessage}
          className="px-4 rounded-md bg-[var(--chat-primary)] text-white"
        >
          Send
        </button>
      </footer>
    </section>
  );
}
