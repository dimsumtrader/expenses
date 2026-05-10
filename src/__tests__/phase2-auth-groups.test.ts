import { describe, test, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mjvfcenhepujxzmmuhyj.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_BTfhvqaa1iTRcZrsSGunRQ_kFmpYlEy";

function anonClient() {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY);
}

describe("Phase 2: Auth & Groups", () => {
  // -------------------------------------------------------
  // 1. Unauthenticated Access (RLS blocks all reads)
  // -------------------------------------------------------
  describe("Unauthenticated Access", () => {
    test("profiles table returns empty for anon user", async () => {
      const supabase = anonClient();
      const { data, error } = await supabase.from("profiles").select("*");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("entries table returns empty for anon user", async () => {
      const supabase = anonClient();
      const { data, error } = await supabase.from("entries").select("*");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("splits table returns empty for anon user", async () => {
      const supabase = anonClient();
      const { data, error } = await supabase.from("splits").select("*");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("groups table returns empty for anon user (no auth.uid)", async () => {
      const supabase = anonClient();
      const { data, error } = await supabase.from("groups").select("*");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("anon user cannot insert into groups (RLS blocks)", async () => {
      const supabase = anonClient();
      const { error } = await supabase
        .from("groups")
        .insert({ room_id: "0000", home_currency: "USD" });

      expect(error).toBeTruthy();
      expect(error!.code).toBe("42501"); // insufficient privilege
    });

    test("anon user cannot insert into profiles (RLS blocks)", async () => {
      const supabase = anonClient();
      const { error } = await supabase
        .from("profiles")
        .insert({ user_id: "00000000-0000-0000-0000-000000000000", group_id: "00000000-0000-0000-0000-000000000000", display_name: "Hacker" });

      expect(error).toBeTruthy();
      expect(error!.code).toBe("42501");
    });

    test("anon user cannot insert into entries (RLS blocks)", async () => {
      const supabase = anonClient();
      const { error } = await supabase
        .from("entries")
        .insert({ group_id: "00000000-0000-0000-0000-000000000000", type: "payment", amount_home: 10, payer_id: "00000000-0000-0000-0000-000000000000", created_by: "00000000-0000-0000-0000-000000000000", recipient_id: "00000000-0000-0000-0000-000000000001" });

      expect(error).toBeTruthy();
      expect(error!.code).toBe("42501");
    });
  });

  // -------------------------------------------------------
  // 2. Group Lookup Logic
  // -------------------------------------------------------
  describe("Group Join Logic", () => {
    test("lookup non-existent room_id returns error", async () => {
      const supabase = anonClient();
      const { data, error } = await supabase
        .from("groups")
        .select("id")
        .eq("room_id", "9999")
        .single();

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error!.code).toBe("PGRST116"); // no rows returned
    });
  });

  // -------------------------------------------------------
  // 3. Schema Structure Verification
  // -------------------------------------------------------
  describe("Schema Structure", () => {
    test("groups table has expected columns", async () => {
      const supabase = anonClient();
      const { data, error } = await supabase
        .from("groups")
        .select("id, room_id, name, home_currency, created_at")
        .limit(0);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("profiles table has expected columns", async () => {
      const supabase = anonClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, group_id, display_name, created_at")
        .limit(0);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("entries table has expected columns", async () => {
      const supabase = anonClient();
      const { data, error } = await supabase
        .from("entries")
        .select("id, group_id, type, title, date, amount_home, amount_orig, currency_orig, payer_id, recipient_id, created_by, created_at")
        .limit(0);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    test("splits table has expected columns", async () => {
      const supabase = anonClient();
      const { data, error } = await supabase
        .from("splits")
        .select("id, entry_id, user_id, percentage")
        .limit(0);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });
});
