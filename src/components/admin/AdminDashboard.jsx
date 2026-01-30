import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import SessionList from "./SessionList";
import ChatPanel from "./ChatPanel";
import History from "./History";

export default function AdminDashboard() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [online, setOnline] = useState(false);
  const [view, setView] = useState("live"); // live | history

  /* -------------------- LOGOUT -------------------- */
  async function handleLogout() {
    try {
      await supabase.rpc("set_admin_presence", { online: false });
    } catch (_) {}

    await supabase.auth.signOut();
    window.location.href = "/";
  }

  /* -------------------- INITIAL LOAD -------------------- */
  useEffect(() => {
    loadPresence();
    loadSessions();
  }, []);

  /* -------------------- PRESENCE -------------------- */
  async function loadPresence() {
    const { data } = await supabase
      .from("presence")
      .select("is_online")
      .single();

    setOnline(data?.is_online ?? false);
  }

  async function togglePresence() {
    const next = !online;
    setOnline(next);
    await supabase.rpc("set_admin_presence", { online: next });
  }

  /* -------------------- REALTIME SESSIONS -------------------- */
  useEffect(() => {
    if (view !== "live") return;

    const channel = supabase
      .channel("admin-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        loadSessions
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [view]);

  async function loadSessions() {
    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .in("status", ["active", "pending"])
      .order("started_at");

    setSessions(data || []);
  }

  /* -------------------- UI -------------------- */
  return (
    <div className="h-screen flex text-[var(--chat-text)] bg-[var(--chat-bg)]">
      {/* Sidebar only for live chats */}
      {view === "live" && (
        <SessionList
          sessions={sessions}
          activeSession={activeSession}
          onSelect={setActiveSession}
          online={online}
          togglePresence={togglePresence}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="p-4 border-b border-[var(--chat-border)] flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setView("live")}
                className={`text-sm px-3 py-1 rounded-md ${
                  view === "live"
                    ? "bg-[var(--chat-primary)] text-white"
                    : "text-[var(--chat-muted)] hover:text-white"
                }`}
              >
                Live Chats
              </button>

              <button
                onClick={() => setView("history")}
                className={`text-sm px-3 py-1 rounded-md ${
                  view === "history"
                    ? "bg-[var(--chat-primary)] text-white"
                    : "text-[var(--chat-muted)] hover:text-white"
                }`}
              >
                History
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30"
          >
            Log out
          </button>
        </div>

        {/* View Content */}
        {view === "history" ? (
          <History />
        ) : activeSession ? (
          <ChatPanel session={activeSession} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-[var(--chat-muted)]">
            Select a session to begin
          </div>
        )}
      </div>
    </div>
  );
}
