import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, getDocs, doc, getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  importPublicKey, deriveSharedKey, encryptMessage, decryptMessage, fingerprintFromJwk,
  exportPrivateKey,
} from "../crypto/cryptoUtils";
import Sidebar from "../components/Sidebar";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import AttackerPanel from "../components/AttackerPanel";
import Identicon from "../components/Identicon";

export default function ChatPage() {
  const { user, privateKey, logout, regenerateKeys } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [sharedKey, setSharedKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [justSentIds, setJustSentIds] = useState(new Set());
  const [attackerOpen, setAttackerOpen] = useState(false);
  const [currentFingerprint, setCurrentFingerprint] = useState(null);
  // Diagnostic: does the private key stored in THIS browser actually match
  // the public key currently on the server for this account? If not,
  // decryption will fail for reasons that have nothing to do with the
  // conversation partner — see the identity-check effect below.
  const [identityCheck, setIdentityCheck] = useState(null);
  // contactId -> { at: millis, fromThem: bool } — most recent activity per conversation
  const [lastActivity, setLastActivity] = useState({});
  // contactId -> millis of the last time that conversation was viewed
  const [readState, setReadState] = useState({});
  const bottomRef = useRef(null);

  // Load every other registered user as a potential contact.
  useEffect(() => {
    async function loadContacts() {
      try {
        const snap = await getDocs(collection(db, "users"));
        const list = [];
        for (const d of snap.docs) {
          if (d.id === user.uid) {
            setCurrentFingerprint(await fingerprintFromJwk(d.data().publicKey));
            continue;
          }
          const data = d.data();
          // Accounts created before verifying their email (or never
          // verified at all — e.g. a fake/unreachable address) shouldn't
          // show up as a contact anyone can message. Docs created before
          // this field existed have emailVerified === undefined, which is
          // also correctly excluded here.
          if (data.emailVerified !== true) continue;
          const fp = await fingerprintFromJwk(data.publicKey);
          list.push({ id: d.id, displayName: data.displayName, email: data.email, fingerprint: fp });
        }
        setContacts(list);
      } catch (err) {
        console.error("loadContacts failed:", err);
      }
    }
    if (user) loadContacts();
  }, [user]);

  // Diagnostic check: export the fingerprint of the private key sitting in
  // THIS browser, fetch the public key currently stored on the server for
  // this account, and compare their fingerprints. If they don't match,
  // decryption failures are guaranteed and have nothing to do with the
  // other person — it means this browser's local key and the server's
  // record of "your public key" have drifted apart (e.g. this browser
  // logged in and generated a key before a fix was applied, or another
  // device/browser for the same account regenerated the server-side key
  // after this one last synced).
  useEffect(() => {
    async function checkIdentity() {
      if (!user || !privateKey) {
        setIdentityCheck(null);
        return;
      }
      try {
        const localJwk = await exportPrivateKey(privateKey);
        const localFp = await fingerprintFromJwk(localJwk);
        const snap = await getDoc(doc(db, "users", user.uid));
        const serverPublicKey = snap.data()?.publicKey;
        if (!serverPublicKey) {
          setIdentityCheck({ match: false, reason: "No public key found on server for this account." });
          return;
        }
        const serverFp = await fingerprintFromJwk(serverPublicKey);
        const match =
          localFp.length === serverFp.length && localFp.every((b, i) => b === serverFp[i]);
        setIdentityCheck({ match, localFp, serverFp });
      } catch (err) {
        console.error("Identity check failed:", err);
        setIdentityCheck({ match: false, reason: "Identity check failed: " + err.message });
      }
    }
    checkIdentity();
  }, [user, privateKey]);

  // Load per-conversation "last read" timestamps for this user from
  // localStorage so unread indicators survive a page refresh.
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(readStateKey(user.uid));
      setReadState(raw ? JSON.parse(raw) : {});
    } catch {
      setReadState({});
    }
  }, [user]);

  // Track the most recent activity (in either direction) for every
  // conversation the user is part of, so the sidebar can be sorted by
  // recency and flag unread messages — without needing to derive a shared
  // key and decrypt every conversation up front.
  useEffect(() => {
    if (!user) return;

    function merge(docs, direction) {
      setLastActivity((prev) => {
        const next = { ...prev };
        docs.forEach((d) => {
          const data = d.data();
          const at = data.createdAt?.toMillis?.();
          if (!at) return; // pending serverTimestamp() write, will resolve on next snapshot
          const contactId = direction === "sent" ? data.receiverUid : data.senderUid;
          const existing = next[contactId];
          if (!existing || at >= existing.at) {
            next[contactId] = { at, fromThem: direction === "received" };
          }
        });
        return next;
      });
    }

    const sentQ = query(collection(db, "messages"), where("senderUid", "==", user.uid));
    const receivedQ = query(collection(db, "messages"), where("receiverUid", "==", user.uid));
    const unsubSent = onSnapshot(sentQ, (snap) => merge(snap.docs, "sent"));
    const unsubReceived = onSnapshot(receivedQ, (snap) => merge(snap.docs, "received"));
    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [user]);

  // Mark the open conversation as read whenever it's selected or new
  // messages arrive in it while it's already open.
  useEffect(() => {
    if (!activeContact || !user) return;
    markConvoRead(activeContact.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContact, messages]);

  function markConvoRead(contactId) {
    setReadState((prev) => {
      const next = { ...prev, [contactId]: Date.now() };
      try {
        localStorage.setItem(readStateKey(user.uid), JSON.stringify(next));
      } catch {
        // localStorage unavailable (e.g. private mode) — unread state just
        // won't persist across refreshes, which is a harmless degradation.
      }
      return next;
    });
  }

  // Contacts ordered by most recent conversation activity first; contacts
  // with no messages yet fall to the bottom, alphabetically.
  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const at = lastActivity[a.id]?.at ?? 0;
      const bt = lastActivity[b.id]?.at ?? 0;
      if (at !== bt) return bt - at;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
  }, [contacts, lastActivity]);

  // Contact ids with a message from them newer than our last read time.
  const unreadContactIds = useMemo(() => {
    const ids = new Set();
    for (const [contactId, activity] of Object.entries(lastActivity)) {
      if (!activity.fromThem) continue;
      if (contactId === activeContact?.id) continue; // open convo is always "read"
      const readAt = readState[contactId] ?? 0;
      if (activity.at > readAt) ids.add(contactId);
    }
    return ids;
  }, [lastActivity, readState, activeContact]);

  // Derive the shared AES key the moment a conversation is opened.
  // Always fetch the contact's CURRENT public key — don't trust a cached
  // copy, since it may be stale if they've logged in again since then.
  useEffect(() => {
    async function derive() {
      if (!activeContact || !privateKey) return;
      setSharedKey(null);
      const userSnap = await getDoc(doc(db, "users", activeContact.id));
      const freshPublicKey = userSnap.data()?.publicKey;
      if (!freshPublicKey) return;
      const theirPublicKey = await importPublicKey(freshPublicKey);
      const key = await deriveSharedKey(privateKey, theirPublicKey);
      setSharedKey(key);
    }
    derive();
  }, [activeContact, privateKey]);

  // Real-time listener + decrypt-on-arrival for the open conversation.
  useEffect(() => {
    if (!activeContact || !sharedKey) return;
    const convoId = [user.uid, activeContact.id].sort().join("_");
    const q = query(
      collection(db, "messages"),
      where("convoId", "==", convoId),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, async (snap) => {
      const decrypted = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          try {
            const plaintext = await decryptMessage(sharedKey, data.ciphertext, data.iv);
            return { id: d.id, text: plaintext, mine: data.senderUid === user.uid,
              timestamp: formatTime(data.createdAt), raw: data };
          } catch {
            return { id: d.id, text: "⚠ could not decrypt (wrong session key)",
              mine: data.senderUid === user.uid, timestamp: formatTime(data.createdAt), raw: data };
          }
        })
      );
      setMessages(decrypted);
    });
    return unsub;
  }, [activeContact, sharedKey, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastMessageRaw = useMemo(() => {
    const withRaw = messages.filter((m) => m.raw?.ciphertext);
    return withRaw.length ? withRaw[withRaw.length - 1].raw : null;
  }, [messages]);

  async function handleSend(text) {
    if (!sharedKey || !activeContact) return;
    const { ciphertext, iv } = await encryptMessage(sharedKey, text);
    const convoId = [user.uid, activeContact.id].sort().join("_");
    const docRef = await addDoc(collection(db, "messages"), {
      convoId, senderUid: user.uid, receiverUid: activeContact.id,
      ciphertext, iv, createdAt: serverTimestamp(),
    });
    setJustSentIds((prev) => new Set(prev).add(docRef.id));
  }

  return (
    <div className="h-screen w-full flex bg-void">
      <Sidebar
        contacts={sortedContacts}
        activeId={activeContact?.id}
        onSelect={setActiveContact}
        currentUser={{ displayName: user?.email?.split("@")[0], fingerprint: currentFingerprint }}
        onLogout={logout}
        lastActivity={lastActivity}
        unreadContactIds={unreadContactIds}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {identityCheck && identityCheck.match === false && (
          <div className="px-6 py-3 bg-signal-danger/10 border-b border-signal-danger/30 text-signal-danger text-xs font-mono flex items-center justify-between gap-4">
            <span>
              ⚠ Identity mismatch: the private key stored in this browser
              does not match the public key on the server for {user?.email}.{" "}
              {identityCheck.reason ||
                "This browser's local key and the server record have drifted apart — likely because this account was logged into a different browser/device that overwrote the server key."}
            </span>
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    "This will make THIS browser the authoritative key for " +
                      user?.email +
                      ". Every message ever sent under the old key will become permanently unreadable — same as any key rotation. Continue?"
                  )
                ) {
                  await regenerateKeys();
                }
              }}
              className="focus-brass shrink-0 text-xs font-mono px-3 py-1.5 rounded-full border border-signal-danger/50 hover:bg-signal-danger/10 transition-colors whitespace-nowrap"
            >
              Resync this browser
            </button>
          </div>
        )}
        {activeContact ? (
          <>
            <header className="flex items-center justify-between px-6 py-4 border-b border-surface-line bg-surface">
              <div className="flex items-center gap-3">
                <Identicon bytes={activeContact.fingerprint} size={36} />
                <div>
                  <p className="text-sm text-ink-100">{activeContact.displayName}</p>
                  <p className="text-[11px] font-mono text-signal-success">
                    {sharedKey ? "shared key derived · AES-256" : "deriving key…"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAttackerOpen(true)}
                className="focus-brass text-xs font-mono px-3 py-1.5 rounded-full border border-signal-danger/40 text-signal-danger hover:bg-signal-danger/10 transition-colors"
              >
                open attacker panel
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {messages.length === 0 && (
                <p className="text-ink-500 text-sm text-center mt-10">
                  No messages yet. Say hello — it'll be encrypted before it leaves your browser.
                </p>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} text={m.text} timestamp={m.timestamp} mine={m.mine}
                  revealAnimation={justSentIds.has(m.id)} />
              ))}
              <div ref={bottomRef} />
            </div>

            <ChatInput onSend={handleSend} disabled={!sharedKey} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-ink-500 text-sm">Select a conversation to derive a shared key and start talking.</p>
          </div>
        )}
      </main>

      <AttackerPanel open={attackerOpen} onClose={() => setAttackerOpen(false)} lastMessage={lastMessageRaw} />
    </div>
  );
}

function formatTime(ts) {
  if (!ts?.toDate) return "sending…";
  return ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function readStateKey(uid) {
  return `hushh_read_state_${uid}`;
}