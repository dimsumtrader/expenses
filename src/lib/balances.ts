import Decimal from "decimal.js";

type Entry = {
  id: string;
  type: "transaction" | "payment";
  amount_home: number;
  payer_id: string;
  recipient_id: string | null;
};

type Split = {
  entry_id: string;
  user_id: string;
  percentage: number;
};

type Member = { id: string; display_name: string };

export type Balance = {
  memberId: string;
  displayName: string;
  amount: Decimal;
};

/**
 * Net balance per member:
 *   (Total Paid + Payments Received) - (User's Split Share + Payments Sent)
 */
export function computeBalances(
  entries: Entry[],
  splits: Split[],
  members: Member[],
): Balance[] {
  const balances = new Map<string, Decimal>();
  members.forEach((m) => balances.set(m.id, new Decimal(0)));

  for (const entry of entries) {
    if (entry.type === "transaction") {
      // Payer gets +amount_home
      balances.set(
        entry.payer_id,
        (balances.get(entry.payer_id) ?? new Decimal(0)).plus(new Decimal(entry.amount_home)),
      );

      // Each split member owes their share
      const entrySplits = splits.filter((s) => s.entry_id === entry.id);
      const amountHome = new Decimal(entry.amount_home);

      // Compute absolute shares with remainder-for-last to avoid penny-drop
      let runningTotal = new Decimal(0);
      const sortedSplits = [...entrySplits].sort((a, b) =>
        a.user_id.localeCompare(b.user_id),
      );

      for (let i = 0; i < sortedSplits.length; i++) {
        let share: Decimal;
        if (i === sortedSplits.length - 1) {
          share = amountHome.minus(runningTotal);
        } else {
          share = amountHome
            .times(new Decimal(sortedSplits[i].percentage))
            .div(100)
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          runningTotal = runningTotal.plus(share);
        }

        balances.set(
          sortedSplits[i].user_id,
          (balances.get(sortedSplits[i].user_id) ?? new Decimal(0)).minus(share),
        );
      }
    }

    if (entry.type === "payment") {
      // Recipient gets +amount_home, payer gets -amount_home
      balances.set(
        entry.payer_id,
        (balances.get(entry.payer_id) ?? new Decimal(0)).minus(new Decimal(entry.amount_home)),
      );
      if (entry.recipient_id) {
        balances.set(
          entry.recipient_id,
          (balances.get(entry.recipient_id) ?? new Decimal(0)).plus(new Decimal(entry.amount_home)),
        );
      }
    }
  }

  return members.map((m) => ({
    memberId: m.id,
    displayName: m.display_name,
    amount: balances.get(m.id) ?? new Decimal(0),
  }));
}
