import React, { useMemo, useState } from "react";
import Identicon from "./Identicon";

function formatRelativeTime(millis) {
  const diffSec = Math.max(0, Math.floor((Date.now() - millis) / 1000));
  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(millis).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Sidebar({
  contacts,
  activeId,
  onSelect,
  currentUser,
  onLogout,
  lastActivity = {},
  unreadContactIds = new Set(),
}) {
  const [query, setQuery] = useState("");

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.displayName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  return (
    <aside className="w-72 shrink-0 bg-surface border-r border-surface-line flex flex-col h-full">
      <div className="p-5 flex items-center justify-between seal-divider">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tracking-[0.2em] text-brass uppercase">
            Hushh!
          </span>
        </div>
        <button
          onClick={onLogout}
          className="focus-brass text-ink-500 hover:text-signal-danger text-xs font-mono transition-colors"
        >
          sign out
        </button>
      </div>

      <div className="px-5 py-3">
        <p className="text-[10px] uppercase tracking-widest text-ink-500 mb-2">
          Conversations
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username…"
          className="focus-brass w-full bg-void border border-surface-line rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500/50 outline-none transition-colors focus:border-brass"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {contacts.length === 0 && (
          <p className="text-ink-500 text-sm px-3 py-6 text-center leading-relaxed">
            No contacts yet. Register another account in a second browser
            tab / profile to start a conversation.
          </p>
        )}
        {contacts.length > 0 && filteredContacts.length === 0 && (
          <p className="text-ink-500 text-sm px-3 py-6 text-center leading-relaxed">
            No one matches "{query}".
          </p>
        )}
        {filteredContacts.map((c) => {
          const isUnread = unreadContactIds.has(c.id);
          const activityAt = lastActivity[c.id]?.at;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={`focus-brass w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left transition-colors ${
                isUnread
                  ? "bg-brass/40 hover:bg-brass/50"
                  : activeId === c.id
                  ? "bg-surface-raised"
                  : "hover:bg-surface-raised/60"
              }`}
            >
              <Identicon bytes={c.fingerprint} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm truncate ${
                      isUnread ? "text-ink-100 font-medium" : "text-ink-100"
                    }`}
                  >
                    {c.displayName}
                  </p>
                  {activityAt && (
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        isUnread ? "text-ink-100" : "text-ink-500"
                      }`}
                    >
                      {formatRelativeTime(activityAt)}
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] font-mono truncate ${
                    isUnread ? "text-ink-100/80" : "text-ink-500"
                  }`}
                >
                  {c.email}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 seal-divider">
        <div className="flex items-center gap-2.5 px-1">
          <Identicon bytes={currentUser?.fingerprint} size={30} />
          <div className="min-w-0">
            <p className="text-xs text-ink-100 truncate">
              {currentUser?.displayName || "You"}
            </p>
            <p className="text-[10px] text-signal-success font-mono">
              key resident in memory
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}