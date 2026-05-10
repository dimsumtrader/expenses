"use client";

import { deleteEntry } from "@/app/actions/entries";
import { haptic } from "@/lib/haptics";
import Decimal from "decimal.js";
import type { EntryRow, GroupRow, SplitRow } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

type Member = { id: string; display_name: string };

export default function EntryDetail({
  entry,
  splits,
  profiles,
  group,
  profileId,
  onClose,
}: {
  entry: EntryRow;
  splits: SplitRow[];
  profiles: Member[];
  group: GroupRow;
  profileId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const payer = profiles.find((p) => p.id === entry.payer_id);
  const recipient = entry.recipient_id
    ? profiles.find((p) => p.id === entry.recipient_id)
    : null;

  async function handleDelete() {
    await deleteEntry(entry.id);
    haptic();
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-white border-2 border-black rounded-none p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-mono text-lg font-bold">
            {entry.type === "transaction" ? entry.title : "PAYMENT"}
          </h2>
          <button onClick={onClose} className="p-1">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Amount</span>
            <span className="font-bold">{Number(entry.amount_home).toFixed(2)} {group.home_currency}</span>
          </div>
          {entry.amount_orig && entry.currency_orig && (
            <div className="flex justify-between">
              <span className="text-gray-500">Original</span>
              <span>{Number(entry.amount_orig).toFixed(2)} {entry.currency_orig}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span>{entry.date}</span>
          </div>
          {entry.type === "transaction" && (
            <div className="flex justify-between">
              <span className="text-gray-500">Paid by</span>
              <span>{payer?.display_name ?? "?"}</span>
            </div>
          )}
          {entry.type === "transaction" && splits.length > 0 && (
            <div className="pt-2 mt-2 border-t border-gray-200">
              <span className="text-gray-500 text-xs">Split</span>
              <div className="mt-1 space-y-1">
                {splits.map((s) => {
                  const member = profiles.find((p) => p.id === s.user_id);
                  const share = new Decimal(entry.amount_home)
                    .times(s.percentage)
                    .div(100)
                    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
                  return (
                    <div key={s.id} className="flex justify-between text-xs">
                      <span>{member?.display_name ?? "?"}</span>
                      <span>{s.percentage}% ({share.toFixed(2)} {group.home_currency})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {entry.type === "payment" && (
            <div className="flex justify-between">
              <span className="text-gray-500">From → To</span>
              <span>{payer?.display_name ?? "?"} → {recipient?.display_name ?? "?"}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          {entry.created_by === profileId && (
            <>
              <Link
                href={`/edit/${entry.id}`}
                onClick={() => haptic()}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-black rounded-none py-2 font-mono text-sm font-bold"
              >
                <Pencil size={14} /> EDIT
              </Link>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-red-600 text-red-600 rounded-none py-2 font-mono text-sm font-bold"
                >
                  <Trash2 size={14} /> DELETE
                </button>
              ) : (
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white border-2 border-red-600 rounded-none py-2 font-mono text-sm font-bold"
                >
                  CONFIRM
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
