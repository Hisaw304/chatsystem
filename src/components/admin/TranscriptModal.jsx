import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function TranscriptModal({ sessionId, onClose }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    loadMessages();
  }, [sessionId]);

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("sender_role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at");

    setMessages(data || []);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="w-[90vw] max-w-lg h-[70vh] bg-[var(--chat-bg)] border border-[var(--chat-border)] rounded-xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--chat-border)]">
          <h2 className="font-semibold">Chat Transcript</h2>
          <button
            onClick={onClose}
            className="text-[var(--chat-muted)] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[80%] px-3 py-2 rounded text-sm ${
                m.sender_role === "admin"
                  ? "ml-auto bg-[var(--chat-primary)] text-white"
                  : "mr-auto bg-[var(--chat-admin-msg)]"
              }`}
            >
              <p>{m.content}</p>
              <p className="text-[10px] opacity-60 mt-1">
                {new Date(m.created_at).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
