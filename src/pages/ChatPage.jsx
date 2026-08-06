import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection, addDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, getDocs, doc, getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  importPublicKey, deriveSharedKey, encryptMessage, decryptMessage, fingerprintFromJwk,
} from "../crypto/cryptoUtils";
import Sidebar from "../components/Sidebar";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import AttackerPanel from "../components/AttackerPanel";
import Identicon from "../components/Identicon";

export default function ChatPage() {
  const { user, privateKey, logout } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [sharedKey, setSharedKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [justSentIds, setJustSentIds] = useState(new Set());
  const [attackerOpen, setAttackerOpen] = useState(false);
  const [currentFingerprint, setCurrentFingerprint] = useState(null);
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
        contacts={contacts}
        activeId={activeContact?.id}
        onSelect={setActiveContact}
        currentUser={{ displayName: user?.email?.split("@")[0], fingerprint: currentFingerprint }}
        onLogout={logout}
      />
      <main className="flex-1 flex flex-col min-w-0">
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