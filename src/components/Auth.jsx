import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // login | signup

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        alert("Account created");
        onSuccess?.(); // 👈 ADD THIS
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        onSuccess?.(); // 👈 ADD THIS
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-80 bg-white p-6 rounded-lg shadow"
      >
        <h2 className="text-xl font-semibold mb-4 text-center">
          {mode === "login" ? "Login" : "Sign up"}
        </h2>

        <input
          type="email"
          placeholder="Email"
          required
          className="w-full mb-3 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          required
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded"
        >
          {loading
            ? "Loading..."
            : mode === "login"
            ? "Login"
            : "Create account"}
        </button>

        <p className="text-xs text-center mt-4">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setMode("signup")}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setMode("login")}
              >
                Login
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
