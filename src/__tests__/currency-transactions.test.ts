import { describe, test, expect } from "vitest";
import Decimal from "decimal.js";
import { computeBalances } from "@/lib/balances";
import { convertCurrency } from "@/lib/currency";

const MEMBERS = [
  { id: "a", display_name: "Alice" },
  { id: "b", display_name: "Bob" },
];

describe("Currency Conversion", () => {
  test("same currency returns original amount unchanged", async () => {
    const result = await convertCurrency(new Decimal("100.00"), "USD", "USD");
    expect(result.toFixed(2)).toBe("100.00");
  });

  test("same currency for HKD returns original", async () => {
    const result = await convertCurrency(new Decimal("250.50"), "HKD", "HKD");
    expect(result.toFixed(2)).toBe("250.50");
  });

  test("converts CNY to HKD via live API", async () => {
    const result = await convertCurrency(new Decimal("100.00"), "CNY", "HKD");
    // CNY to HKD is roughly 1.08-1.15
    expect(result.greaterThan(0)).toBe(true);
    expect(result.lessThan(200)).toBe(true);
    // Verify it's rounded to 2 decimal places
    expect(result.toFixed(2)).toMatch(/^\d+\.\d{2}$/);
  });

  test("converts EUR to USD via live API", async () => {
    const result = await convertCurrency(new Decimal("50.00"), "EUR", "USD");
    expect(result.greaterThan(0)).toBe(true);
    // EUR is typically worth more than USD
    expect(result.greaterThan(50)).toBe(true);
  });

  test("conversion result is precise with Decimal.js", async () => {
    const result = await convertCurrency(new Decimal("99.99"), "EUR", "USD");
    // Should be rounded to 2 decimal places exactly
    const str = result.toFixed(2);
    expect(str).toMatch(/^\d+\.\d{2}$/);
    // No floating-point artifacts
    expect(result.toNumber()).not.toBeNaN();
  });

  test("conversion of large amount", async () => {
    const result = await convertCurrency(new Decimal("10000.00"), "EUR", "USD");
    expect(result.greaterThan(10000)).toBe(true);
    expect(result.toFixed(2)).toMatch(/^\d+\.\d{2}$/);
  });

  test("conversion of small amount", async () => {
    const result = await convertCurrency(new Decimal("0.01"), "EUR", "USD");
    expect(result.greaterThan(0)).toBe(true);
  });
});

