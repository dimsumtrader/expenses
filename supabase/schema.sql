-- ============================================
-- EXPENSES: Supabase PostgreSQL Schema
-- ============================================

-- Clean slate (safe to re-run)
DROP FUNCTION IF EXISTS get_my_group_id() CASCADE;
DROP FUNCTION IF EXISTS check_split_total() CASCADE;
DROP TABLE IF EXISTS splits CASCADE;
DROP TABLE IF EXISTS default_splits CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TYPE IF EXISTS entry_type;

-- Custom types
CREATE TYPE entry_type AS ENUM ('transaction', 'payment');

-- -------------------------------------------
-- Groups
-- -------------------------------------------
CREATE TABLE groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       VARCHAR(4) NOT NULL UNIQUE CHECK (room_id ~ '^[0-9]{4}$'),
  name          TEXT NOT NULL DEFAULT 'My Group',
  home_currency CHAR(3)    NOT NULL DEFAULT 'USD',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_room_id ON groups (room_id);

-- -------------------------------------------
-- Profiles (users within a group)
-- -------------------------------------------
CREATE TABLE profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  group_id     UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) <= 30),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at   TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (user_id, group_id)
);

CREATE INDEX idx_profiles_user_id  ON profiles (user_id);
CREATE INDEX idx_profiles_group_id ON profiles (group_id);

-- -------------------------------------------
-- RLS helper function (SECURITY DEFINER)
-- Returns array of group_ids the current user belongs to.
-- Runs as postgres, bypasses RLS on profiles for fast lookups.
-- -------------------------------------------
CREATE OR REPLACE FUNCTION get_my_group_id()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(ARRAY_AGG(group_id), '{}') FROM profiles WHERE user_id = auth.uid() AND removed_at IS NULL
$$;

-- -------------------------------------------
-- Entries (transactions + payments)
-- -------------------------------------------
CREATE TABLE entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID       NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  type           entry_type NOT NULL,
  title          TEXT,
  date           DATE       NOT NULL DEFAULT current_date,
  amount_home    NUMERIC(15,2) NOT NULL CHECK (amount_home > 0),
  amount_orig    NUMERIC(15,2),
  currency_orig  CHAR(3),
  payer_id       UUID       NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  recipient_id   UUID       REFERENCES profiles (id) ON DELETE CASCADE,
  created_by     UUID       NOT NULL REFERENCES profiles (id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_has_recipient CHECK (
    (type = 'payment' AND recipient_id IS NOT NULL) OR
    (type = 'transaction')
  ),
  CONSTRAINT payment_sender_ne_receiver CHECK (
    type = 'transaction' OR payer_id IS DISTINCT FROM recipient_id
  ),
  CONSTRAINT transaction_has_title CHECK (
    (type = 'transaction' AND title IS NOT NULL) OR
    (type = 'payment')
  ),
  CONSTRAINT foreign_currency_has_original CHECK (
    (currency_orig IS NOT NULL AND amount_orig IS NOT NULL) OR
    (currency_orig IS NULL AND amount_orig IS NULL)
  )
);

CREATE INDEX idx_entries_group_id    ON entries (group_id);
CREATE INDEX idx_entries_group_date  ON entries (group_id, date DESC);

-- -------------------------------------------
-- Splits (percentage breakdown per transaction)
-- -------------------------------------------
CREATE TABLE splits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id   UUID        NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  UNIQUE (entry_id, user_id)
);

CREATE INDEX idx_splits_entry_id ON splits (entry_id);

-- -------------------------------------------
-- Default Splits (per-member default % per group)
-- -------------------------------------------
CREATE TABLE default_splits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID        NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_default_splits_group_id ON default_splits (group_id);

-- Split integrity: sum of percentages per transaction must equal 100%
CREATE OR REPLACE FUNCTION check_split_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  entry_type_val entry_type;
  total_pct NUMERIC(7,2);
BEGIN
  SELECT e.type INTO entry_type_val FROM entries e WHERE e.id = NEW.entry_id;
  IF entry_type_val = 'transaction' THEN
    SELECT COALESCE(SUM(s.percentage), 0) INTO total_pct
    FROM splits s WHERE s.entry_id = NEW.entry_id;
    IF total_pct <> 100 THEN
      RAISE EXCEPTION 'Splits for entry % must total 100%% (got %)', NEW.entry_id, total_pct;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Note: trigger is created AFTER initial inserts since the entry + splits
-- are inserted in sequence within a transaction. Enable once app logic
-- inserts all splits before committing, or use DEFERRABLE constraints.
-- CREATE TRIGGER enforce_split_total
--   AFTER INSERT OR UPDATE ON splits
--   FOR EACH ROW EXECUTE FUNCTION check_split_total();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE splits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_splits ENABLE ROW LEVEL SECURITY;

-- Groups: members can read their groups
CREATE POLICY "groups: read own group"
  ON groups FOR SELECT
  USING (id = ANY(get_my_group_id()));

-- Groups: authenticated users can lookup any group by room_id (Join Room flow)
CREATE POLICY "groups: lookup for join"
  ON groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Groups: authenticated users can create rooms
CREATE POLICY "groups: insert authenticated"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Groups: members can update their own groups
CREATE POLICY "groups: update own group"
  ON groups FOR UPDATE
  USING (id = ANY(get_my_group_id()));

-- Profiles: read active group members (excludes left users)
CREATE POLICY "profiles: read group members"
  ON profiles FOR SELECT
  USING (group_id = ANY(get_my_group_id()) AND removed_at IS NULL);

CREATE POLICY "profiles: insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles: update own name"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Entries: full CRUD within own group
CREATE POLICY "entries: read group"
  ON entries FOR SELECT
  USING (group_id = ANY(get_my_group_id()));

CREATE POLICY "entries: insert group"
  ON entries FOR INSERT
  WITH CHECK (group_id = ANY(get_my_group_id()));

CREATE POLICY "entries: update group"
  ON entries FOR UPDATE
  USING (group_id = ANY(get_my_group_id()));

CREATE POLICY "entries: delete group"
  ON entries FOR DELETE
  USING (group_id = ANY(get_my_group_id()));

-- Splits: full CRUD within own group (via entry → group)
CREATE POLICY "splits: read group"
  ON splits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM entries e
    WHERE e.id = splits.entry_id AND e.group_id = ANY(get_my_group_id())
  ));

CREATE POLICY "splits: insert group"
  ON splits FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM entries e
    WHERE e.id = splits.entry_id AND e.group_id = ANY(get_my_group_id())
  ));

CREATE POLICY "splits: update group"
  ON splits FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM entries e
    WHERE e.id = splits.entry_id AND e.group_id = ANY(get_my_group_id())
  ));

CREATE POLICY "splits: delete group"
  ON splits FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM entries e
    WHERE e.id = splits.entry_id AND e.group_id = ANY(get_my_group_id())
  ));

-- Default Splits: full CRUD within own group
CREATE POLICY "default_splits: read group"
  ON default_splits FOR SELECT
  USING (group_id = ANY(get_my_group_id()));

CREATE POLICY "default_splits: insert group"
  ON default_splits FOR INSERT
  WITH CHECK (group_id = ANY(get_my_group_id()));

CREATE POLICY "default_splits: update group"
  ON default_splits FOR UPDATE
  USING (group_id = ANY(get_my_group_id()));

CREATE POLICY "default_splits: delete group"
  ON default_splits FOR DELETE
  USING (group_id = ANY(get_my_group_id()));
