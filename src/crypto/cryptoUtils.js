// src/crypto/cryptoUtils.js
// -----------------------------------------------------------------------
// Implements the cryptographic architecture from the Hushh! proposal:
// ECDH (P-256) key exchange -> HKDF -> AES-256-GCM, entirely through the
// browser's native Web Crypto API (window.crypto.subtle). Private keys are
// generated as non-extractable CryptoKey objects and never leave the
// browser or touch the network.
// -----------------------------------------------------------------------

// src/crypto/cryptoUtils.js
const bufToBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const base64ToBuf = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

// Step 1 — Registration: generate an ECDH key pair.
// extractable is true so the private key can be exported to sessionStorage
// and survive a page reload / tab suspend.
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
  const publicJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { privateKey: keyPair.privateKey, publicJwk };
}

export async function exportPrivateKey(privateKey) {
  return window.crypto.subtle.exportKey("jwk", privateKey);
}

export async function importPrivateKey(jwk) {
  return window.crypto.subtle.importKey(
    "jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]
  );
}

export async function importPublicKey(jwk) {
  return window.crypto.subtle.importKey(
    "jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, []
  );
}

// Step 2 — Key exchange: derive the shared AES-256 key locally (ECDH -> HKDF)
export async function deriveSharedKey(privateKey, theirPublicKey) {
  return window.crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Step 3 — Send: AES-256-GCM encrypt with a fresh random 96-bit IV per message
export async function encryptMessage(sharedKey, plaintext) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, sharedKey, encoded
  );
  return { ciphertext: bufToBase64(ciphertextBuf), iv: bufToBase64(iv) };
}

// Step 4 — Receive: AES-256-GCM decrypt; throws OperationError on tag mismatch
export async function decryptMessage(sharedKey, ciphertextB64, ivB64) {
  const ciphertextBuf = base64ToBuf(ciphertextB64);
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const plaintextBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, sharedKey, ciphertextBuf
  );
  return new TextDecoder().decode(plaintextBuf);
}

// Step 5 — Attacker simulation: attempt decrypt with a bogus key
export async function attemptDecryptWithWrongKey(ciphertextB64, ivB64) {
  const bogusKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
  try {
    await decryptMessage(bogusKey, ciphertextB64, ivB64);
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.name || "OperationError" };
  }
}

export async function fingerprintFromJwk(jwk) {
  const data = new TextEncoder().encode(jwk.x + jwk.y);
  const hashBuf = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf));
}