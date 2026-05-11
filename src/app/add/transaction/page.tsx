import { createClient, getUserId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TransactionForm from "./transaction-form";
import type { ProfileRow, GroupRow, DefaultSplitRow } from "@/lib/types";

export default async function AddTransactionPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const params = await searchParams;
  const [userId, supabase] = await Promise.all([
    getUserId(),
    createClient(),
  ]);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, group_id, display_name, groups(id, room_id, name, home_currency)")
    .eq("user_id", userId)
    .returns<ProfileRow[]>();

  if (!profiles || profiles.length === 0) redirect("/setup");

  const activeProfile = params.g
    ? profiles.find((p) => p.group_id === params.g) ?? profiles[0]
    : profiles[0];
  const group = Array.isArray(activeProfile.groups)
    ? activeProfile.groups[0]
    : activeProfile.groups;

  const [membersResult, defaultSplitsResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("group_id", activeProfile.group_id).is("removed_at", null),
    supabase
      .from("default_splits")
      .select("id, group_id, user_id, percentage")
      .eq("group_id", activeProfile.group_id)
      .returns<DefaultSplitRow[]>(),
  ]);

  return (
    <TransactionForm
      groupId={activeProfile.group_id}
      group={group}
      members={membersResult.data ?? []}
      userId={userId}
      profileId={activeProfile.id}
      defaultSplits={defaultSplitsResult.data ?? []}
    />
  );
}
