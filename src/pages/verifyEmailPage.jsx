import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmailPage() {
  const { user, logout, resendVerification, refreshEmailVerification } = useAuth();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // Poll every 4 seconds in the background so the moment the person clicks
  // the link in their email, this screen notices on its own and hands off
  // to the chat — no manual "check again" click or page refresh needed.
  useEffect(() => {
    const interval = setInterval(() => {
      refreshEmailVerification().catch(() => {
        // Silent — a transient failed background check shouldn't interrupt
        // the person; the manual "check again" button still works as a
        // fallback, and the next automatic poll will just try again.
      });
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCheck() {
    setBusy(true);
    setStatus("");
    try {
      const verified = await refreshEmailVerification();
      if (!verified) {
        setStatus("Not verified yet — click the link in the email first, then try again.");
      }
    } catch {
      setStatus("Couldn't check verification status right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setStatus("");
    try {
      await resendVerification();
      setStatus("Verification email sent — check your inbox (and spam folder).");
    } catch {
      setStatus("Couldn't send the email right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-void px-6">
      <div className="max-w-md w-full bg-surface border border-surface-line rounded-2xl p-8 text-center">
        <h1 className="font-display text-2xl text-ink-100 mb-3">Verify your email</h1>
        <p className="text-ink-500 text-sm leading-relaxed mb-6">
          We sent a verification link to{" "}
          <span className="text-ink-100 font-mono">{user?.email}</span>. Click
          it — this page will pick it up automatically, no need to come back
          and refresh.
        </p>

        {status && (
          <p className="text-xs font-mono text-brass mb-4 leading-relaxed">{status}</p>
        )}

        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-success animate-pulse" />
          <span className="text-[11px] font-mono text-ink-500">
            watching for verification…
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCheck}
            disabled={busy}
            className="focus-brass rounded-lg bg-brass hover:bg-brass-bright disabled:opacity-50 disabled:cursor-not-allowed text-void font-semibold py-2.5 transition-colors"
          >
            {busy ? "Checking…" : "I've verified — check again"}
          </button>
          <button
            onClick={handleResend}
            disabled={busy}
            className="focus-brass rounded-lg border border-surface-line text-ink-300 hover:text-ink-100 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 transition-colors text-sm"
          >
            Resend verification email
          </button>
          <button
            onClick={logout}
            className="text-ink-500 hover:text-ink-100 text-xs mt-2 transition-colors"
          >
            Sign out and use a different email
          </button>
        </div>
      </div>
    </div>
  );
}