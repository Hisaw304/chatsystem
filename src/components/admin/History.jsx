import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import TranscriptModal from "./TranscriptModal";

export default function History() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);

    const { data, error } = await supabase
      .from("admin_chat_history")
      .select("*")
      .order("ended_at", { ascending: false });

    if (!error) {
      setRows(data || []);
    }

    setLoading(false);
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--chat-bg)] text-[var(--chat-text)]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--chat-border)]">
        <h1 className="text-lg font-semibold">Chat History</h1>
        <p className="text-sm text-[var(--chat-muted)]">
          Completed chat sessions
        </p>
      </header>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="text-sm text-[var(--chat-muted)]">Loading history…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--chat-muted)]">
            No completed sessions yet.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-[var(--chat-border)] text-[var(--chat-muted)]">
                <th className="py-2">User</th>
                <th className="py-2">Date</th>
                <th className="py-2">Duration</th>
                <th className="py-2">Amount</th>
                <th className="py-2"></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--chat-border)] hover:bg-white/5"
                >
                  <td className="py-3">{r.user_email || "—"}</td>

                  <td className="py-3">
                    {new Date(r.ended_at).toLocaleString()}
                  </td>

                  <td className="py-3">
                    {Math.floor((r.duration_seconds || 0) / 60)}m{" "}
                    {(r.duration_seconds || 0) % 60}s
                  </td>

                  <td className="py-3">
                    ${((r.amount_charged_cents || 0) / 100).toFixed(2)}
                  </td>

                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedSession(r.id)}
                      className="text-[var(--chat-primary)] hover:underline"
                    >
                      View transcript
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Transcript Modal */}
      {selectedSession && (
        <TranscriptModal
          sessionId={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
