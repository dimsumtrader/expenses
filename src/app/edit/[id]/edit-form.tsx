"use client";

import { updateTransaction, updatePayment } from "@/app/actions/update-entry";
import { haptic } from "@/lib/haptics";
import type { EntryRow, SplitRow, GroupRow } from "@/lib/types";
import Decimal from "decimal.js";
import { useState, useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Member = { id: string; display_name: string };

export default function EditForm({
  entry,
  splits,
  group,
  members,
}: {
  entry: EntryRow;
  splits: SplitRow[];
  group: GroupRow;
  members: Member[];
}) {
  const isTransaction = entry.type === "transaction";

  const [title, setTitle] = useState(entry.title ?? "");
  const [date, setDate] = useState(entry.date);
  const [amountHome, setAmountHome] = useState(String(entry.amount_home));
  const [payerId, setPayerId] = useState(entry.payer_id);
  const [recipientId, setRecipientId] = useState(entry.recipient_id ?? "");
  const [splitValues, setSplitValues] = useState<Record<string, string>>(
    Object.fromEntries(splits.map((s) => [s.user_id, String(s.percentage)])),
  );
  const [error, setError] = useState("");

  const splitTotal = Object.values(splitValues).reduce(
    (sum, v) => sum.plus(new Decimal(v || "0")),
    new Decimal(0),
  );
  const splitValid = !isTransaction || splitTotal.equals(100);
  const valid =
    (isTransaction ? title && splitValid : payerId !== recipientId) &&
    amountHome &&
    parseFloat(amountHome) > 0;

  async function handleSubmit(_prev: null, formData: FormData) {
    setError("");
    try {
      formData.set("entryId", entry.id);
      formData.set("amountHome", amountHome);
      formData.set("date", date);

      if (isTransaction) {
        formData.set("title", title);
        formData.set("payerId", payerId);
        await updateTransaction(formData);
      } else {
        formData.set("payerId", payerId);
        formData.set("recipientId", recipientId);
        await updatePayment(formData);
      }
      haptic();
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
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
          <Link href="/" className="inline-block mr-4 p-1 hover:bg-black hover:text-white transition-colors border-2 border-black align-middle"><ArrowLeft size={16} /></Link>
          EDIT {isTransaction ? "TRANSACTION" : "PAYMENT"}
        </h1>

        {isTransaction && (
          <>
            <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </>
        )}

        <label htmlFor="date" className="block text-sm font-medium mb-1">Date</label>
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
          Amount ({group.home_currency})
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          required
          step="0.01"
          min="0.01"
          value={amountHome}
          onChange={(e) => setAmountHome(e.target.value)}
          className="w-full border-2 border-black rounded-none px-3 py-2 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />

        <label className="block text-sm font-medium mb-1">
          {isTransaction ? "Paid by" : "From"}
        </label>
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

        {!isTransaction && (
          <>
            <label className="block text-sm font-medium mb-1">To</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setRecipientId(m.id)}
                  className={`px-3 py-1 border-2 border-black rounded-none font-mono text-sm ${
                    recipientId === m.id ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  {m.display_name}
                </button>
              ))}
            </div>
          </>
        )}

        {isTransaction && (
          <>
            <label className="block text-sm font-medium mb-1">Split %</label>
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 mb-2">
                <span className="text-sm w-24 truncate">{m.display_name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={splitValues[m.id] ?? ""}
                  onChange={(e) =>
                    setSplitValues((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  name={`split_${m.id}`}
                  className="flex-1 border-2 border-black rounded-none px-3 py-1 font-mono text-sm text-right focus:outline-none focus:ring-2 focus:ring-black"
                />
                <span className="text-sm font-mono">%</span>
              </div>
            ))}
            <p className={`text-xs font-mono mb-4 ${splitValid ? "text-green-700" : "text-red-600"}`}>
              Total: {splitTotal.toFixed(2)}% {splitValid ? "" : "(must equal 100%)"}
            </p>
          </>
        )}

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={!valid}
          className="w-full bg-accent text-white font-mono font-bold py-2 rounded-none border-2 border-black active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
        >
          SAVE
        </button>
      </form>
    </main>
  );
}
