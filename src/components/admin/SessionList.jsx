export default function SessionList({
  sessions,
  activeSession,
  onSelect,
  online,
  togglePresence,
}) {
  return (
    <aside className="w-80 border-r border-[var(--chat-border)] bg-[var(--chat-bg)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--chat-border)]">
        <p className="text-lg font-semibold">Admin</p>

        <button
          onClick={togglePresence}
          className={`mt-3 w-full py-2 rounded-md text-sm font-medium transition
            ${
              online
                ? "bg-[var(--chat-online)] text-black"
                : "bg-gray-700 text-white"
            }
          `}
        >
          {online ? "Online" : "Offline"}
        </button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.length === 0 && (
          <p className="text-sm text-[var(--chat-muted)] text-center mt-8">
            No active sessions
          </p>
        )}

        {sessions.map((s) => {
          const active = activeSession?.id === s.id;

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`w-full text-left p-3 rounded-lg transition border
                ${
                  active
                    ? "bg-[var(--chat-admin-msg)] border-[var(--chat-primary)]"
                    : "border-transparent hover:bg-[var(--chat-admin-msg)]"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Session</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full
                    ${
                      s.status === "active"
                        ? "bg-green-600/20 text-green-400"
                        : "bg-yellow-600/20 text-yellow-400"
                    }
                  `}
                >
                  {s.status}
                </span>
              </div>

              <p className="text-xs text-[var(--chat-muted)] mt-1">
                Started: {new Date(s.started_at).toLocaleTimeString()}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
