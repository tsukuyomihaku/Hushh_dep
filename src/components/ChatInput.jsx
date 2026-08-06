import React, { useState } from "react";

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const [stamping, setStamping] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    setStamping(true);
    setTimeout(() => setStamping(false), 420);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 p-4 border-t border-surface-line bg-surface"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder={
          disabled ? "Deriving shared key…" : "Type a message to encrypt…"
        }
        className="focus-brass flex-1 bg-void border border-surface-line rounded-full px-4 py-2.5 text-sm text-ink-100 placeholder:text-ink-500/60 outline-none focus:border-brass transition-colors"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className={`focus-brass w-11 h-11 rounded-full bg-brass hover:bg-brass-bright disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-transform ${
          stamping ? "animate-seal-stamp" : ""
        }`}
        aria-label="Send encrypted message"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 12L20 4L13 20L11 13L4 12Z"
            fill="#14151F"
            stroke="#14151F"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
