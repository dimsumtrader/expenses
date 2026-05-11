import { createClient, getUserId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EditForm from "./edit-form";
import type { ProfileRow, GroupRow, EntryRow, SplitRow } from "@/lib/types";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [userId, supabase] = await Promise.all([
    getUserId(),
    createClient(),
  ]);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, group_id, display_name, groups(id, room_id, name, home_currency)")
    .eq("user_id", userId)
    .is("removed_at", null)
    .returns<ProfileRow[]>();

  if (!profiles || profiles.length === 0) redirect("/setup");

  const activeGroup = profiles[0];
  const group = Array.isArray(activeGroup.groups)
    ? activeGroup.groups[0]
    : activeGroup.groups;

  const [entryResult, membersResult, splitsResult] = await Promise.all([
    supabase
      .from("entries")
      .select("*")
      .eq("id", id)
      .eq("group_id", activeGroup.group_id)
      .returns<EntryRow[]>()
      .single(),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("group_id", activeGroup.group_id)
      .is("removed_at", null),
    supabase
      .from("splits")
      .select("id, entry_id, user_id, percentage")
      .eq("entry_id", id)
      .returns<SplitRow[]>(),
  ]);

  const entry = entryResult.data;
  if (!entry) redirect("/");

  return (
    <EditForm
      entry={entry}
      splits={splitsResult.data ?? []}
      group={group}
      members={membersResult.data ?? []}
    />
  );
}
