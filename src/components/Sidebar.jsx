import React from "react";
import Identicon from "./Identicon";

export default function Sidebar({
  contacts,
  activeId,
  onSelect,
  currentUser,
  onLogout,
}) {
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
        <p className="text-[10px] uppercase tracking-widest text-ink-500">
          Conversations
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {contacts.length === 0 && (
          <p className="text-ink-500 text-sm px-3 py-6 text-center leading-relaxed">
            No contacts yet. Register another account in a second browser
            tab / profile to start a conversation.
          </p>
        )}
        {contacts.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`focus-brass w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left transition-colors ${
              activeId === c.id
                ? "bg-surface-raised"
                : "hover:bg-surface-raised/60"
            }`}
          >
            <Identicon bytes={c.fingerprint} size={38} />
            <div className="min-w-0">
              <p className="text-sm text-ink-100 truncate">{c.displayName}</p>
              <p className="text-[11px] text-ink-500 font-mono truncate">
                {c.email}
              </p>
            </div>
          </button>
        ))}
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
