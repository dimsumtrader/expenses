"use client";

import { submitPayment } from "@/app/actions/entries";
import { haptic } from "@/lib/haptics";
import type { GroupRow } from "@/lib/types";
import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; display_name: string };

export default function PaymentForm({
  groupId,
  group,
  members,
  profileId,
}: {
  groupId: string;
  group: GroupRow;
  members: Member[];
  profileId: string;
}) {
  const today = new Date().toISOString().split("T")[0];
  const router = useRouter();
  const [payerId, setPayerId] = useState(profileId || members[0]?.id || "");
  const [recipientId, setRecipientId] = useState(
    members.find((m) => m.id !== profileId)?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");

  const valid = payerId && recipientId && payerId !== recipientId && amount && parseFloat(amount) > 0;

  async function handleSubmit(_prev: null, formData: FormData) {
    setError("");
    try {
      formData.set("groupId", groupId);
      formData.set("payerId", payerId);
      formData.set("recipientId", recipientId);
      formData.set("amountHome", amount);
      formData.set("date", date);
      const result = await submitPayment(formData);
      if (result?.success) {
        haptic();
        router.push("/");
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
          SETTLE UP
        </h1>

        <label className="block text-sm font-medium mb-1">From</label>
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
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
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

        {payerId === recipientId && (
          <p className="text-sm text-red-600 mb-4">Sender and recipient cannot be the same</p>
        )}

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

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
