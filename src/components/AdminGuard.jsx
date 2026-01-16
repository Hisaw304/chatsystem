import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export default function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState(null); // null | true | false

  useEffect(() => {
    if (!user) {
      setAllowed(false);
      return;
    }

    supabase.rpc("is_admin").then(({ data, error }) => {
      if (error) {
        console.error("Admin check failed:", error);
        setAllowed(false);
      } else {
        setAllowed(data === true);
      }
    });
  }, [user]);

  if (loading || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Checking admin access…</p>
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">Admin access required</h2>

        <p className="text-sm text-gray-600">
          You are logged in, but this account is not an admin.
        </p>

        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
        >
          Login as admin
        </button>
      </div>
    );
  }

  return children;
}
