import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCyVWqafxogF8Q0Azz5RAN2vSG8MkCaUFA",
  authDomain: "hushoo.firebaseapp.com",
  projectId: "hushoo",
  storageBucket: "hushoo.firebasestorage.app",
  messagingSenderId: "710431366675",
  appId: "1:710431366675:web:60dfb641d2d9827a15a9e6",
  measurementId: "G-NLF932RCNK"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Deployed environments (Vercel, corporate networks, some browsers) can
// interfere with Firestore's default streaming connection, silently
// downgrading real-time listeners to "only updates on next full load."
// Forcing long-polling auto-detection avoids that — it's the documented
// fix for "real-time works on localhost but needs a refresh once deployed."
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});
export default app;