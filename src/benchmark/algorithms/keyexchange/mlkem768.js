// src/benchmark/algorithms/keyexchange/mlkem768.js
// -----------------------------------------------------------------------
// ML-KEM-768 (formerly CRYSTALS-Kyber) — NIST's standardized post-quantum
// Key Encapsulation Mechanism (FIPS 203, 2024). The only quantum-resistant
// algorithm in this comparison. Requires the mlkem library.
// -----------------------------------------------------------------------
import { createMlKem768 } from "mlkem";

const mlkem768 = {
  id: "mlkem768",
  name: "ML-KEM-768 (Kyber, Post-Quantum)",
  category: "Lattice-based (post-quantum)",
  securityBits: 192,
  quantumSafe: true,
  standard: "NIST FIPS 203 (2024)",
  notes: "The only quantum-resistant scheme in this comparison. Requires the mlkem library (not in Web Crypto API).",

  async keygen() {
    const kem = await createMlKem768();
    const [publicKey, secretKey] = kem.generateKeyPair();
    return { kem, publicKey, secretKey };
  },

  // ML-KEM is a KEM, not classic Diffie-Hellman: the sender "encapsulates"
  // a fresh shared secret using the recipient's public key; the recipient
  // "decapsulates" it with their secret key.
  async exchange(myKeyPair, theirKeyPair) {
    const [ciphertext, sharedSecret] = await myKeyPair.kem.encap(theirKeyPair.publicKey);
    await myKeyPair.kem.decap(ciphertext, theirKeyPair.secretKey);
    return sharedSecret;
  },
};

export default mlkem768;
