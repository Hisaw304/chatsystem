import { createContext, useContext } from "react";
import { useAuth as useAuthInternal } from "./useAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAuthInternal();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
