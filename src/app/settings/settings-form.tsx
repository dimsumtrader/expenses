"use client";

import { saveGroupSettings, leaveGroup } from "@/app/actions/groups";
import { haptic } from "@/lib/haptics";
import type { ProfileRow, DefaultSplitRow } from "@/lib/types";
import { useState } from "react";
import Decimal from "decimal.js";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const CURRENCIES = ["HKD", "CNY", "USD", "EUR", "JPY", "CAD"];

type Member = { id: string; group_id: string; display_name: string };

export default function SettingsForm({
  profiles,
  defaultSplits,
  members,
}: {
  profiles: ProfileRow[];
  defaultSplits: DefaultSplitRow[];
  members: Member[];
}) {
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
            <GroupCard
              key={profile.group_id}
              profile={profile}
              group={group}
              defaultSplits={defaultSplits.filter((ds) => ds.group_id === profile.group_id)}
              members={members.filter((m) => m.group_id === profile.group_id)}
            />
          );
        })}
      </div>
    </main>
  );
}

function GroupCard({
  profile,
  group,
  defaultSplits,
  members,
}: {
  profile: ProfileRow;
  group: { id: string; room_id: string; name: string; home_currency: string };
  defaultSplits: DefaultSplitRow[];
  members: Member[];
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const existingSplits = Object.fromEntries(
    defaultSplits.map((ds) => [ds.user_id, String(ds.percentage)]),
  );

  const [splits, setSplits] = useState<Record<string, string>>(() => {
    if (Object.keys(existingSplits).length > 0) return existingSplits;
    const equal = (100 / members.length).toFixed(2);
    return Object.fromEntries(members.map((m) => [m.id, equal]));
  });

  const splitTotal = Object.values(splits).reduce(
    (sum, v) => sum.plus(new Decimal(v || "0")),
    new Decimal(0),
  );
  const splitValid = splitTotal.equals(100);

  function distributeEvenly() {
    const equal = (100 / members.length).toFixed(2);
    setSplits(Object.fromEntries(members.map((m) => [m.id, equal])));
  }

  function updateSplit(memberId: string, value: string) {
    setSplits((prev) => ({ ...prev, [memberId]: value }));
  }

  const memberName = (id: string) => members.find((m) => m.id === id)?.display_name ?? "???";

  async function handleSave(formData: FormData) {
    setSaving(true);
    setError("");
    try {
      haptic();
      const splitEntries = Object.entries(splits).map(([userId, percentage]) => ({
        userId,
        percentage,
      }));
      await saveGroupSettings(
        profile.group_id,
        formData.get("name") as string,
        formData.get("homeCurrency") as string,
        splitEntries,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-2 border-black p-4 mb-4">
      <form action={handleSave}>
        <input type="hidden" name="groupId" value={profile.group_id} />

        <p className="font-mono text-[10px] tracking-[0.2em] text-black/30 mb-3">
          GROUP {group.room_id}
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

        <div className="pt-4 border-t border-black/10">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] tracking-[0.2em] text-black/30">DEFAULT SPLITS</span>
            <button
              type="button"
              onClick={distributeEvenly}
              className="font-mono text-[10px] border border-black/30 px-2 py-0.5 hover:bg-black hover:text-white transition-colors"
            >
              EVEN
            </button>
          </div>

          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-black/60 flex-1 truncate">{memberName(member.id)}</span>
              <input
                type="number"
                step="0.01"
                value={splits[member.id] ?? ""}
                onChange={(e) => updateSplit(member.id, e.target.value)}
                className="w-20 border-2 border-black rounded-none px-2 py-1 font-mono text-xs text-right focus:outline-none focus:ring-2 focus:ring-black"
              />
              <span className="font-mono text-xs text-black/40">%</span>
            </div>
          ))}

          {!splitValid && (
            <p className="text-[10px] text-red-600 font-mono mb-2">Total: {splitTotal.toFixed(2)}% (must be 100%)</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <button
          type="submit"
          disabled={!splitValid || saving}
          className="w-full bg-accent text-white font-mono font-bold py-2 rounded-none border-2 border-black active:scale-[0.98] transition-transform disabled:opacity-50 mt-4"
        >
          {saving ? "..." : "SAVE"}
        </button>
      </form>

      <button
        type="button"
        onClick={async () => {
          if (!confirm("Leave this group? You can rejoin later with the group code.")) return;
          haptic();
          await leaveGroup(profile.group_id);
          window.location.href = "/";
        }}
        className="w-full text-red-600 font-mono text-xs py-2 mt-3 hover:bg-red-50 transition-colors"
      >
        LEAVE GROUP
      </button>
    </div>
  );
}
