import React, { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { keyExchangeAlgorithms, cipherAlgorithms } from "../benchmark/algorithms";
import { benchmarkKeyExchange, benchmarkCipher, resultsToCSV } from "../benchmark/runner";

const MESSAGE_SIZES = [16, 1024, 102400];
// Five visually distinct hues (avoid adjacent similar tones like two blues).
const COLORS = ["#D4A24C", "#5B7FDE", "#5FBF8B", "#E0575B", "#B15BDE"];
// Dash patterns give a second, color-independent way to tell lines apart —
// helps colorblind readers and printed/grayscale copies of the paper.
const DASH_PATTERNS = [undefined, "6 4", "2 2", "8 3 2 3", "1 3"];

// Several algorithms share the exact same security-bit rating (e.g. ECDH
// P-256 and X25519 are both 128-bit), which means their scatter points land
// on the identical x-coordinate and one completely hides the other. This
// spreads tied points apart by a small fixed offset purely for visibility —
// the true, un-jittered security bits is kept alongside each point
// (as trueSecurityBits) so the tooltip and any exported data stay accurate.
function jitterTiedPoints(results, getSecurityBits) {
  const groups = new Map();
  results.forEach((r) => {
    const bits = getSecurityBits(r);
    if (!groups.has(bits)) groups.set(bits, []);
    groups.get(bits).push(r);
  });
  const jitterById = new Map();
  groups.forEach((group) => {
    const n = group.length;
    group.forEach((r, idx) => {
      const offset = n > 1 ? (idx - (n - 1) / 2) * 3 : 0;
      jitterById.set(r.id, getSecurityBits(r) + offset);
    });
  });
  return jitterById;
}

// Custom scatter tooltip: shows the algorithm name and TRUE security bits
// (not the jittered display position) alongside the timing value.
function ScatterTooltipContent({ active, payload, timeLabel }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-surface border border-surface-line rounded px-3 py-2 text-xs">
      <p className="text-ink-100 font-medium mb-1">{p.name}</p>
      <p className="text-ink-500">Security: {p.trueSecurityBits}-bit</p>
      <p className="text-ink-500">{timeLabel}: {p.timeMs} ms</p>
    </div>
  );
}

