// src/benchmark/algorithms/keyexchange/ecdhP384.js
// -----------------------------------------------------------------------
// ECDH key exchange using the NIST P-384 curve — a higher security-margin
// curve than P-256, still browser-native via Web Crypto API.
// -----------------------------------------------------------------------

const ecdhP384 = {
  id: "ecdh-p384",
  name: "ECDH (P-384)",
  category: "Elliptic Curve Diffie-Hellman",
  securityBits: 192,
  quantumSafe: false,
  standard: "NIST FIPS 186-4 / Web Crypto API",
  notes: "Higher security margin curve than P-256; browser-native.",

  async keygen() {
    return crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-384" },
      true,
      ["deriveBits"]
    );
  },

  async exchange(myKeyPair, theirKeyPair) {
    const bits = await crypto.subtle.deriveBits(
      { name: "ECDH", public: theirKeyPair.publicKey },
      myKeyPair.privateKey,
      384
    );
    return new Uint8Array(bits);
  },
};

export default ecdhP384;
