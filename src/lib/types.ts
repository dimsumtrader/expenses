export type EntryType = "transaction" | "payment";

export type GroupRow = {
  id: string;
  room_id: string;
  name: string;
  home_currency: string;
};

export type ProfileRow = {
  id: string;
  user_id: string;
  group_id: string;
  display_name: string;
  groups: GroupRow[] | GroupRow;
};

export type EntryRow = {
  id: string;
  group_id: string;
  type: EntryType;
  title: string | null;
  date: string;
  amount_home: number;
  amount_orig: number | null;
  currency_orig: string | null;
  payer_id: string;
  recipient_id: string | null;
  created_by: string;
  created_at: string;
};

export type SplitRow = {
  id: string;
  entry_id: string;
  user_id: string;
  percentage: number;
};

export type DefaultSplitRow = {
  id: string;
  group_id: string;
  user_id: string;
  percentage: number;
};
