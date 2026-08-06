// src/benchmark/algorithms/keyexchange/rsaOaep.js
// -----------------------------------------------------------------------
// RSA-OAEP (2048-bit) — legacy asymmetric baseline. Not a true
// Diffie-Hellman-style exchange: the sender generates a random secret and
// wraps (encrypts) it directly with the recipient's public key, which is
// the standard real-world equivalent operation for RSA-based systems.
// Browser-native via Web Crypto API.
// -----------------------------------------------------------------------

const rsaOaep2048 = {
  id: "rsa-oaep-2048",
  name: "RSA-OAEP (2048-bit)",
  category: "Integer Factorization",
  securityBits: 112,
  quantumSafe: false,
  standard: "PKCS#1 / Web Crypto API",
  notes: "Legacy baseline. Sender wraps a random secret with the recipient's public key rather than performing classic Diffie-Hellman.",

  async keygen() {
    return crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
  },

  async exchange(myKeyPair, theirKeyPair) {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const wrapped = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      theirKeyPair.publicKey,
      secret
    );
    const unwrapped = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      theirKeyPair.privateKey,
      wrapped
    );
    return new Uint8Array(unwrapped);
  },
};

export default rsaOaep2048;
