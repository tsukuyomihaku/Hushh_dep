import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);
export default app;