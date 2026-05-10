import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SetupForm from "./setup-form";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <SetupForm />;
}
