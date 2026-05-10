import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JoinForm from "./join-form";

export default async function JoinPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const supabase = await createClient();

  // Look up group by room_id
  const { data: group } = await supabase
    .from("groups")
    .select("id, room_id, name, home_currency")
    .eq("room_id", roomId)
    .single();

  if (!group) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm border-2 border-black rounded-none p-6 text-center">
          <h1 className="font-mono text-xl font-bold mb-2">ROOM NOT FOUND</h1>
          <p className="text-sm">No room with code <strong className="font-mono">{roomId}</strong></p>
        </div>
      </main>
    );
  }

  // Check if user is already authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/join/${roomId}`);
  }

  // Check if user is already in this group
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", group.id)
    .single();

  if (existingProfile) {
    redirect("/");
  }

  return <JoinForm group={group} />;
}
