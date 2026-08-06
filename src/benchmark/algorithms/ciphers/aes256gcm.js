// src/benchmark/algorithms/ciphers/aes256gcm.js
// -----------------------------------------------------------------------
// AES-256-GCM — the same authenticated cipher used in Hushh!'s production
// messaging pipeline (see src/crypto/cryptoUtils.js). Browser-native,
// hardware-accelerated via the Web Crypto API.
// -----------------------------------------------------------------------

const aes256gcm = {
  id: "aes-256-gcm",
  name: "AES-256-GCM",
  category: "Authenticated (AEAD)",
  securityBits: 256,
  quantumSafe: false,
  standard: "NIST FIPS 197 + SP 800-38D / Web Crypto API",
  notes: "Used in the Hushh! production pipeline.",
  authenticated: true,

  async keygen() {
    return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  },

  async encrypt(key, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
    return { ciphertext: new Uint8Array(ct), iv };
  },

  async decrypt(key, iv, ciphertext) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new Uint8Array(pt);
  },
};

export default aes256gcm;
