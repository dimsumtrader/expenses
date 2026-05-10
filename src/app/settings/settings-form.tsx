"use client";

import { updateGroup } from "@/app/actions/groups";
import { haptic } from "@/lib/haptics";
import type { ProfileRow, GroupRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const CURRENCIES = ["HKD", "CNY", "USD", "EUR", "JPY", "CAD"];

export default function SettingsForm({ profiles }: { profiles: ProfileRow[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-1 hover:bg-black hover:text-white transition-colors border-2 border-black">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-mono text-xl font-bold">GROUP SETTINGS</h1>
        </div>

        {profiles.map((profile) => {
          const group = Array.isArray(profile.groups)
            ? profile.groups[0]
            : profile.groups;

          return (
            <form
              key={profile.group_id}
              action={async (formData) => {
                setError("");
                try {
                  haptic();
                  await updateGroup(formData);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to save");
                }
              }}
              className="border-2 border-black p-4 mb-4"
            >
              <input type="hidden" name="groupId" value={profile.group_id} />

              <p className="font-mono text-[10px] tracking-[0.2em] text-black/30 mb-3">
                ROOM {group.room_id}
              </p>

              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input
                name="name"
                type="text"
                required
                maxLength={30}
                defaultValue={group.name}
                className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />

              <label className="block text-sm font-medium mb-1">Home Currency</label>
              <select
                name="homeCurrency"
                defaultValue={group.home_currency}
                className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                type="submit"
                className="w-full bg-accent text-white font-mono font-bold py-2 rounded-none border-2 border-black active:scale-[0.98] transition-transform"
              >
                SAVE
              </button>
            </form>
          );
        })}

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    </main>
  );
}
