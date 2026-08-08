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

// The real send path (cryptoUtils.encryptMessage) never encrypts raw random
// bytes — it TextEncoder-encodes an actual chat message string. Random
// bytes are maximum-entropy and uniformly distributed across 0–255, while
// real messages are UTF-8 text: mostly ASCII, repetitive, much lower
// entropy. That difference doesn't change correctness (AES-GCM etc. don't
// care what the input looks like), but it does mean a benchmark built on
// random bytes isn't actually measuring "message" encryption — so cipher
// trials build their plaintext from realistic chat text instead.
const SAMPLE_MESSAGES = [
  "Hey, are you free to talk later tonight? ",
  "I just sent over the files, let me know if anything's missing. ",
  "Can we push the meeting to 3pm instead? ",
  "Thanks so much for helping me out earlier, really appreciate it. ",
  "Did you see the game last night? That final play was insane. ",
  "Sure, that works for me — see you then. ",
  "Sorry for the late reply, been swamped with work all day. ",
  "Let's grab coffee sometime this week if you're around. ",
  "I'll call you as soon as I'm done with this. ",
  "No worries at all, take your time, there's no rush. ",
];

function realisticMessageBytes(size, corpus) {
  const source = corpus && corpus.length ? corpus : SAMPLE_MESSAGES;
  const encoder = new TextEncoder();
  let text = "";
  let i = 0;
  while (encoder.encode(text).length < size) {
    text += source[i % source.length] + " ";
    i++;
  }
  let encoded = encoder.encode(text);
  if (encoded.length > size) {
    encoded = encoded.slice(0, size);
    // Trimming to an exact byte count can land mid-way through a multi-byte
    // UTF-8 character; back off one byte at a time until it's valid again.
    while (encoded.length > 0) {
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(encoded);
        break;
      } catch {
        encoded = encoded.slice(0, -1);
      }
    }
  }
  return encoded;
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

// A handful of untimed "throwaway" calls before measurement starts. JS
// engines run new code interpreted/unoptimized at first and only compile it
// to fast machine code after it's been called several times — without a
// warm-up, the first few timed trials measure that slow unoptimized path
// and skew the average, especially at low trial counts.
const WARMUP_ITERATIONS = 5;

export async function benchmarkKeyExchange(algo, trials, onProgress) {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    const a = await algo.keygen();
    const b = await algo.keygen();
    await algo.exchange(a, b);
  }

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

    // Same reasoning as the cipher benchmark: yield back to the browser
    // between trials so a long run of RSA/ML-KEM keygens doesn't make the
    // tab feel frozen.
    await new Promise((resolve) => setTimeout(resolve, 0));
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

export async function benchmarkCipher(algo, trials, messageSizes, onProgress, customCorpus) {
  const results = {};

  for (const size of messageSizes) {
    const encryptTimes = [];
    const decryptTimes = [];
    let correctCount = 0;
    let tamperRejectedCount = 0;

    const key = await algo.keygen();
    const plaintext = realisticMessageBytes(size, customCorpus);

    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      const { ciphertext, iv } = await algo.encrypt(key, plaintext);
      await algo.decrypt(key, iv, ciphertext);
    }

    // Browsers deliberately reduce performance.now()'s resolution (a
    // Spectre-attack mitigation), so a single fast operation — e.g.
    // AES-256-GCM encrypting 1KB — often measures as exactly 0ms no
    // matter how many trials run. Timing a BATCH of repetitions together
    // and dividing by the batch size averages out below the timer's
    // resolution. This is only actually needed for small/fast payloads —
    // a single 100KB operation already takes measurable time on its own
    // (slow legacy algorithms like 3DES can take tens of ms even once),
    // so batching there would only multiply already-long runtimes for no
    // precision benefit. Batch size scales down as message size grows.
    const BATCH_SIZE = size <= 1024 ? 30 : 1;

    for (let i = 0; i < trials; i++) {
      const tEnc0 = performance.now();
      let lastCiphertext, lastIv;
      for (let b = 0; b < BATCH_SIZE; b++) {
        const { ciphertext, iv } = await algo.encrypt(key, plaintext);
        lastCiphertext = ciphertext;
        lastIv = iv;
      }
      encryptTimes.push((performance.now() - tEnc0) / BATCH_SIZE);

      const tDec0 = performance.now();
      let decrypted;
      for (let b = 0; b < BATCH_SIZE; b++) {
        decrypted = await algo.decrypt(key, lastIv, lastCiphertext);
      }
      decryptTimes.push((performance.now() - tDec0) / BATCH_SIZE);

      if (bytesEqual(decrypted, plaintext)) correctCount++;

      if (algo.authenticated) {
        const tampered = new Uint8Array(lastCiphertext);
        tampered[0] ^= 0xff;
        try {
          await algo.decrypt(key, lastIv, tampered);
        } catch {
          tamperRejectedCount++;
        }
      }
      if (onProgress) onProgress(algo.id, size, i + 1, trials);

      // Explicitly yield back to the browser between trials. A long run
      // of back-to-back awaited crypto calls can still starve rendering —
      // this hands control back to the browser (letting the progress text
      // repaint, and keeping the tab from feeling frozen) before the next
      // trial starts.
      await new Promise((resolve) => setTimeout(resolve, 0));
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