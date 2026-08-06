# Hushh! — Frontend

A React + Firebase frontend for the Hushh! end-to-end encrypted messaging
project, matching the architecture in the proposal: ECDH (P-256) key
exchange, HKDF-derived AES-256-GCM shared keys, and a three-layer
penetration demonstration panel — all running through the browser's native
Web Crypto API.

Visual direction: a "wax seal & cipher" theme — charcoal-navy surfaces,
a brass/gold accent standing in for "the key," monospace ciphertext, and a
signature micro-interaction where your own sent messages flash as
scrambled hex before resolving into plaintext (dramatizing encrypt/decrypt
instead of just claiming it happens).

## File structure

```
hushh-frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx               # Top-level router: AuthPage <-> ChatPage
    ├── index.css             # Global styles + design tokens (Tailwind)
    ├── firebase.js           # Firebase init — PUT YOUR CONFIG HERE
    ├── context/
    │   └── AuthContext.jsx   # Firebase auth + key-pair generation on login/register
    ├── crypto/
    │   └── cryptoUtils.js    # ECDH / HKDF / AES-256-GCM via Web Crypto API
    ├── pages/
    │   ├── AuthPage.jsx      # Login + register screen
    │   └── ChatPage.jsx      # Main chat screen (sidebar, messages, input)
    └── components/
        ├── Sidebar.jsx       # Conversation list
        ├── MessageBubble.jsx # Chat bubble + cipher-reveal animation
        ├── ChatInput.jsx     # Message composer
        ├── Identicon.jsx     # Geometric fingerprint avatar from public key hash
        └── AttackerPanel.jsx # The three-layer interception demo (section 4.1.4)
```

## 1. Install

You'll need Node.js 18+ installed.

```bash
cd hushh-frontend
npm install
```

## 2. Connect it to your Firebase project

1. In the [Firebase console](https://console.firebase.google.com), create a
   project (or use an existing one).
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Cloud Firestore** database (start in test mode while
   developing, then lock it down with rules before your defense — see
   below).
4. Go to **Project settings → General → Your apps**, add a Web app, and
   copy the `firebaseConfig` object it gives you.
5. Paste those values into `src/firebase.js`, replacing the placeholders:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "...",
};
```

### Firestore collections this frontend expects

- `users/{uid}` — `{ displayName, email, publicKey (JWK), createdAt }`
- `messages/{autoId}` — `{ convoId, senderUid, receiverUid, ciphertext, iv, createdAt }`

  `convoId` is just the two UIDs sorted and joined with `_`, so a 1-to-1
  conversation always resolves to the same document filter regardless of
  who sends first — no separate "conversations" collection needed for the
  current one-to-one scope.

Suggested Firestore security rules for the defense (locks down who can
read what, without ever needing to touch plaintext):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /messages/{messageId} {
      allow read: if request.auth != null &&
        (resource.data.senderUid == request.auth.uid ||
         resource.data.receiverUid == request.auth.uid);
      allow create: if request.auth != null &&
        request.resource.data.senderUid == request.auth.uid;
    }
  }
}
```

## 3. Run it

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Register two
separate accounts (e.g. in two browser profiles, or one normal + one
incognito window) to test messaging between them.

## 4. How the pieces connect (integration notes)

- **`AuthContext.jsx`** is the seam between Firebase Auth and your crypto
  module. On `register()`/`login()` it calls `generateKeyPair()` from
  `cryptoUtils.js`, keeps the private `CryptoKey` in React state only
  (never Firestore, never localStorage), and writes the public key (as
  JWK) to `users/{uid}`.
- **`ChatPage.jsx`** is where key exchange actually happens: when you open
  a conversation, it fetches the other user's public key from Firestore,
  calls `deriveSharedKey()`, and holds the resulting AES key in memory for
  that session. Every incoming Firestore snapshot is decrypted client-side
  with `decryptMessage()` before it's rendered.
- **`AttackerPanel.jsx`** only needs the last message's `{ciphertext, iv}`
  — it doesn't touch your real key at all, it generates a *bogus* AES key
  and shows the resulting `OperationError`. Wire it up to browser
  DevTools' Network tab and Wireshark side-by-side during your actual
  live demo for layers 2 and 3.
- If you already have your own crypto module from earlier project work,
  you can drop it in place of `src/crypto/cryptoUtils.js` as long as it
  exports the same five functions used by `AuthContext.jsx` and
  `ChatPage.jsx`: `generateKeyPair`, `importPublicKey`, `deriveSharedKey`,
  `encryptMessage`, `decryptMessage`.
- **Known limitation carried over from the proposal (section 8, Rec. 2):**
  private keys live only in browser memory for the session, so refreshing
  the page currently triggers a fresh key pair rather than restoring the
  old one. `App.jsx`'s `Gate` component is where you'd hook in an
  encrypted-local-storage key backup later without touching the rest of
  the UI.

## 5. Building for deployment (Firebase Hosting)

```bash
npm run build
npm install -g firebase-tools   # if you don't have it
firebase login
firebase init hosting            # point it at the dist/ folder
firebase deploy
```
