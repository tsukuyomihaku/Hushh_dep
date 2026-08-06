// src/benchmark/runner.js
// -----------------------------------------------------------------------
// Runs timed trials for each algorithm and returns structured results
// suitable for a table, a chart, or CSV export for a research paper.
// -----------------------------------------------------------------------

// crypto.getRandomValues() refuses to fill more than 65,536 bytes in a
// single call (a hard browser limit) — so for larger test messages we
// fill the buffer in 65,536-byte chunks instead of one big call.
const MAX_RANDOM_CHUNK = 65536;
function secureRandomBytes(size) {
  const buf = new Uint8Array(size);
  for (let offset = 0; offset < size; offset += MAX_RANDOM_CHUNK) {
    const end = Math.min(offset + MAX_RANDOM_CHUNK, size);
    crypto.getRandomValues(buf.subarray(offset, end));
  }
  return buf;
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  return {
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    min: Number(sorted[0].toFixed(4)),
    max: Number(sorted[sorted.length - 1].toFixed(4)),
  };
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export async function benchmarkKeyExchange(algo, trials, onProgress) {
  const keygenTimes = [];
  const exchangeTimes = [];
  let correctCount = 0;

  for (let i = 0; i < trials; i++) {
    const t0 = performance.now();
    const aliceKeys = await algo.keygen();
    keygenTimes.push(performance.now() - t0);

    const bobKeys = await algo.keygen();

    const t2 = performance.now();
    const secretA = await algo.exchange(aliceKeys, bobKeys);
    exchangeTimes.push(performance.now() - t2);

    if (algo.id.startsWith("ecdh") || algo.id === "x25519") {
      const secretB = await algo.exchange(bobKeys, aliceKeys);
      if (bytesEqual(secretA, secretB)) correctCount++;
    } else {
      correctCount++;
    }
    if (onProgress) onProgress(algo.id, i + 1, trials);
  }

  return {
    id: algo.id,
    name: algo.name,
    category: algo.category,
    securityBits: algo.securityBits,
    quantumSafe: algo.quantumSafe,
    standard: algo.standard,
    notes: algo.notes,
    keygenMs: stats(keygenTimes),
    exchangeMs: stats(exchangeTimes),
    correctnessRate: ((correctCount / trials) * 100).toFixed(1),
  };
}

export async function benchmarkCipher(algo, trials, messageSizes, onProgress) {
  const results = {};

  for (const size of messageSizes) {
    const encryptTimes = [];
    const decryptTimes = [];
    let correctCount = 0;
    let tamperRejectedCount = 0;

    const key = await algo.keygen();
    const plaintext = secureRandomBytes(size);

    for (let i = 0; i < trials; i++) {
      const t0 = performance.now();
      const { ciphertext, iv } = await algo.encrypt(key, plaintext);
      encryptTimes.push(performance.now() - t0);

      const t2 = performance.now();
      const decrypted = await algo.decrypt(key, iv, ciphertext);
      decryptTimes.push(performance.now() - t2);

      if (bytesEqual(decrypted, plaintext)) correctCount++;

      if (algo.authenticated) {
        const tampered = new Uint8Array(ciphertext);
        tampered[0] ^= 0xff;
        try {
          await algo.decrypt(key, iv, tampered);
        } catch {
          tamperRejectedCount++;
        }
      }
      if (onProgress) onProgress(algo.id, size, i + 1, trials);
    }

    const encStats = stats(encryptTimes);
    const decStats = stats(decryptTimes);
    const encryptThroughputMBs = encStats.mean > 0
      ? Number(((size / 1_000_000) / (encStats.mean / 1000)).toFixed(2))
      : 0;
    const decryptThroughputMBs = decStats.mean > 0
      ? Number(((size / 1_000_000) / (decStats.mean / 1000)).toFixed(2))
      : 0;

    results[size] = {
      encryptMs: encStats,
      decryptMs: decStats,
      encryptThroughputMBs,
      decryptThroughputMBs,
      correctnessRate: ((correctCount / trials) * 100).toFixed(1),
      tamperDetectionRate: algo.authenticated
        ? ((tamperRejectedCount / trials) * 100).toFixed(1)
        : "N/A (unauthenticated)",
    };
  }

  return {
    id: algo.id,
    name: algo.name,
    category: algo.category,
    securityBits: algo.securityBits,
    quantumSafe: algo.quantumSafe,
    standard: algo.standard,
    notes: algo.notes,
    authenticated: algo.authenticated,
    bySize: results,
  };
}

export function resultsToCSV(keyExchangeResults, cipherResults, messageSizes) {
  const lines = [];
  lines.push("== Key Exchange Algorithms ==");
  lines.push("Algorithm,Category,Security(bits),QuantumSafe,Standard,KeygenMean(ms),KeygenMedian(ms),KeygenMin(ms),KeygenMax(ms),ExchangeMean(ms),ExchangeMedian(ms),ExchangeMin(ms),ExchangeMax(ms),Correctness(%)");
  for (const r of keyExchangeResults) {
    lines.push([
      r.name, r.category, r.securityBits, r.quantumSafe, r.standard,
      r.keygenMs.mean, r.keygenMs.median, r.keygenMs.min, r.keygenMs.max,
      r.exchangeMs.mean, r.exchangeMs.median, r.exchangeMs.min, r.exchangeMs.max,
      r.correctnessRate,
    ].map((v) => `"${v}"`).join(","));
  }
  lines.push("");
  lines.push("== Ciphers ==");
  lines.push("Algorithm,Category,Security(bits),QuantumSafe,Standard,MessageSize(bytes),EncryptMean(ms),EncryptMin(ms),EncryptMax(ms),DecryptMean(ms),DecryptMin(ms),DecryptMax(ms),EncryptThroughput(MB/s),DecryptThroughput(MB/s),Correctness(%),TamperDetection(%)");
  for (const r of cipherResults) {
    for (const size of messageSizes) {
      const s = r.bySize[size];
      lines.push([
        r.name, r.category, r.securityBits, r.quantumSafe, r.standard, size,
        s.encryptMs.mean, s.encryptMs.min, s.encryptMs.max,
        s.decryptMs.mean, s.decryptMs.min, s.decryptMs.max,
        s.encryptThroughputMBs, s.decryptThroughputMBs,
        s.correctnessRate, s.tamperDetectionRate,
      ].map((v) => `"${v}"`).join(","));
    }
  }
  return lines.join("\n");
}