// src/benchmark/algorithms/index.js
// -----------------------------------------------------------------------
// Aggregates each individually-defined algorithm module into the two
// arrays the benchmark runner and page consume. Add a new algorithm to
// the comparison by writing one new file and adding one import/entry here
// — nothing else in the benchmark suite needs to change.
// -----------------------------------------------------------------------
import ecdhP256 from "./keyexchange/ecdhP256.js";
import ecdhP384 from "./keyexchange/ecdhP384.js";
import x25519 from "./keyexchange/x25519.js";
import rsaOaep from "./keyexchange/rsaOaep.js";
import mlkem768 from "./keyexchange/mlkem768.js";

import aes256gcm from "./ciphers/aes256gcm.js";
import aes128gcm from "./ciphers/aes128gcm.js";
import chacha20poly1305 from "./ciphers/chacha20poly1305.js";
import aes256cbc from "./ciphers/aes256cbc.js";
import tripleDesCbc from "./ciphers/tripleDesCbc.js";

export const keyExchangeAlgorithms = [ecdhP256, ecdhP384, x25519, rsaOaep, mlkem768];
export const cipherAlgorithms = [aes256gcm, aes128gcm, chacha20poly1305, aes256cbc, tripleDesCbc];
