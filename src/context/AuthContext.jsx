import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const saved = sessionStorage.getItem(storageKey(firebaseUser.uid));
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
    sessionStorage.setItem(storageKey(uid), JSON.stringify(jwk));
  }

  async function register(email, password, displayName) {
    setError("");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
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
    const saved = sessionStorage.getItem(storageKey(cred.user.uid));
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
    if (user) sessionStorage.removeItem(storageKey(user.uid));
    setPrivateKey(null);
    await signOut(auth);
  }

  const value = { user, privateKey, loading, error, setError, register, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}