import { createContext, useContext } from "react";
import { authClient } from "@/lib/authClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const session = authClient.useSession();

  const value = {
    session: session.data,
    user: session.data?.user ?? null,
    loading: session.isPending,
    error: session.error ?? null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
