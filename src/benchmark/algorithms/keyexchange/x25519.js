// src/benchmark/algorithms/keyexchange/x25519.js
// -----------------------------------------------------------------------
// X25519 (Curve25519) key exchange — used by Signal and WireGuard.
// NOT part of the Web Crypto API; requires the @noble/curves library.
// -----------------------------------------------------------------------
import { x25519 } from "@noble/curves/ed25519.js";

const x25519Algo = {
  id: "x25519",
  name: "X25519 (Curve25519)",
  category: "Elliptic Curve Diffie-Hellman",
  securityBits: 128,
  quantumSafe: false,
  standard: "RFC 7748",
  notes: "Used by Signal and WireGuard. Requires @noble/curves (not in Web Crypto API).",

  async keygen() {
    const secretKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(secretKey);
    return { secretKey, publicKey };
  },

  async exchange(myKeyPair, theirKeyPair) {
    return x25519.getSharedSecret(myKeyPair.secretKey, theirKeyPair.publicKey);
  },
};

export default x25519Algo;
