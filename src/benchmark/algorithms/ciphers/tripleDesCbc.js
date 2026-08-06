// src/benchmark/algorithms/ciphers/tripleDesCbc.js
// -----------------------------------------------------------------------
// 3DES-CBC — a deliberately outdated legacy baseline, deprecated by NIST
// in 2023. NOT supported by the Web Crypto API; uses crypto-js.
// -----------------------------------------------------------------------
import CryptoJS from "crypto-js";

function bufToWordArray(buf) {
  return CryptoJS.lib.WordArray.create(buf);
}
function wordArrayToBuf(wa) {
  const words = wa.words;
  const sigBytes = wa.sigBytes;
  const bytes = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return bytes;
}

const tripleDesCbc = {
  id: "3des-cbc",
  name: "3DES-CBC (legacy)",
  category: "Confidentiality only — NOT authenticated",
  securityBits: 112,
  quantumSafe: false,
  standard: "NIST SP 800-67 (deprecated 2023)",
  notes: "Deliberately outdated baseline. Not supported by Web Crypto API; uses crypto-js.",
  authenticated: false,

  async keygen() {
    return CryptoJS.lib.WordArray.random(24); // 192-bit, 112-bit effective
  },

  async encrypt(key, plaintext) {
    const iv = CryptoJS.lib.WordArray.random(8);
    const wa = bufToWordArray(plaintext);
    const encrypted = CryptoJS.TripleDES.encrypt(wa, key, { iv, mode: CryptoJS.mode.CBC });
    return { ciphertext: wordArrayToBuf(encrypted.ciphertext), iv: wordArrayToBuf(iv) };
  },

  async decrypt(key, iv, ciphertext) {
    const ctParams = CryptoJS.lib.CipherParams.create({ ciphertext: bufToWordArray(ciphertext) });
    const decrypted = CryptoJS.TripleDES.decrypt(ctParams, key, { iv: bufToWordArray(iv), mode: CryptoJS.mode.CBC });
    return wordArrayToBuf(decrypted);
  },
};

export default tripleDesCbc;
