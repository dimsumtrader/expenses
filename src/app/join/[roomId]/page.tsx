import { createClient, getUserId } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JoinForm from "./join-form";

export default async function JoinPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const [userId, supabase] = await Promise.all([
    getUserId(),
    createClient(),
  ]);

  const { data: group } = await supabase
    .from("groups")
    .select("id, room_id, name, home_currency")
    .eq("room_id", roomId)
    .single();

  if (!group) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm border-2 border-black rounded-none p-6 text-center">
          <h1 className="font-mono text-xl font-bold mb-2">GROUP NOT FOUND</h1>
          <p className="text-sm">No group with code <strong className="font-mono">{roomId}</strong></p>
        </div>
      </main>
    );
  }

  // Check if user is already in this group
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("group_id", group.id)
    .single();

  if (existingProfile) {
    redirect("/");
  }

  return <JoinForm group={group} />;
}
