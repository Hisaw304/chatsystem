import { useAuth } from "../lib/AuthContext";
import Auth from "./Auth";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading session…</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return children;
}
