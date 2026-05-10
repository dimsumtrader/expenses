"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border-2 border-black rounded-none p-6"
      >
        <h1 className="font-mono text-xl font-bold mb-6 text-center">
          EASY SPLIT
        </h1>

        {/* Tab switcher */}
        <div className="flex border-2 border-black mb-6">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2 font-mono text-sm font-bold transition-colors ${
              mode === "login" ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 py-2 font-mono text-sm font-bold transition-colors ${
              mode === "signup" ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            SIGN UP
          </button>
        </div>

        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />

        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-white font-mono font-bold py-2 rounded-none border-2 border-black active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading ? "..." : mode === "login" ? "SIGN IN" : "SIGN UP"}
        </button>
      </form>
    </main>
  );
}
