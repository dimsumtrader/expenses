import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { computeBalances } from "@/lib/balances";
import DashboardClient from "./dashboard-client";
import type { GroupRow, ProfileRow, EntryRow, SplitRow } from "@/lib/types";

export default async function Home({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const params = await searchParams;
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

  // Select active group: from ?g= param, or first group
  const activeProfile = params.g
    ? profiles.find((p) => p.group_id === params.g) ?? profiles[0]
    : profiles[0];

  const group = Array.isArray(activeProfile.groups)
    ? activeProfile.groups[0]
    : activeProfile.groups;

  // Build list of all user's groups
  const allGroups = profiles.map((p) => {
    const g = Array.isArray(p.groups) ? p.groups[0] : p.groups;
    return { id: p.group_id, name: g.name, room_id: g.room_id, home_currency: g.home_currency };
  });

  const [membersResult, entriesResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("group_id", activeProfile.group_id),
    supabase
      .from("entries")
      .select("id, type, title, date, amount_home, amount_orig, currency_orig, payer_id, recipient_id, created_by, created_at")
      .eq("group_id", activeProfile.group_id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<EntryRow[]>(),
  ]);

  const members = membersResult.data ?? [];
  const entries = entriesResult.data ?? [];

  // Fetch splits scoped to this group's entries
  const entryIds = entries.map((e) => e.id);
  const { data: splitsData } = entryIds.length > 0
    ? await supabase
        .from("splits")
        .select("id, entry_id, user_id, percentage")
        .in("entry_id", entryIds)
        .returns<SplitRow[]>()
    : { data: [] };
  const splits = splitsData ?? [];

  const balances = computeBalances(
    entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount_home: Number(e.amount_home),
      payer_id: e.payer_id,
      recipient_id: e.recipient_id,
    })),
    splits.map((s) => ({
      entry_id: s.entry_id,
      user_id: s.user_id,
      percentage: Number(s.percentage),
    })),
    members.map((m) => ({ id: m.id, display_name: m.display_name })),
  );



  return (
    <DashboardClient
      group={group}
      allGroups={allGroups}
      members={members}
      balances={balances.map((b) => ({
        memberId: b.memberId,
        displayName: b.displayName,
        amount: b.amount.toFixed(2),
      }))}
      entries={entries}
      profiles={members}
      userId={user.id}
      profileId={activeProfile.id}
    />
  );
}