export default function BenchmarkPage() {
  const [trials, setTrials] = useState(20);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [keResults, setKeResults] = useState([]);
  const [cipherResults, setCipherResults] = useState([]);
  const [customText, setCustomText] = useState("");

  async function runAll() {
    setRunning(true);
    setKeResults([]);
    setCipherResults([]);

    try {
      const keOut = [];
      for (const algo of keyExchangeAlgorithms) {
        setProgress(`Key exchange: ${algo.name}…`);
        const r = await benchmarkKeyExchange(algo, trials, (id, i, t) =>
          setProgress(`Key exchange: ${algo.name} (${i}/${t})`)
        );
        keOut.push(r);
        setKeResults([...keOut]);
      }

      const cOut = [];
      const customCorpus = customText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      for (const algo of cipherAlgorithms) {
        setProgress(`Cipher: ${algo.name}…`);
        const r = await benchmarkCipher(
          algo, trials, MESSAGE_SIZES,
          (id, size, i, t) => setProgress(`Cipher: ${algo.name} — ${size}B (${i}/${t})`),
          customCorpus
        );
        cOut.push(r);
        setCipherResults([...cOut]);
      }
      setProgress("Done.");
    } catch (err) {
      console.error("Benchmark failed:", err);
      setProgress(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  function downloadCSV() {
    const csv = resultsToCSV(keResults, cipherResults, MESSAGE_SIZES);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hushh_crypto_benchmark_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const keChartData = keResults.map((r) => ({
    name: r.name, "Keygen (ms)": r.keygenMs.mean, "Exchange (ms)": r.exchangeMs.mean,
  }));
  const cipherChartData = cipherResults.map((r) => ({
    name: r.name,
    "Encrypt 1KB (ms)": r.bySize[1024]?.encryptMs.mean ?? 0,
    "Decrypt 1KB (ms)": r.bySize[1024]?.decryptMs.mean ?? 0,
  }));
  const scalingChartData = MESSAGE_SIZES.map((size) => {
    const row = { size: `${size.toLocaleString()}B` };
    cipherResults.forEach((r) => { row[r.name] = r.bySize[size]?.encryptMs.mean ?? 0; });
    return row;
  });

  return (
    <div className="min-h-screen bg-void text-ink-100 p-8 font-body">
      <h1 className="font-display text-3xl text-brass mb-2">Cryptographic Algorithm Benchmark</h1>
      <p className="text-ink-500 text-sm mb-6">
        Speed, correctness, and security comparison for the research paper. All operations run
        client-side in this browser via the Web Crypto API and audited JS libraries.
      </p>

      <div className="mb-6 max-w-2xl">
        <label className="text-sm text-ink-300 block mb-1.5">
          Test with your own messages{" "}
          <span className="text-ink-500 font-normal">
            (optional — one message per line)
          </span>
        </label>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder={`Paste the actual messages you plan to send, e.g.\nHey, are you around this weekend?\nSure, let's do Saturday afternoon.`}
          rows={4}
          className="w-full bg-surface border border-surface-line rounded-lg px-3.5 py-2.5 text-ink-100 placeholder:text-ink-500/50 text-sm outline-none transition-colors focus:border-brass resize-y"
        />
        <p className="text-[11px] text-ink-500 mt-1.5">
          {customText.trim()
            ? "Cipher benchmarks below will be built from this text instead of the built-in sample sentences."
            : "Leave blank to use built-in sample chat sentences instead."}
        </p>
      </div>

      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <label className="text-sm text-ink-300">
          Trials per algorithm:
          <input type="number" min={1} max={200} value={trials}
            onChange={(e) => setTrials(Number(e.target.value))}
            className="ml-2 w-20 bg-surface border border-surface-line rounded px-2 py-1 text-ink-100" />
        </label>
        <button onClick={runAll} disabled={running}
          className="bg-brass text-void font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
          {running ? "Running…" : "Run Benchmark"}
        </button>
        {keResults.length > 0 && cipherResults.length > 0 && (
          <button onClick={downloadCSV} className="border border-brass text-brass px-4 py-2 rounded-lg">
            Export CSV
          </button>
        )}
        {progress && (
          <span className={`text-xs font-mono ${progress.startsWith("Error") ? "text-signal-danger" : "text-ink-500"}`}>
            {progress}
          </span>
        )}
      </div>

      {keResults.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl text-brass mb-3">Key Exchange Algorithms</h2>
          <div className="h-64 mb-4 bg-surface rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={keChartData}>
                <CartesianGrid stroke="#33364A" />
                <XAxis dataKey="name" tick={{ fill: "#B7B9CC", fontSize: 11 }} />
                <YAxis tick={{ fill: "#B7B9CC", fontSize: 11 }} label={{ value: "ms", fill: "#B7B9CC", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={{ background: "#1D1F2E", border: "1px solid #33364A" }} />
                <Legend />
                <Bar dataKey="Keygen (ms)" fill="#D4A24C" />
                <Bar dataKey="Exchange (ms)" fill="#5B7FDE" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3 className="text-sm text-ink-300 mb-2">Security level vs. keygen time</h3>
          <div className="h-64 mb-4 bg-surface rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke="#33364A" />
                <XAxis type="number" dataKey="securityBits" name="Security (bits)"
                  tick={{ fill: "#B7B9CC", fontSize: 11 }}
                  label={{ value: "Security (bits) — jittered to separate ties", fill: "#B7B9CC", position: "insideBottom", offset: -5 }} />
                <YAxis type="number" dataKey="timeMs" name="Keygen (ms)"
                  tick={{ fill: "#B7B9CC", fontSize: 11 }}
                  label={{ value: "Keygen (ms)", fill: "#B7B9CC", angle: -90, position: "insideLeft" }} />
                <ZAxis range={[130, 130]} />
                <Tooltip content={<ScatterTooltipContent timeLabel="Keygen" />} />
                <Legend />
                {(() => {
                  const jitter = jitterTiedPoints(keResults, (r) => r.securityBits);
                  return keResults.map((r, i) => (
                    <Scatter
                      key={r.id}
                      name={r.name}
                      data={[{
                        name: r.name,
                        securityBits: jitter.get(r.id),
                        trueSecurityBits: r.securityBits,
                        timeMs: r.keygenMs.mean,
                      }]}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ));
                })()}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-ink-500 border-b border-surface-line">
                <th className="py-2 pr-3">Algorithm</th>
                <th className="py-2 pr-3">Security</th>
                <th className="py-2 pr-3">Quantum-safe</th>
                <th className="py-2 pr-3">Keygen mean/median (ms)</th>
                <th className="py-2 pr-3">Keygen min–max (ms)</th>
                <th className="py-2 pr-3">Exchange mean/median (ms)</th>
                <th className="py-2 pr-3">Exchange min–max (ms)</th>
                <th className="py-2 pr-3">Correctness</th>
              </tr>
            </thead>
            <tbody>
              {keResults.map((r) => (
                <tr key={r.id} className="border-b border-surface-line/50">
                  <td className="py-2 pr-3">{r.name}</td>
                  <td className="py-2 pr-3">{r.securityBits}-bit</td>
                  <td className="py-2 pr-3">{r.quantumSafe ? "Yes" : "No"}</td>
                  <td className="py-2 pr-3 font-mono">{r.keygenMs.mean} / {r.keygenMs.median}</td>
                  <td className="py-2 pr-3 font-mono text-ink-500">{r.keygenMs.min}–{r.keygenMs.max}</td>
                  <td className="py-2 pr-3 font-mono">{r.exchangeMs.mean} / {r.exchangeMs.median}</td>
                  <td className="py-2 pr-3 font-mono text-ink-500">{r.exchangeMs.min}–{r.exchangeMs.max}</td>
                  <td className="py-2 pr-3 text-signal-success">{r.correctnessRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {cipherResults.length > 0 && (
        <section>
          <h2 className="text-xl text-brass mb-3">Symmetric Ciphers</h2>

          <div className="h-64 mb-4 bg-surface rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cipherChartData}>
                <CartesianGrid stroke="#33364A" />
                <XAxis dataKey="name" tick={{ fill: "#B7B9CC", fontSize: 11 }} />
                <YAxis tick={{ fill: "#B7B9CC", fontSize: 11 }} label={{ value: "ms", fill: "#B7B9CC", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={{ background: "#1D1F2E", border: "1px solid #33364A" }} />
                <Legend />
                <Bar dataKey="Encrypt 1KB (ms)" fill="#D4A24C" />
                <Bar dataKey="Decrypt 1KB (ms)" fill="#5B7FDE" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h3 className="text-sm text-ink-300 mb-2">Encryption time vs. message size (scaling)</h3>
          <div className="h-64 mb-4 bg-surface rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scalingChartData}>
                <CartesianGrid stroke="#33364A" />
                <XAxis dataKey="size" tick={{ fill: "#B7B9CC", fontSize: 11 }} />
                <YAxis tick={{ fill: "#B7B9CC", fontSize: 11 }} label={{ value: "ms", fill: "#B7B9CC", angle: -90, position: "insideLeft" }} />
                <Tooltip contentStyle={{ background: "#1D1F2E", border: "1px solid #33364A" }} />
                <Legend />
                {cipherResults.map((r, i) => (
                  <Line
                    key={r.id}
                    type="monotone"
                    dataKey={r.name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 className="text-sm text-ink-300 mb-2">Security level vs. encryption time (1KB)</h3>
          <div className="h-64 mb-4 bg-surface rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke="#33364A" />
                <XAxis type="number" dataKey="securityBits" name="Security (bits)"
                  tick={{ fill: "#B7B9CC", fontSize: 11 }}
                  label={{ value: "Security (bits) — jittered to separate ties", fill: "#B7B9CC", position: "insideBottom", offset: -5 }} />
                <YAxis type="number" dataKey="timeMs" name="Encrypt 1KB (ms)"
                  tick={{ fill: "#B7B9CC", fontSize: 11 }}
                  label={{ value: "Encrypt 1KB (ms)", fill: "#B7B9CC", angle: -90, position: "insideLeft" }} />
                <ZAxis range={[130, 130]} />
                <Tooltip content={<ScatterTooltipContent timeLabel="Encrypt 1KB" />} />
                <Legend />
                {(() => {
                  const jitter = jitterTiedPoints(cipherResults, (r) => r.securityBits);
                  return cipherResults.map((r, i) => (
                    <Scatter
                      key={r.id}
                      name={r.name}
                      data={[{
                        name: r.name,
                        securityBits: jitter.get(r.id),
                        trueSecurityBits: r.securityBits,
                        timeMs: r.bySize[1024]?.encryptMs.mean ?? 0,
                      }]}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ));
                })()}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {MESSAGE_SIZES.map((size) => (
            <div key={size} className="mb-6">
              <h3 className="text-sm text-ink-300 mb-2">Message size: {size.toLocaleString()} bytes</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-surface-line">
                    <th className="py-2 pr-3">Algorithm</th>
                    <th className="py-2 pr-3">Auth</th>
                    <th className="py-2 pr-3">Encrypt mean (ms)</th>
                    <th className="py-2 pr-3">Encrypt min–max (ms)</th>
                    <th className="py-2 pr-3">Decrypt mean (ms)</th>
                    <th className="py-2 pr-3">Decrypt min–max (ms)</th>
                    <th className="py-2 pr-3">Encrypt throughput (MB/s)</th>
                    <th className="py-2 pr-3">Correctness</th>
                    <th className="py-2 pr-3">Tamper detected</th>
                  </tr>
                </thead>
                <tbody>
                  {cipherResults.map((r) => (
                    <tr key={r.id} className="border-b border-surface-line/50">
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3">{r.authenticated ? "Yes" : "No"}</td>
                      <td className="py-2 pr-3 font-mono">{r.bySize[size].encryptMs.mean}</td>
                      <td className="py-2 pr-3 font-mono text-ink-500">{r.bySize[size].encryptMs.min}–{r.bySize[size].encryptMs.max}</td>
                      <td className="py-2 pr-3 font-mono">{r.bySize[size].decryptMs.mean}</td>
                      <td className="py-2 pr-3 font-mono text-ink-500">{r.bySize[size].decryptMs.min}–{r.bySize[size].decryptMs.max}</td>
                      <td className="py-2 pr-3 font-mono text-signal-success">{r.bySize[size].encryptThroughputMBs}</td>
                      <td className="py-2 pr-3 text-signal-success">{r.bySize[size].correctnessRate}%</td>
                      <td className="py-2 pr-3">{r.bySize[size].tamperDetectionRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}