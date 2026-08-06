// src/benchmark/algorithms/keyexchange/ecdhP256.js
// -----------------------------------------------------------------------
// ECDH key exchange using the NIST P-256 curve — the same algorithm used
// in Hushh!'s production messaging pipeline (see src/crypto/cryptoUtils.js).
// Browser-native via Web Crypto API; no external library required.
// -----------------------------------------------------------------------

const ecdhP256 = {
  id: "ecdh-p256",
  name: "ECDH (P-256)",
  category: "Elliptic Curve Diffie-Hellman",
  securityBits: 128,
  quantumSafe: false,
  standard: "NIST FIPS 186-4 / Web Crypto API",
  notes: "Used in the Hushh! production pipeline. Browser-native, no external library.",

  async keygen() {
    return crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );
  },

  async exchange(myKeyPair, theirKeyPair) {
    const bits = await crypto.subtle.deriveBits(
      { name: "ECDH", public: theirKeyPair.publicKey },
      myKeyPair.privateKey,
      256
    );
    return new Uint8Array(bits);
  },
};

export default ecdhP256;
