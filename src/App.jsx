import React, {useState, useEffect} from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import verifyEmailPage from "./pages/verifyEmailPage";
import ChatPage from "./pages/ChatPage";
import BenchmarkPage from "./pages/BenchmarkPage";


function Gate() {
  const { user, loading, privateKey, emailVerified } = useAuth();
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (hash === "#benchmark") return <BenchmarkPage />;

  if (loading) return <p>checking session…</p>;
  if (!user) return <AuthPage />;
  if (!emailVerified) return <verifyEmailPage />;
  if (!privateKey) return <AuthPage />;
  return <ChatPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}