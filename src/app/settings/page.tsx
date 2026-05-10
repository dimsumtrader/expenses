import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsForm from "./settings-form";
import type { ProfileRow, GroupRow } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, group_id, display_name, groups(id, room_id, name, home_currency)")
    .eq("user_id", user.id)
    .returns<ProfileRow[]>();

  if (!profiles || profiles.length === 0) redirect("/setup");

  return <SettingsForm profiles={profiles} />;
}
