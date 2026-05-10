"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";

function generateRoomId(): string {
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += Math.floor(Math.random() * 10).toString();
  }
  return id;
}

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName = formData.get("displayName") as string;
  const homeCurrency = formData.get("homeCurrency") as string;
  const groupName = (formData.get("groupName") as string) || "My Group";

  let roomId = generateRoomId();
  let attempts = 0;
  while (attempts < 5) {
    const { error } = await supabase
      .from("groups")
      .insert({ room_id: roomId, name: groupName, home_currency: homeCurrency });

    if (!error) break;
    if (error.code === "23505") {
      roomId = generateRoomId();
      attempts++;
    } else {
      throw new Error(error.message);
    }
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("room_id", roomId)
    .single();

  if (!group) throw new Error("Failed to create group");

  await supabase.from("profiles").insert({
    user_id: user.id,
    group_id: group.id,
    display_name: displayName,
  });

  revalidatePath("/");
  redirect("/");
}

export async function joinGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName = formData.get("displayName") as string;
  const roomId = (formData.get("roomId") as string).trim();

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("room_id", roomId)
    .single();

  if (!group) throw new Error("Group not found");

  // Check if user previously left this group — reactivate instead of inserting
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", group.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("profiles")
      .update({ display_name: displayName, removed_at: null })
      .eq("id", existing.id);
  } else {
    await supabase.from("profiles").insert({
      user_id: user.id,
      group_id: group.id,
      display_name: displayName,
    });
  }

  revalidatePath("/");
  redirect(`/?g=${group.id}`);
}

export async function updateGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const groupId = formData.get("groupId") as string;
  const name = formData.get("name") as string;
  const homeCurrency = formData.get("homeCurrency") as string;

  const { error } = await supabase
    .from("groups")
    .update({ name, home_currency: homeCurrency })
    .eq("id", groupId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function saveDefaultSplits(groupId: string, splits: { userId: string; percentage: string }[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const total = splits.reduce((sum, s) => sum.plus(new Decimal(s.percentage || "0")), new Decimal(0));
  if (!total.equals(100)) throw new Error("Default splits must total 100%");

  await supabase.from("default_splits").delete().eq("group_id", groupId);

  if (splits.length > 0) {
    const rows = splits.map((s) => ({
      group_id: groupId,
      user_id: s.userId,
      percentage: new Decimal(s.percentage).toFixed(2),
    }));
    const { error } = await supabase.from("default_splits").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function saveGroupSettings(
  groupId: string,
  name: string,
  homeCurrency: string,
  splits: { userId: string; percentage: string }[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: groupError } = await supabase
    .from("groups")
    .update({ name, home_currency: homeCurrency })
    .eq("id", groupId);
  if (groupError) throw new Error(groupError.message);

  const total = splits.reduce((sum, s) => sum.plus(new Decimal(s.percentage || "0")), new Decimal(0));
  if (!total.equals(100)) throw new Error("Default splits must total 100%");

  await supabase.from("default_splits").delete().eq("group_id", groupId);
  if (splits.length > 0) {
    const rows = splits.map((s) => ({
      group_id: groupId,
      user_id: s.userId,
      percentage: new Decimal(s.percentage).toFixed(2),
    }));
    const { error: splitsError } = await supabase.from("default_splits").insert(rows);
    if (splitsError) throw new Error(splitsError.message);
  }

  revalidatePath("/");
  redirect("/");
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ removed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("group_id", groupId);

  if (error) throw new Error(error.message);

  if (profile) {
    await supabase.from("default_splits").delete().eq("group_id", groupId).eq("user_id", profile.id);
  }

  revalidatePath("/");
}
