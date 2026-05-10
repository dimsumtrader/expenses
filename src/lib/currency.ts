import Decimal from "decimal.js";

type FrankfurterResponse = {
  rates: Record<string, number>;
};

export async function convertCurrency(
  amount: Decimal,
  from: string,
  to: string,
): Promise<Decimal> {
  if (from === to) return amount;

  const res = await fetch(
    `https://api.frankfurter.app/latest?amount=1&from=${from}&to=${to}`,
  );
  if (!res.ok) throw new Error("Currency conversion failed");

  const data: FrankfurterResponse = await res.json();
  const rate = data.rates[to];
  if (!rate) throw new Error(`No rate for ${from} → ${to}`);

  return amount.times(new Decimal(rate)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
