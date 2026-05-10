"use client";

import { joinGroup } from "@/app/actions/groups";
import { useState } from "react";

export default function JoinForm({
  group,
}: {
  group: { id: string; room_id: string; name: string; home_currency: string };
}) {
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    try {
      await joinGroup(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <form
        action={handleSubmit}
        className="w-full max-w-sm border-2 border-black rounded-none p-6"
      >
        <h1 className="font-mono text-xl font-bold mb-2 text-center">JOIN ROOM</h1>
        <div className="text-center mb-6">
          <p className="font-mono text-sm font-bold">{group.name}</p>
          <p className="font-mono text-xs text-gray-500">
            {group.room_id} · {group.home_currency}
          </p>
        </div>

        <input type="hidden" name="roomId" value={group.room_id} />

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
          placeholder="Alice"
        />

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-accent text-white font-mono font-bold py-2 rounded-none border-2 border-black active:scale-[0.98] transition-transform"
        >
          JOIN
        </button>
      </form>
    </main>
  );
}
