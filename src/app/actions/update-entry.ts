"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const entryId = formData.get("entryId") as string;
  const title = formData.get("title") as string;
  const date = formData.get("date") as string;
  const amountHome = formData.get("amountHome") as string;
  const payerId = formData.get("payerId") as string;

  // Parse splits
  const splits: { userId: string; percentage: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("split_")) {
      const userId = key.replace("split_", "");
      splits.push({ userId, percentage: parseFloat(value as string) });
    }
  }

  const totalPct = splits.reduce(
    (sum, s) => sum.plus(new Decimal(s.percentage)),
    new Decimal(0),
  );
  if (!totalPct.equals(100)) {
    throw new Error(`Splits must total 100% (got ${totalPct.toFixed(2)}%)`);
  }

  // Update entry
  const { error: entryError } = await supabase
    .from("entries")
    .update({
      title,
      date,
      amount_home: new Decimal(amountHome).toFixed(2),
      payer_id: payerId,
    })
    .eq("id", entryId);

  if (entryError) throw new Error(entryError.message);

  // Replace splits: delete old, insert new
  await supabase.from("splits").delete().eq("entry_id", entryId);
  const splitRows = splits.map((s) => ({
    entry_id: entryId,
    user_id: s.userId,
    percentage: new Decimal(s.percentage).toFixed(2),
  }));
  const { error: splitsError } = await supabase.from("splits").insert(splitRows);
  if (splitsError) throw new Error(splitsError.message);

  revalidatePath("/");
  redirect("/");
}

export async function updatePayment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const entryId = formData.get("entryId") as string;
  const payerId = formData.get("payerId") as string;
  const recipientId = formData.get("recipientId") as string;
  const amountHome = formData.get("amountHome") as string;
  const date = formData.get("date") as string;

  if (payerId === recipientId) {
    throw new Error("Sender and recipient cannot be the same");
  }

  const { error } = await supabase
    .from("entries")
    .update({
      payer_id: payerId,
      recipient_id: recipientId,
      amount_home: new Decimal(amountHome).toFixed(2),
      date,
    })
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect("/");
}
