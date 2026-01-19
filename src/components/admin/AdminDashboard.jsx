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
  const [loadingPresence, setLoadingPresence] = useState(true);

  /* -------------------- LOGOUT -------------------- */
  async function handleLogout() {
    try {
      await supabase.rpc("set_admin_presence", { online: false });
    } catch (err) {
      console.error("Failed to set offline on logout", err);
    }

    await supabase.auth.signOut();
    window.location.href = "/";
  }

  /* -------------------- INITIAL LOAD -------------------- */
  useEffect(() => {
    loadPresence();
    loadSessions();
  }, []);

  /* -------------------- PRESENCE (SOURCE OF TRUTH = DB) -------------------- */
  async function loadPresence() {
    setLoadingPresence(true);

    const { data, error } = await supabase
      .from("presence")
      .select("is_online")
      .single();

    if (error) {
      console.error("Failed to load presence", error);
      setOnline(false);
    } else {
      setOnline(data.is_online);
    }

    setLoadingPresence(false);
  }

  async function togglePresence() {
    if (loadingPresence) return;

    const next = !online;

    const { error } = await supabase.rpc("set_admin_presence", {
      online: next,
    });

    if (error) {
      console.error("Failed to toggle presence", error);
      return;
    }

    // 🔒 re-fetch from DB to avoid drift
    await loadPresence();
  }

  /* -------------------- REALTIME SESSION LIST -------------------- */
  useEffect(() => {
    if (view !== "live") return;

    const channel = supabase
      .channel("admin-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => loadSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view]);

  async function loadSessions() {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .in("status", ["active", "pending"])
      .order("started_at");

    if (error) {
      console.error("Failed to load sessions", error);
      return;
    }

    setSessions(data || []);
  }

  /* -------------------- UI -------------------- */
  return (
    <div className="h-screen flex text-[var(--chat-text)] bg-[var(--chat-bg)]">
      {view === "live" && (
        <SessionList
          sessions={sessions}
          activeSession={activeSession}
          onSelect={setActiveSession}
          online={online}
          togglePresence={togglePresence}
          loading={loadingPresence}
        />
      )}

      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="p-4 border-b border-[var(--chat-border)] flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>

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

        {/* Content */}
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
