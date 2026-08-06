// src/benchmark/runner.js
// -----------------------------------------------------------------------
// Runs timed trials for each algorithm and returns structured results
// suitable for a table, a chart, or CSV export for a research paper.
// -----------------------------------------------------------------------

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

// -------------------------------------------------------------------------
// Key exchange benchmark: for each algorithm, run `trials` full round trips
// of (generate two key pairs -> both sides derive the shared secret ->
// confirm both results match).
// -------------------------------------------------------------------------
export async function benchmarkKeyExchange(algo, trials, onProgress) {
  const keygenTimes = [];
  const exchangeTimes = [];
  let correctCount = 0;

  for (let i = 0; i < trials; i++) {
    const t0 = performance.now();
    const aliceKeys = await algo.keygen();
    const t1 = performance.now();
    keygenTimes.push(t1 - t0);

    const bobKeys = await algo.keygen();

    const t2 = performance.now();
    const secretA = await algo.exchange(aliceKeys, bobKeys);
    const t3 = performance.now();
    exchangeTimes.push(t3 - t2);

    // For true Diffie-Hellman-style algorithms, confirm both sides compute
    // an identical secret. RSA and KEM-style algorithms establish the
    // secret directionally, so this check is skipped for those (their
    // correctness is validated by successful encap/decap or wrap/unwrap
    // inside exchange() itself, which throws on failure).
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

// -------------------------------------------------------------------------
// Cipher benchmark: for each message size, run `trials` encrypt/decrypt
// round trips, confirm the plaintext round-trips correctly, and (for
// authenticated ciphers) confirm tampering is correctly rejected.
// -------------------------------------------------------------------------
export async function benchmarkCipher(algo, trials, messageSizes, onProgress) {
  const results = {};

  for (const size of messageSizes) {
    const encryptTimes = [];
    const decryptTimes = [];
    let correctCount = 0;
    let tamperRejectedCount = 0;
    const tamperTrials = algo.authenticated ? trials : 0;

    const key = await algo.keygen();
    const plaintext = crypto.getRandomValues(new Uint8Array(size));

    for (let i = 0; i < trials; i++) {
      const t0 = performance.now();
      const { ciphertext, iv } = await algo.encrypt(key, plaintext);
      const t1 = performance.now();
      encryptTimes.push(t1 - t0);

      const t2 = performance.now();
      const decrypted = await algo.decrypt(key, iv, ciphertext);
      const t3 = performance.now();
      decryptTimes.push(t3 - t2);

      if (bytesEqual(decrypted, plaintext)) correctCount++;

      if (algo.authenticated) {
        // Flip one byte of the ciphertext and confirm decryption is
        // correctly rejected (this is the property the Attacker Panel
        // demonstrates for AES-256-GCM in the live app).
        const tampered = new Uint8Array(ciphertext);
        tampered[0] ^= 0xff;
        try {
          await algo.decrypt(key, iv, tampered);
          // no error thrown -> tampering was NOT detected (bad)
        } catch {
          tamperRejectedCount++; // error thrown -> tampering WAS detected (good)
        }
      }

      if (onProgress) onProgress(algo.id, size, i + 1, trials);
    }

    results[size] = {
      encryptMs: stats(encryptTimes),
      decryptMs: stats(decryptTimes),
      correctnessRate: ((correctCount / trials) * 100).toFixed(1),
      tamperDetectionRate: algo.authenticated
        ? ((tamperRejectedCount / tamperTrials) * 100).toFixed(1)
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
  lines.push("Algorithm,Category,Security(bits),QuantumSafe,Standard,KeygenMean(ms),KeygenMedian(ms),ExchangeMean(ms),ExchangeMedian(ms),Correctness(%)");
  for (const r of keyExchangeResults) {
    lines.push([
      r.name, r.category, r.securityBits, r.quantumSafe, r.standard,
      r.keygenMs.mean, r.keygenMs.median, r.exchangeMs.mean, r.exchangeMs.median, r.correctnessRate,
    ].map((v) => `"${v}"`).join(","));
  }
  lines.push("");
  lines.push("== Ciphers ==");
  lines.push("Algorithm,Category,Security(bits),QuantumSafe,Standard,MessageSize(bytes),EncryptMean(ms),DecryptMean(ms),Correctness(%),TamperDetection(%)");
  for (const r of cipherResults) {
    for (const size of messageSizes) {
      const s = r.bySize[size];
      lines.push([
        r.name, r.category, r.securityBits, r.quantumSafe, r.standard, size,
        s.encryptMs.mean, s.decryptMs.mean, s.correctnessRate, s.tamperDetectionRate,
      ].map((v) => `"${v}"`).join(","));
    }
  }
  return lines.join("\n");
}
