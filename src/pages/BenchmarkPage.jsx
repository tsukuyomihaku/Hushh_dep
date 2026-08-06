import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { keyExchangeAlgorithms, cipherAlgorithms } from "../benchmark/algorithms";
import { benchmarkKeyExchange, benchmarkCipher, resultsToCSV } from "../benchmark/runner";

const MESSAGE_SIZES = [16, 1024, 102400]; // 16B, 1KB, 100KB

export default function BenchmarkPage() {
  const [trials, setTrials] = useState(20);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [keResults, setKeResults] = useState([]);
  const [cipherResults, setCipherResults] = useState([]);

  async function runAll() {
    setRunning(true);
    setKeResults([]);
    setCipherResults([]);

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
    for (const algo of cipherAlgorithms) {
      setProgress(`Cipher: ${algo.name}…`);
      const r = await benchmarkCipher(algo, trials, MESSAGE_SIZES, (id, size, i, t) =>
        setProgress(`Cipher: ${algo.name} — ${size}B (${i}/${t})`)
      );
      cOut.push(r);
      setCipherResults([...cOut]);
    }

    setProgress("Done.");
    setRunning(false);
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
    name: r.name,
    "Keygen (ms)": r.keygenMs.mean,
    "Exchange (ms)": r.exchangeMs.mean,
  }));

  const cipherChartData = cipherResults.map((r) => ({
    name: r.name,
    "Encrypt 1KB (ms)": r.bySize[1024]?.encryptMs.mean ?? 0,
    "Decrypt 1KB (ms)": r.bySize[1024]?.decryptMs.mean ?? 0,
  }));

  return (
    <div className="min-h-screen bg-void text-ink-100 p-8 font-body">
      <h1 className="font-display text-3xl text-brass mb-2">Cryptographic Algorithm Benchmark</h1>
      <p className="text-ink-500 text-sm mb-6">
        Speed, correctness, and security comparison for the research paper. All operations run
        client-side in this browser via the Web Crypto API and audited JS libraries.
      </p>

      <div className="flex items-center gap-4 mb-8">
        <label className="text-sm text-ink-300">
          Trials per algorithm:
          <input
            type="number"
            min={1}
            max={200}
            value={trials}
            onChange={(e) => setTrials(Number(e.target.value))}
            className="ml-2 w-20 bg-surface border border-surface-line rounded px-2 py-1 text-ink-100"
          />
        </label>
        <button
          onClick={runAll}
          disabled={running}
          className="bg-brass text-void font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {running ? "Running…" : "Run Benchmark"}
        </button>
        {keResults.length > 0 && cipherResults.length > 0 && (
          <button
            onClick={downloadCSV}
            className="border border-brass text-brass px-4 py-2 rounded-lg"
          >
            Export CSV
          </button>
        )}
        {progress && <span className="text-xs font-mono text-ink-500">{progress}</span>}
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
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-ink-500 border-b border-surface-line">
                <th className="py-2 pr-3">Algorithm</th>
                <th className="py-2 pr-3">Security</th>
                <th className="py-2 pr-3">Quantum-safe</th>
                <th className="py-2 pr-3">Keygen mean/median (ms)</th>
                <th className="py-2 pr-3">Exchange mean/median (ms)</th>
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
                  <td className="py-2 pr-3 font-mono">{r.exchangeMs.mean} / {r.exchangeMs.median}</td>
                  <td className="py-2 pr-3 text-signal-success">{r.correctnessRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {cipherResults.length > 0 && (
        <section>
          <h2 className="text-xl text-brass mb-3">Symmetric Ciphers (1 KB message)</h2>
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
          {MESSAGE_SIZES.map((size) => (
            <div key={size} className="mb-6">
              <h3 className="text-sm text-ink-300 mb-2">Message size: {size.toLocaleString()} bytes</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-surface-line">
                    <th className="py-2 pr-3">Algorithm</th>
                    <th className="py-2 pr-3">Authenticated</th>
                    <th className="py-2 pr-3">Encrypt mean (ms)</th>
                    <th className="py-2 pr-3">Decrypt mean (ms)</th>
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
                      <td className="py-2 pr-3 font-mono">{r.bySize[size].decryptMs.mean}</td>
                      <td className="py-2 pr-3 text-signal-success">{r.bySize[size].correctnessRate}%</td>
                      <td className="py-2 pr-3">{r.bySize[size].tamperDetectionRate}{typeof r.bySize[size].tamperDetectionRate === "string" && r.bySize[size].tamperDetectionRate.endsWith("%") ? "" : ""}</td>
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
