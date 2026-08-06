// src/benchmark/algorithms/ciphers/aes256cbc.js
// -----------------------------------------------------------------------
// AES-256-CBC — a deliberate NEGATIVE baseline. It encrypts correctly but
// provides NO tamper detection, unlike GCM/Poly1305. Included specifically
// to demonstrate, empirically, why authenticated encryption modes matter.
// Browser-native via the Web Crypto API.
// -----------------------------------------------------------------------

const aes256cbc = {
  id: "aes-256-cbc",
  name: "AES-256-CBC (unauthenticated)",
  category: "Confidentiality only — NOT authenticated",
  securityBits: 256,
  quantumSafe: false,
  standard: "NIST SP 800-38A / Web Crypto API",
  notes: "Negative baseline: encrypts but does not detect tampering. Demonstrates why authenticated modes matter.",
  authenticated: false,

  async keygen() {
    return crypto.subtle.generateKey({ name: "AES-CBC", length: 256 }, true, ["encrypt", "decrypt"]);
  },

  async encrypt(key, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const ct = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, plaintext);
    return { ciphertext: new Uint8Array(ct), iv };
  },

  async decrypt(key, iv, ciphertext) {
    const pt = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ciphertext);
    return new Uint8Array(pt);
  },
};

export default aes256cbc;
