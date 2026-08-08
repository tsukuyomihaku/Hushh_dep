import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { generateKeyPair, exportPrivateKey, importPrivateKey } from "../crypto/cryptoUtils";

const AuthContext = createContext(null);
const storageKey = (uid) => `hushh_privkey_${uid}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setEmailVerified(!!firebaseUser?.emailVerified);
      if (firebaseUser) {
        const saved = localStorage.getItem(storageKey(firebaseUser.uid));
        if (saved) {
          try {
            setPrivateKey(await importPrivateKey(JSON.parse(saved)));
          } catch {
            setPrivateKey(null);
          }
        }
      } else {
        setPrivateKey(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function persistKeyPair(uid, privKey) {
    const jwk = await exportPrivateKey(privKey);
    localStorage.setItem(storageKey(uid), JSON.stringify(jwk));
  }

  async function register(email, password, displayName) {
    setError("");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    setEmailVerified(false);
    const { privateKey: newPrivateKey, publicJwk } = await generateKeyPair();
    setPrivateKey(newPrivateKey);
    await persistKeyPair(cred.user.uid, newPrivateKey);
    await setDoc(doc(db, "users", cred.user.uid), {
      displayName: displayName || email.split("@")[0],
      email,
      publicKey: publicJwk,
      createdAt: serverTimestamp(),
    });
    return cred.user;
  }

  async function login(email, password) {
    setError("");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const saved = localStorage.getItem(storageKey(cred.user.uid));
    if (saved) {
      try {
        setPrivateKey(await importPrivateKey(JSON.parse(saved)));
        return cred.user;
      } catch {
        // fall through
      }
    }
    const { privateKey: newPrivateKey, publicJwk } = await generateKeyPair();
    setPrivateKey(newPrivateKey);
    await persistKeyPair(cred.user.uid, newPrivateKey);
    await setDoc(doc(db, "users", cred.user.uid), { publicKey: publicJwk }, { merge: true });
    return cred.user;
  }

  async function logout() {
    // Intentionally NOT removing the localStorage-persisted key here.
    // It needs to survive logout so that logging back into this same
    // account later restores the same identity key instead of silently
    // generating a new one and breaking every existing conversation.
    setPrivateKey(null);
    await signOut(auth);
  }

  // Manual recovery: generate a fresh key pair and push its public half to
  // the server, making THIS browser the authoritative one for this account.
  // Use this after an identity mismatch (this browser's key doesn't match
  // the server) — e.g. because the same account was previously logged into
  // a different browser/device that overwrote the server-side key. Every
  // message ever sent under the old key becomes unreadable after this, same
  // as any key rotation — there's no way around that for an E2E system.
  async function regenerateKeys() {
    if (!user) return;
    const { privateKey: newPrivateKey, publicJwk } = await generateKeyPair();
    setPrivateKey(newPrivateKey);
    await persistKeyPair(user.uid, newPrivateKey);
    await setDoc(doc(db, "users", user.uid), { publicKey: publicJwk }, { merge: true });
  }

  // Resend the verification email (e.g. if the first one landed in spam or
  // the person didn't get to it in time).
  async function resendVerification() {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }

  // Firebase's cached user object doesn't auto-update after the person
  // clicks the link in their inbox — reload() re-fetches the account's
  // current state from the server so we can tell whether it's actually
  // verified yet.
  async function refreshEmailVerification() {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const verified = auth.currentUser.emailVerified;
    setEmailVerified(verified);
    return verified;
  }

  const value = {
    user, privateKey, loading, error, setError, register, login, logout, regenerateKeys,
    emailVerified, resendVerification, refreshEmailVerification,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}