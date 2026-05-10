"use client";

import { createGroup, joinGroup } from "@/app/actions/groups";
import { useState } from "react";

const CURRENCIES = ["HKD", "CNY", "USD", "EUR", "JPY", "CAD"];

export default function SetupForm() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    try {
      if (mode === "create") {
        await createGroup(formData);
      } else {
        await joinGroup(formData);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <form
          action={handleSubmit}
          className="w-full border-2 border-black rounded-none p-6"
        >
          <h1 className="font-mono text-xl font-bold mb-6 text-center">
            {mode === "create" ? "CREATE GROUP" : "JOIN GROUP"}
          </h1>

          {/* Tab switcher */}
          <div className="flex border-2 border-black mb-6">
            <button
              type="button"
              onClick={() => { setMode("create"); setError(""); }}
              className={`flex-1 py-2 font-mono text-sm font-bold transition-colors ${
                mode === "create" ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              CREATE
            </button>
            <button
              type="button"
              onClick={() => { setMode("join"); setError(""); }}
              className={`flex-1 py-2 font-mono text-sm font-bold transition-colors ${
                mode === "join" ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              JOIN
            </button>
          </div>

          <label htmlFor="displayName" className="block text-sm font-medium mb-1">
            Display Name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            maxLength={30}
            className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />

          {mode === "join" && (
            <>
              <label htmlFor="roomId" className="block text-sm font-medium mb-1">
                Group Code
              </label>
              <input
                id="roomId"
                name="roomId"
                type="text"
                required
                maxLength={4}
                className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-black"
              />
            </>
          )}

          {mode === "create" && (
            <>
              <label htmlFor="groupName" className="block text-sm font-medium mb-1">
                Group Name
              </label>
              <input
                id="groupName"
                name="groupName"
                type="text"
                maxLength={30}
                className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />

              <label htmlFor="homeCurrency" className="block text-sm font-medium mb-1">
                Home Currency
              </label>
              <select
                id="homeCurrency"
                name="homeCurrency"
                className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-accent text-white font-mono font-bold py-2 rounded-none border-2 border-black active:scale-[0.98] transition-transform"
          >
            {mode === "create" ? "CREATE" : "JOIN"}
          </button>
        </form>
      </div>
    </main>
  );
}
