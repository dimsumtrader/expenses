"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";

export async function submitTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const groupId = formData.get("groupId") as string;
  const title = formData.get("title") as string;
  const date = formData.get("date") as string;
  const amountOrig = formData.get("amountOrig") as string;
  const amountHome = formData.get("amountHome") as string;
  const currencyOrig = formData.get("currencyOrig") as string;
  const homeCurrency = formData.get("homeCurrency") as string;
  const payerId = formData.get("payerId") as string;

  // Parse splits from formData (split_{userId}=percentage)
  const splits: { userId: string; percentage: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("split_")) {
      const userId = key.replace("split_", "");
      splits.push({ userId, percentage: parseFloat(value as string) });
    }
  }

  // Validate split totals with decimal.js
  const totalPct = splits.reduce(
    (sum, s) => sum.plus(new Decimal(s.percentage)),
    new Decimal(0),
  );

  if (!totalPct.equals(100)) {
    throw new Error(`Splits must total 100% (got ${totalPct.toFixed(2)}%)`);
  }

  // Compute home amount from original if foreign currency
  let finalAmountHome = new Decimal(amountHome);
  let finalAmountOrig: Decimal | null = null;
  let finalCurrencyOrig: string | null = null;

  if (currencyOrig && currencyOrig !== homeCurrency) {
    finalAmountOrig = new Decimal(amountOrig);
    finalCurrencyOrig = currencyOrig;
  }

  // Insert entry
  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .insert({
      group_id: groupId,
      type: "transaction",
      title,
      date,
      amount_home: finalAmountHome.toFixed(2),
      amount_orig: finalAmountOrig?.toFixed(2) ?? null,
      currency_orig: finalCurrencyOrig,
      payer_id: payerId,
      created_by: payerId,
    })
    .select("id")
    .single();

  if (entryError) throw new Error(entryError.message);
  if (!entry) throw new Error("Failed to create entry");

  // Insert splits
  const splitRows = splits.map((s) => ({
    entry_id: entry.id,
    user_id: s.userId,
    percentage: new Decimal(s.percentage).toFixed(2),
  }));

  const { error: splitsError } = await supabase.from("splits").insert(splitRows);
  if (splitsError) throw new Error(splitsError.message);

  revalidatePath("/");
  return { success: true };
}

export async function submitPayment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const groupId = formData.get("groupId") as string;
  const payerId = formData.get("payerId") as string;
  const recipientId = formData.get("recipientId") as string;
  const amountHome = formData.get("amountHome") as string;
  const date = formData.get("date") as string;

  if (payerId === recipientId) {
    throw new Error("Sender and recipient cannot be the same");
  }

  const { error } = await supabase.from("entries").insert({
    group_id: groupId,
    type: "payment",
    date,
    amount_home: new Decimal(amountHome).toFixed(2),
    payer_id: payerId,
    recipient_id: recipientId,
    created_by: payerId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  return { success: true };
}

export async function deleteEntry(entryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
