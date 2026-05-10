"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function generateRoomId(): string {
  let id = "";
  for (let i = 0; i < 6; i++) {
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

  if (!group) throw new Error("Room not found");

  await supabase.from("profiles").insert({
    user_id: user.id,
    group_id: group.id,
    display_name: displayName,
  });

  revalidatePath("/");
  redirect("/");
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
