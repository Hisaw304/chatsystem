import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1️⃣ Load session (THIS controls loading)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 2️⃣ Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 3️⃣ Load profile NON-BLOCKING
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data ?? null);
      });
  }, [user]);

  return { user, profile, loading };
}
