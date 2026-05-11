"use client";

import { haptic } from "@/lib/haptics";
import type { GroupRow, EntryRow, SplitRow } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import EntryDetail from "./entry-detail";
import { logout } from "@/app/actions/auth";

type BalanceView = { memberId: string; displayName: string; amount: string };
type Member = { id: string; display_name: string };
type GroupOption = { id: string; name: string; room_id: string; home_currency: string };

export default function DashboardClient({
  group,
  hasNoGroup,
  allGroups,
  members,
  balances,
  entries,
  splits,
  profiles,
  userId,
  profileId,
}: {
  group?: GroupRow;
  hasNoGroup?: boolean;
  allGroups: GroupOption[];
  members: Member[];
  balances: BalanceView[];
  entries: EntryRow[];
  splits: SplitRow[];
  profiles: Member[];
  userId: string;
  profileId: string;
}) {
  const router = useRouter();
  const [selectedEntry, setSelectedEntry] = useState<EntryRow | null>(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  function copyRoomCode() {
    navigator.clipboard.writeText(group!.room_id);
    haptic();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setGroupMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchGroup(groupId: string) {
    haptic();
    setGroupMenuOpen(false);
    router.push(`/?g=${groupId}`);
  }

  // No group state — show empty dashboard with prominent CTA
  if (hasNoGroup) {
    return <NoGroupDashboard />;
  }

  const activeGroupParam = allGroups.length > 1 ? `?g=${group!.id}` : "";

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-screen">
      {/* Top Bar — app identity + group switcher */}
      <header className="sticky top-0 z-10 bg-white border-b-2 border-black">
        <div className="px-4 pt-3 pb-3 flex items-center justify-between">
          {/* Group Switcher */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { haptic(); setGroupMenuOpen(!groupMenuOpen); }}
              className="flex items-center gap-1.5 font-mono text-sm font-bold border-2 border-black px-2.5 py-1 hover:bg-black hover:text-white transition-colors"
            >
              {group!.name}
              <ChevronDown size={14} />
            </button>

            {groupMenuOpen && (
              <div className="absolute left-0 top-full mt-1 bg-white border-2 border-black w-44 z-20">
                {/* Section 1: Groups */}
                {allGroups.map((g, i) => (
                  <button
                    key={g.id}
                    onClick={() => switchGroup(g.id)}
                    className={`w-full text-left px-3 py-2.5 font-mono text-xs transition-colors ${
                      g.id === group!.id ? "bg-black text-white" : "hover:bg-gray-50 text-black"
                    } ${i === allGroups.length - 1 ? "border-b-2 border-black" : "border-b border-gray-200"}`}
                  >
                    {g.name}
                    <span className="text-[10px] ml-2 opacity-50">{g.home_currency}</span>
                  </button>
                ))}
                {/* Section 2: Edit */}
                <Link
                  href="/settings"
                  className="block px-3 py-2.5 font-mono text-xs border-b-2 border-black hover:bg-gray-50 text-accent"
                >
                  EDIT
                </Link>
                {/* Section 3: Logout */}
                <button
                  onClick={async () => { haptic(); await logout(); }}
                  className="w-full text-left px-3 py-2.5 font-mono text-xs text-red-600 hover:bg-gray-50"
                >
                  LOG OUT
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={copyRoomCode}
              className="font-mono text-xs tracking-[0.2em] border-2 border-black px-2 py-1 hover:bg-black hover:text-white transition-colors"
            >
              {copied ? "COPIED" : group!.room_id}
            </button>
            <Link
              href="/setup"
              className="font-mono text-[11px] border-2 border-black px-2 py-1 hover:bg-black hover:text-white transition-colors"
            >
              + GROUP
            </Link>
          </div>
        </div>
      </header>

      {/* Balance Summary */}
      <div className="border-b-2 border-black px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[10px] tracking-[0.2em] text-black/30">BALANCES</span>
          <div className="flex-1 h-px bg-black/10" />
        </div>
        <div className="grid grid-cols-1 gap-2">
          {balances.map((b) => {
            const amount = parseFloat(b.amount);
            const isPositive = amount > 0;
            const isNegative = amount < 0;
            return (
              <div key={b.memberId} className="flex items-center justify-between border-2 border-black px-3 py-2">
                <span className="font-mono text-xs tracking-wide text-black">{b.displayName}</span>
                <span className={`font-mono text-sm font-bold tabular-nums ${
                  isPositive ? "text-green-700" : isNegative ? "text-red-600" : "text-black/50"
                }`}>
                  {amount > 0 ? "+" : ""}{b.amount}
                  <span className="text-[10px] font-normal ml-1 text-black/40">{group!.home_currency}</span>                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feed Section Header */}
      <div className="px-4 pt-5 pb-2 flex items-center gap-3">
        <span className="font-mono text-[10px] tracking-[0.2em] text-black/40 uppercase">Ledger</span>
        <div className="flex-1 h-px bg-black" />
        <span className="font-mono text-[10px] text-black/30">{entries.length} entries</span>
      </div>

      {/* Historical Feed */}
      <section className="flex-1 px-4 pb-24 space-y-0">
        {entries.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-mono text-sm text-black/30">No entries yet</p>
            <p className="font-mono text-[10px] text-black/20 mt-1">Tap + to add one</p>
          </div>
        )}
        {entries.map((entry, i) => {
          const payer = profiles.find((p) => p.id === entry.payer_id);
          const recipient = entry.recipient_id
            ? profiles.find((p) => p.id === entry.recipient_id)
            : null;
          const isTransaction = entry.type === "transaction";

          return (
            <button
              key={entry.id}
              onClick={() => { haptic(); setSelectedEntry(entry); }}
              className="w-full text-left py-3 flex items-start gap-3 border-b border-black/8 hover:bg-black/[0.02] transition-colors"
            >
              {/* Type indicator */}
              <div className="mt-0.5 flex-shrink-0">
                {isTransaction ? (
                  <div className="w-6 h-6 border-2 border-black flex items-center justify-center">
                    <span className="font-mono text-[9px] font-bold">T</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-black flex items-center justify-center">
                    <span className="font-mono text-[9px] font-bold text-white">P</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-sm font-bold truncate">
                    {isTransaction
                      ? entry.title
                      : `${payer?.display_name ?? "?"} → ${recipient?.display_name ?? "?"}`}
                  </p>
                  <p className="font-mono text-sm font-bold flex-shrink-0 tabular-nums">
                    {Number(entry.amount_home).toFixed(2)}
                    <span className="text-[10px] font-normal ml-0.5 text-black/40">{group!.home_currency}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-black/35">{entry.date}</span>
                  {isTransaction && (
                    <>
                      <span className="text-black/15">·</span>
                      <span className="font-mono text-[10px] text-black/35">{payer?.display_name}</span>
                    </>
                  )}
                  {entry.currency_orig && entry.amount_orig && (
                    <>
                      <span className="text-black/15">·</span>
                      <span className="font-mono text-[10px] text-black/25">
                        {Number(entry.amount_orig).toFixed(2)} {entry.currency_orig}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Transaction FAB */}
      <Link
        href={`/add/transaction${activeGroupParam}`}
        className="fixed bottom-6 right-6 z-20 bg-accent border-2 border-black w-14 h-14 flex items-center justify-center active:scale-90 transition-transform"
        onClick={() => haptic()}
      >
        <Plus size={28} strokeWidth={2.5} className="text-white" />
      </Link>

      {/* Payment FAB */}
      <Link
        href={`/add/payment${activeGroupParam}`}
        className="fixed bottom-6 left-6 z-20 bg-white border-2 border-black w-14 h-14 flex items-center justify-center active:scale-90 transition-transform"
        onClick={() => haptic()}
      >
        <span className="font-mono text-[11px] font-bold leading-none">PAY</span>
      </Link>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <EntryDetail
          entry={selectedEntry}
          splits={splits.filter((s) => s.entry_id === selectedEntry.id)}
          profiles={profiles}
          group={group!}
          profileId={profileId}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

function NoGroupDashboard() {
  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b-2 border-black">
        <div className="px-4 pt-3 pb-3">
          <h1 className="font-mono text-sm font-bold tracking-[0.25em]">EASY SPLIT</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <Link
          href="/setup"
          className="bg-accent text-white font-mono font-bold py-3 px-8 border-2 border-black active:scale-[0.98] transition-transform"
        >
          ADD GROUP
        </Link>
      </div>
    </div>
  );
}
