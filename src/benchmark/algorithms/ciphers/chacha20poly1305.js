// src/benchmark/algorithms/ciphers/chacha20poly1305.js
// -----------------------------------------------------------------------
// ChaCha20-Poly1305 — AES's main real-world rival; used in TLS 1.3 and
// WireGuard. Often faster than AES on devices without hardware AES
// acceleration. NOT in the Web Crypto API; requires @noble/ciphers.
// -----------------------------------------------------------------------
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from "@noble/ciphers/utils.js";

const chacha20Poly1305Algo = {
  id: "chacha20-poly1305",
  name: "ChaCha20-Poly1305",
  category: "Authenticated (AEAD)",
  securityBits: 256,
  quantumSafe: false,
  standard: "RFC 8439",
  notes: "AES's main rival; used in TLS 1.3 and WireGuard. Faster on devices without hardware AES acceleration.",
  authenticated: true,

  async keygen() {
    return randomBytes(32);
  },

  async encrypt(key, plaintext) {
    const nonce = randomBytes(12);
    const cipher = chacha20poly1305(key, nonce);
    return { ciphertext: cipher.encrypt(plaintext), iv: nonce };
  },

  async decrypt(key, iv, ciphertext) {
    const cipher = chacha20poly1305(key, iv);
    return cipher.decrypt(ciphertext);
  },
};

export default chacha20Poly1305Algo;
