import React, { useState } from "react";
import { attemptDecryptWithWrongKey } from "../crypto/cryptoUtils";

/**
 * lastMessage: { ciphertext, iv, senderUid, receiverUid, createdAt }
 * Renders the live three-layer interception demo described in section 4.1.4
 * of the proposal. This is meant to be opened during the actual defense to
 * show an assessor that intercepted data is unusable without the key.
 */
export default function AttackerPanel({ open, onClose, lastMessage }) {
  const [layer1Result, setLayer1Result] = useState(null);
  const [running, setRunning] = useState(false);

  async function runLayer1() {
    if (!lastMessage) return;
    setRunning(true);
    setLayer1Result(null);
    const result = await attemptDecryptWithWrongKey(
      lastMessage.ciphertext,
      lastMessage.iv
    );
    setLayer1Result(result);
    setRunning(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-void/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md h-full bg-surface border-l border-surface-line overflow-y-auto">
        <div className="p-6 seal-divider flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-signal-danger">
              Attacker panel
            </p>
            <h2 className="font-display text-xl text-ink-100">
              Three-layer interception
            </h2>
          </div>
          <button
            onClick={onClose}
            className="focus-brass text-ink-500 hover:text-ink-100 text-sm"
          >
            close
          </button>
        </div>

        {!lastMessage ? (
          <p className="text-ink-500 text-sm p-6 leading-relaxed">
            Send a message first, then reopen this panel to intercept it.
          </p>
        ) : (
          <div className="p-6 flex flex-col gap-6">
            <Layer
              number={1}
              title="Application-level interception"
              description="Attempt AES-256-GCM decryption of the intercepted ciphertext using a fabricated key."
            >
              <button
                onClick={runLayer1}
                disabled={running}
                className="focus-brass text-xs font-mono px-3 py-1.5 rounded-full bg-signal-danger/15 border border-signal-danger/40 text-signal-danger hover:bg-signal-danger/25 transition-colors disabled:opacity-50"
              >
                {running ? "attempting…" : "attempt decrypt with wrong key"}
              </button>
              {layer1Result && (
                <p
                  className={`mt-3 font-mono text-xs px-3 py-2 rounded-lg border ${
                    layer1Result.success
                      ? "text-signal-danger border-signal-danger/40 bg-signal-danger/10"
                      : "text-signal-success border-signal-success/40 bg-signal-success/10"
                  }`}
                >
                  {layer1Result.success
                    ? "unexpected: decryption succeeded"
                    : `DOMException: ${layer1Result.error} — authentication tag mismatch. No plaintext recovered.`}
                </p>
              )}
            </Layer>

            <Layer
              number={2}
              title="Database-level inspection"
              description="Raw Firestore document as it exists on the server right now."
            >
              <pre className="font-mono text-[11px] text-ink-300 bg-void rounded-lg p-3 overflow-x-auto border border-surface-line">
{JSON.stringify(
  {
    senderUid: lastMessage.senderUid,
    receiverUid: lastMessage.receiverUid,
    ciphertext: lastMessage.ciphertext,
    iv: lastMessage.iv,
    plaintext: null,
  },
  null,
  2
)}
              </pre>
            </Layer>

            <Layer
              number={3}
              title="Network-level packet inspection"
              description="What the HTTP payload to Firebase looks like — cross-check this against the browser DevTools Network tab and Wireshark's TLS 1.3 view during a live demo."
            >
              <pre className="font-mono text-[11px] text-ink-300 bg-void rounded-lg p-3 overflow-x-auto border border-surface-line whitespace-pre-wrap break-all">
{`POST /v1/projects/.../documents/messages
Content-Type: application/json
{"fields":{"ciphertext":{"stringValue":"${lastMessage.ciphertext.slice(
                  0,
                  40
                )}..."}}}`}
              </pre>
            </Layer>
          </div>
        )}
      </div>
    </div>
  );
}

function Layer({ number, title, description, children }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-void border border-surface-line flex items-center justify-center font-mono text-xs text-brass">
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm text-ink-100 font-medium mb-1">{title}</h3>
        <p className="text-xs text-ink-500 mb-3 leading-relaxed">
          {description}
        </p>
        {children}
      </div>
    </div>
  );
}
