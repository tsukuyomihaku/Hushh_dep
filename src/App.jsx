import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import BenchmarkPage from "./pages/BenchmarkPage";
function Gate() {
  const { user, loading, privateKey } = useAuth();

function Gate() {
  const { user, loading, privateKey } = useAuth();

  if (window.location.hash === "#benchmark") return <BenchmarkPage />;

  if (loading) return <p>checking session…</p>;
  if (!user || !privateKey) return <AuthPage />;
  return <ChatPage />;
}

  if (!user || !privateKey) {
    // Also lands here if the user refreshed the page: private keys are
    // session-memory only, so re-auth regenerates a key pair (see the
    // proposal's Future Recommendation on key persistence).
    return <AuthPage />;
  }

  return <ChatPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
