import { getUserId } from "@/lib/supabase/server";
import SetupForm from "./setup-form";

export default async function SetupPage() {
  await getUserId();
  return <SetupForm />;
}
