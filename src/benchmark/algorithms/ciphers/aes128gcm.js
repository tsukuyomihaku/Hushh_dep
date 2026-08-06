// src/benchmark/algorithms/ciphers/aes128gcm.js
// -----------------------------------------------------------------------
// AES-128-GCM — isolates the pure timing/security cost of key size versus
// AES-256-GCM. Browser-native via the Web Crypto API.
// -----------------------------------------------------------------------

const aes128gcm = {
  id: "aes-128-gcm",
  name: "AES-128-GCM",
  category: "Authenticated (AEAD)",
  securityBits: 128,
  quantumSafe: false,
  standard: "NIST FIPS 197 + SP 800-38D / Web Crypto API",
  notes: "Isolates the pure cost of key size vs. AES-256-GCM.",
  authenticated: true,

  async keygen() {
    return crypto.subtle.generateKey({ name: "AES-GCM", length: 128 }, true, ["encrypt", "decrypt"]);
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

export default aes128gcm;
