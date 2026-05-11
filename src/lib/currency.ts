import Decimal from "decimal.js";

type FrankfurterResponse = {
  rates: Record<string, number>;
};

type CacheEntry = { rate: number; timestamp: number };

const rateCache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h — ECB rates update once per business day

export async function convertCurrency(
  amount: Decimal,
  from: string,
  to: string,
): Promise<Decimal> {
  if (from === to) return amount;

  const key = `${from}-${to}`;
  const cached = rateCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return amount.times(new Decimal(cached.rate)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  const res = await fetch(
    `https://api.frankfurter.dev/v1/latest?amount=1&from=${from}&to=${to}`,
  );
  if (!res.ok) throw new Error("Currency conversion failed");

  const data: FrankfurterResponse = await res.json();
  const rate = data.rates[to];
  if (!rate) throw new Error(`No rate for ${from} → ${to}`);

  rateCache.set(key, { rate, timestamp: Date.now() });
  return amount.times(new Decimal(rate)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