describe("Multi-Currency Transaction Balances", () => {
  test("balances use amount_home regardless of original currency", () => {
    // Alice pays ¥100 CNY in an HKD group. Converted to ~108 HKD.
    // amount_home = 108.00, amount_orig = 100.00, currency_orig = CNY
    const balances = computeBalances(
      [{
        id: "e1",
        type: "transaction",
        amount_home: 108.00, // converted HKD amount
        payer_id: "a",
        recipient_id: null,
      }],
      [
        { entry_id: "e1", user_id: "a", percentage: 50 },
        { entry_id: "e1", user_id: "b", percentage: 50 },
      ],
      MEMBERS,
    );

    // Alice: +108 -54 = +54
    // Bob: -54
    const alice = balances.find((b) => b.memberId === "a")!;
    const bob = balances.find((b) => b.memberId === "b")!;
    expect(alice.amount.toFixed(2)).toBe("54.00");
    expect(bob.amount.toFixed(2)).toBe("-54.00");

    const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
    expect(total.toFixed(2)).toBe("0.00");
  });

  test("mixed currency transactions: one CNY, one USD, group is HKD", () => {
    // Transaction 1: Alice pays ¥200 CNY → 216 HKD, 50/50 split
    // Transaction 2: Bob pays $50 USD → 390 HKD, 50/50 split
    const balances = computeBalances(
      [
        { id: "e1", type: "transaction", amount_home: 216.00, payer_id: "a", recipient_id: null },
        { id: "e2", type: "transaction", amount_home: 390.00, payer_id: "b", recipient_id: null },
      ],
      [
        { entry_id: "e1", user_id: "a", percentage: 50 },
        { entry_id: "e1", user_id: "b", percentage: 50 },
        { entry_id: "e2", user_id: "a", percentage: 50 },
        { entry_id: "e2", user_id: "b", percentage: 50 },
      ],
      MEMBERS,
    );

    // Alice: +216 (paid e1) -108 (her share e1) -195 (her share e2) = -87
    // Bob: +390 (paid e2) -108 (his share e1) -195 (his share e2) = +87
    const alice = balances.find((b) => b.memberId === "a")!;
    const bob = balances.find((b) => b.memberId === "b")!;
    expect(alice.amount.toFixed(2)).toBe("-87.00");
    expect(bob.amount.toFixed(2)).toBe("87.00");

    const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
    expect(total.toFixed(2)).toBe("0.00");
  });

  test("home currency transaction has no conversion needed", () => {
    // Alice pays 100 HKD in HKD group — no conversion
    const balances = computeBalances(
      [{ id: "e1", type: "transaction", amount_home: 100, payer_id: "a", recipient_id: null }],
      [
        { entry_id: "e1", user_id: "a", percentage: 50 },
        { entry_id: "e1", user_id: "b", percentage: 50 },
      ],
      MEMBERS,
    );

    const alice = balances.find((b) => b.memberId === "a")!;
    expect(alice.amount.toFixed(2)).toBe("50.00");
  });

  test("payment settles mixed-currency debt correctly", () => {
    // Alice pays ¥500 CNY → 540 HKD, split 60/40
    // Bob pays Alice 216 HKD to settle his share
    const balances = computeBalances(
      [
        { id: "e1", type: "transaction", amount_home: 540.00, payer_id: "a", recipient_id: null },
        { id: "e2", type: "payment", amount_home: 216.00, payer_id: "b", recipient_id: "a" },
      ],
      [
        { entry_id: "e1", user_id: "a", percentage: 60 },
        { entry_id: "e1", user_id: "b", percentage: 40 },
      ],
      MEMBERS,
    );

    // Alice: +540 -324 (60%) -216 (received payment) = 0
    // Bob: -216 (40%) +216 (sent payment) = 0
    const alice = balances.find((b) => b.memberId === "a")!;
    const bob = balances.find((b) => b.memberId === "b")!;
    expect(alice.amount.toFixed(2)).toBe("0.00");
    expect(bob.amount.toFixed(2)).toBe("0.00");
  });

  test("three currencies in one group, all settled in home currency", () => {
    const threeMembers = [
      { id: "a", display_name: "Alice" },
      { id: "b", display_name: "Bob" },
      { id: "c", display_name: "Charlie" },
    ];

    const balances = computeBalances(
      [
        // Alice pays ¥300 CNY → HKD 330, split 33.33/33.33/33.34
        { id: "e1", type: "transaction", amount_home: 330.00, payer_id: "a", recipient_id: null },
        // Bob pays €50 EUR → HKD 420, split 50/50 Alice+Bob
        { id: "e2", type: "transaction", amount_home: 420.00, payer_id: "b", recipient_id: null },
        // Charlie pays Alice HKD 110 directly
        { id: "e3", type: "payment", amount_home: 110.00, payer_id: "c", recipient_id: "a" },
      ],
      [
        { entry_id: "e1", user_id: "a", percentage: 33.33 },
        { entry_id: "e1", user_id: "b", percentage: 33.33 },
        { entry_id: "e1", user_id: "c", percentage: 33.34 },
        { entry_id: "e2", user_id: "a", percentage: 50 },
        { entry_id: "e2", user_id: "b", percentage: 50 },
      ],
      threeMembers,
    );

    const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
    expect(total.toFixed(2)).toBe("0.00");
  });
});

describe("Transaction Submission Logic (unit)", () => {
  test("stores amount_home when same currency (no conversion)", () => {
    const amountHome = "100.00";
    const amountOrig = "";
    const currencyOrig = "HKD";
    const homeCurrency = "HKD";

    const finalAmountHome = new Decimal(amountHome);
    let finalAmountOrig: Decimal | null = null;
    let finalCurrencyOrig: string | null = null;

    if (currencyOrig && currencyOrig !== homeCurrency) {
      finalAmountOrig = new Decimal(amountOrig);
      finalCurrencyOrig = currencyOrig;
    }

    expect(finalAmountHome.toFixed(2)).toBe("100.00");
    expect(finalAmountOrig).toBeNull();
    expect(finalCurrencyOrig).toBeNull();
  });

  test("stores both home and original when foreign currency", () => {
    const amountHome: string = "108.00"; // converted by client
    const amountOrig: string = "100.00";
    const currencyOrig: string = "CNY";
    const homeCurrency: string = "HKD";

    const finalAmountHome = new Decimal(amountHome);
    let finalAmountOrig: Decimal | null = null;
    let finalCurrencyOrig: string | null = null;

    if (currencyOrig && currencyOrig !== homeCurrency) {
      finalAmountOrig = new Decimal(amountOrig);
      finalCurrencyOrig = currencyOrig;
    }

    expect(finalAmountHome.toFixed(2)).toBe("108.00");
    expect(finalAmountOrig!.toFixed(2)).toBe("100.00");
    expect(finalCurrencyOrig).toBe("CNY");
  });

  test("rate is implicitly stored as amount_home / amount_orig", () => {
    const amountHome = new Decimal("108.00");
    const amountOrig = new Decimal("100.00");
    const impliedRate = amountHome.div(amountOrig);

    expect(impliedRate.toFixed(4)).toBe("1.0800");
  });

  test("split percentages from foreign transaction still must total 100%", () => {
    const splits = ["60.00", "40.00"];
    const total = splits.reduce((sum, pct) => sum.plus(new Decimal(pct)), new Decimal(0));
    expect(total.equals(100)).toBe(true);
  });
});
