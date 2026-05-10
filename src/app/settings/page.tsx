import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsForm from "./settings-form";
import type { ProfileRow, DefaultSplitRow } from "@/lib/types";

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
    .is("removed_at", null)
    .returns<ProfileRow[]>();

  if (!profiles || profiles.length === 0) redirect("/setup");

  const groupIds = profiles.map((p) => p.group_id);

  const [defaultSplitsResult, membersResult] = await Promise.all([
    supabase
      .from("default_splits")
      .select("id, group_id, user_id, percentage")
      .in("group_id", groupIds)
      .returns<DefaultSplitRow[]>(),
    supabase
      .from("profiles")
      .select("id, group_id, display_name")
      .in("group_id", groupIds)
      .is("removed_at", null),
  ]);

  return (
    <SettingsForm
      profiles={profiles}
      defaultSplits={defaultSplitsResult.data ?? []}
      members={membersResult.data ?? []}
    />
  );
}
