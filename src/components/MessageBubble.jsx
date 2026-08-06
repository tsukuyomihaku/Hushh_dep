import React, { useEffect, useState } from "react";

const HEX = "0123456789abcdef";
function scrambledHexFor(text, length = 24) {
  let out = "";
  for (let i = 0; i < length; i++) out += HEX[Math.floor(Math.random() * 16)];
  return out;
}

/**
 * mine: is this the current user's own message (right-aligned, brass)
 * revealAnimation: play the ciphertext -> plaintext resolve once on mount
 *   (used only for messages the user just sent in this session)
 */
export default function MessageBubble({ text, timestamp, mine, revealAnimation }) {
  const [phase, setPhase] = useState(revealAnimation ? "cipher" : "plain");
  const [scramble, setScramble] = useState(scrambledHexFor(text));

  useEffect(() => {
    if (!revealAnimation) return;
    const scrambleInterval = setInterval(() => {
      setScramble(scrambledHexFor(text));
    }, 45);
    const resolveTimeout = setTimeout(() => {
      clearInterval(scrambleInterval);
      setPhase("plain");
    }, 380);
    return () => {
      clearInterval(scrambleInterval);
      clearTimeout(resolveTimeout);
    };
  }, [revealAnimation, text]);

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 relative ${
          mine
            ? "bg-brass text-void rounded-br-sm"
            : "bg-surface-raised text-ink-100 rounded-bl-sm border border-surface-line"
        }`}
      >
        {phase === "cipher" ? (
          <span className="font-mono text-xs tracking-wider opacity-80 animate-cipher-scramble">
            {scramble}
          </span>
        ) : (
          <span className="text-[15px] leading-relaxed break-words">{text}</span>
        )}
        <div
          className={`text-[10px] mt-1 font-mono ${
            mine ? "text-void/60" : "text-ink-500"
          }`}
        >
          {timestamp} {phase === "plain" && mine ? "· sealed" : ""}
        </div>
      </div>
    </div>
  );
}
