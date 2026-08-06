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
      {/* ambient cipher glyphs drifting in the background */}
      <BackgroundCiphertext />

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-surface-line shadow-2xl shadow-black/40">
        {/* Left: brand / thesis panel */}
        <div className="bg-surface p-10 md:p-12 flex flex-col justify-between relative">
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none seal-texture" />
          <div>
            <div className="flex items-center gap-3 mb-10">
              <SealMark />
              <span className="font-mono text-xs tracking-[0.25em] text-brass uppercase">
                Hushh!
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-[2.75rem] leading-[1.05] text-ink-100 mb-5">
              Whatever you send,
              <br />
              <span className="text-brass italic">only they</span> can read it.
            </h1>
            <p className="text-ink-500 text-[15px] leading-relaxed max-w-sm">
              Keys are generated in your browser and never leave it. Messages
              are sealed with AES-256-GCM before they ever reach a server —
              intercept them and you'll get nothing but noise.
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-4 mt-10 pt-8 seal-divider">
            <Stat label="Curve" value="P-256" />
            <Stat label="Cipher" value="AES-256" />
            <Stat label="Key exposure" value="Zero" />
          </dl>
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
                  ? "Generating your keys…"
                  : "Verifying…"
                : mode === "register"
                ? "Generate keys & create account"
                : "Sign in"}
            </button>

            {mode === "register" && (
              <p className="text-ink-500 text-xs text-center leading-relaxed">
                A P-256 key pair is generated the instant you submit this
                form. Your private key stays in this browser tab only.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] tracking-widest uppercase text-ink-500 mb-1">
        {label}
      </dt>
      <dd className="font-mono text-sm text-ink-100">{value}</dd>
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

function SealMark() {
  return (
    <div className="relative w-8 h-8 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z"
          stroke="#D4A24C"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="#D4A24C"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function BackgroundCiphertext() {
  const hex = "8f3c9a1d2e6b7045c8912fabcde3456";
  const rows = Array.from({ length: 10 });
  return (
    <div className="absolute inset-0 -z-10 opacity-[0.05] select-none pointer-events-none">
      {rows.map((_, i) => (
        <div
          key={i}
          className="font-mono whitespace-nowrap text-ink-100 text-xs"
          style={{
            transform: `translateX(${(i % 2 === 0 ? -1 : 1) * 40}px)`,
          }}
        >
          {hex.repeat(12)}
        </div>
      ))}
    </div>
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
