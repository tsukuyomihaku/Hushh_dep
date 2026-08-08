import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const { register, login, error, setError } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await register(form.email, form.password, form.name);
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(humanizeAuthError(err.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="relative w-full max-w-4xl grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-surface-line shadow-2xl shadow-black/40">
        {/* Left: brand / thesis panel */}
        <div className="bg-surface p-10 md:p-12 flex flex-col justify-center relative">
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none seal-texture" />
          <div className="flex flex-col items-center text-center mb-6">
            <span className="font-display text-6xl md:text-7xl font-bold italic tracking-tight text-brass">
              Hushh!
            </span>
          </div>
          <div className="text-center">
            <h1 className="font-display text-4xl md:text-[2.75rem] leading-[1.05] text-ink-100 mb-5">
              A quiet place
              <br />
              <span className="text-brass italic">to talk</span>, just the two of you.
            </h1>
            <p className="text-ink-500 text-[15px] leading-relaxed max-w-sm mx-auto">
              Your conversations stay private by default — nothing you send
              here is visible to anyone outside the chat.
            </p>
          </div>
        </div>

        {/* Right: form panel */}
        <div className="bg-surface-raised p-10 md:p-12 flex flex-col justify-center">
          <div className="flex mb-8 rounded-full bg-void p-1 border border-surface-line w-fit">
            <TabButton active={mode === "login"} onClick={() => setMode("login")}>
              Sign in
            </TabButton>
            <TabButton
              active={mode === "register"}
              onClick={() => setMode("register")}
            >
              Create account
            </TabButton>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <Field
                label="Name"
                type="text"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Alice"
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="alice@ncit.edu.np"
              required
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="••••••••"
              required
              minLength={6}
            />

            {error && (
              <p className="text-signal-danger text-sm font-mono bg-signal-danger/10 border border-signal-danger/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="focus-brass mt-2 rounded-lg bg-brass hover:bg-brass-bright disabled:opacity-50 disabled:cursor-not-allowed text-void font-semibold py-3 transition-colors"
            >
              {busy
                ? mode === "register"
                  ? "Setting up your account…"
                  : "Signing in…"
                : mode === "register"
                ? "Create account"
                : "Sign in"}
            </button>

            {mode === "register" && (
              <p className="text-ink-500 text-xs text-center leading-relaxed">
                Takes a few seconds — you'll be chatting right away.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-brass px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-brass text-void" : "text-ink-500 hover:text-ink-100"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, type, value, onChange, placeholder, required, minLength }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-ink-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus-brass bg-void border border-surface-line rounded-lg px-3.5 py-2.5 text-ink-100 placeholder:text-ink-500/50 outline-none transition-colors focus:border-brass"
      />
    </label>
  );
}

function humanizeAuthError(code) {
  const map = {
    "auth/email-already-in-use": "That email is already registered — try signing in instead.",
    "auth/invalid-email": "That doesn't look like a valid email address.",
    "auth/weak-password": "Password needs to be at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Email or password is incorrect.",
  };
  return map[code] || "Something went wrong. Please try again.";
}