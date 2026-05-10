"use client";

import { submitTransaction } from "@/app/actions/entries";
import { convertCurrency } from "@/lib/currency";
import { haptic } from "@/lib/haptics";
import type { GroupRow, DefaultSplitRow } from "@/lib/types";
import Decimal from "decimal.js";
import { useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";

const CURRENCIES = ["HKD", "CNY", "USD", "EUR", "JPY", "CAD"];

type Member = { id: string; display_name: string };

export default function TransactionForm({
  groupId,
  group,
  members,
  userId,
  profileId,
  defaultSplits,
}: {
  groupId: string;
  group: GroupRow;
  members: Member[];
  userId: string;
  profileId: string;
  defaultSplits: DefaultSplitRow[];
}) {
  const today = new Date().toISOString().split("T")[0];
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(group.home_currency);
  const [payerId, setPayerId] = useState(profileId || members[0]?.id || "");
  const [splits, setSplits] = useState<Record<string, string>>({});
  const [convertedAmount, setConvertedAmount] = useState<string | null>(null);
  const router = useRouter();
  const [error, setError] = useState("");

  // Initialize splits from defaults or equal
  useEffect(() => {
    const defaultsMap = Object.fromEntries(
      defaultSplits.map((ds) => [ds.user_id, String(ds.percentage)]),
    );
    const hasDefaults = members.every((m) => defaultsMap[m.id] !== undefined);
    const initial: Record<string, string> = {};
    if (hasDefaults && defaultSplits.length > 0) {
      members.forEach((m) => {
        initial[m.id] = defaultsMap[m.id];
      });
    } else {
      const equal = (100 / members.length).toFixed(2);
      members.forEach((m) => {
        initial[m.id] = equal;
      });
    }
    setSplits(initial);
  }, [members, defaultSplits]);

  // Currency conversion
  useEffect(() => {
    if (!amount || currency === group.home_currency) {
      setConvertedAmount(null);
      return;
    }
    const amt = new Decimal(amount);
    if (amt.lte(0)) {
      setConvertedAmount(null);
      return;
    }
    convertCurrency(amt, currency, group.home_currency)
      .then((converted) => setConvertedAmount(converted.toFixed(2)))
      .catch(() => setConvertedAmount(null));
  }, [amount, currency, group.home_currency]);

  const splitTotal = Object.values(splits).reduce(
    (sum, v) => sum.plus(new Decimal(v || "0")),
    new Decimal(0),
  );
  const splitValid = splitTotal.equals(100);

  function updateSplit(memberId: string, value: string) {
    setSplits((prev) => ({ ...prev, [memberId]: value }));
  }

  function excludePayer() {
    const others = members.filter((m) => m.id !== payerId);
    const equal = (100 / others.length).toFixed(2);
    const updated: Record<string, string> = {};
    members.forEach((m) => {
      updated[m.id] = m.id === payerId ? "0" : equal;
    });
    setSplits(updated);
  }

  async function handleSubmit(_prev: null, formData: FormData) {
    setError("");
    try {
      const homeAmount = currency !== group.home_currency && convertedAmount
        ? convertedAmount
        : amount;

      formData.set("groupId", groupId);
      formData.set("amountHome", homeAmount);
      formData.set("amountOrig", currency !== group.home_currency ? amount : "");
      formData.set("currencyOrig", currency);
      formData.set("homeCurrency", group.home_currency);
      formData.set("payerId", payerId);

      // Clear auto-set fields that the form might have sent
      formData.delete("currency");
      formData.delete("amount");

      const result = await submitTransaction(formData);
      if (result?.success) {
        haptic();
        router.push(groupId ? `/?g=${groupId}` : "/");
      }
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      return null;
    }
  }

  const [_, dispatch] = useActionState(handleSubmit, null);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <form
        action={dispatch}
        className="w-full max-w-sm border-2 border-black rounded-none p-6"
      >
        <h1 className="font-mono text-xl font-bold mb-6 text-center">
          NEW TRANSACTION
        </h1>

        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />

        <label htmlFor="date" className="block text-sm font-medium mb-1">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />

        <label htmlFor="amount" className="block text-sm font-medium mb-1">
          Amount
        </label>
        <div className="flex gap-2 mb-1">
          <input
            id="amount"
            name="amount"
            type="number"
            required
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 border-2 border-black rounded-none px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border-2 border-black rounded-none px-2 py-2 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {convertedAmount && (
          <p className="text-xs font-mono mb-3">
            = {convertedAmount} {group.home_currency}
          </p>
        )}

        <label className="block text-sm font-medium mb-1">Paid by</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPayerId(m.id)}
              className={`px-3 py-1 border-2 border-black rounded-none font-mono text-sm ${
                payerId === m.id ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {m.display_name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Split %</label>
          <button
            type="button"
            onClick={excludePayer}
            className="text-xs font-mono underline"
          >
            Exclude payer
          </button>
        </div>

        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2 mb-2">
            <span className="text-sm w-24 truncate">{m.display_name}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={splits[m.id] ?? ""}
              onChange={(e) => updateSplit(m.id, e.target.value)}
              name={`split_${m.id}`}
              className="flex-1 border-2 border-black rounded-none px-3 py-1 font-mono text-sm text-right focus:outline-none focus:ring-2 focus:ring-black"
            />
            <span className="text-sm font-mono">%</span>
          </div>
        ))}

        <p className={`text-xs font-mono mb-4 ${splitValid ? "text-green-700" : "text-red-600"}`}>
          Total: {splitTotal.toFixed(2)}% {splitValid ? "" : "(must equal 100%)"}
        </p>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={!splitValid || !title || !amount}
          className="w-full bg-accent text-white font-mono font-bold py-2 rounded-none border-2 border-black active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
        >
          SAVE
        </button>
      </form>
    </main>
  );
}
