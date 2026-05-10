"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") ?? "/";
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}` },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm border-2 border-black rounded-none p-6 text-center">
          <h1 className="font-mono text-xl font-bold mb-4">CHECK YOUR EMAIL</h1>
          <p className="text-sm">
            We sent a magic link to <strong>{email}</strong>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm border-2 border-black rounded-none p-6"
      >
        <h1 className="font-mono text-xl font-bold mb-6 text-center">
          EASY SPLIT
        </h1>

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
          placeholder="you@example.com"
        />

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-accent text-white font-mono font-bold py-2 rounded-none border-2 border-black active:scale-[0.98] transition-transform"
        >
          SEND MAGIC LINK
        </button>
      </form>
    </main>
  );
}
