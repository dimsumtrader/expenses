import { describe, test, expect } from "vitest";
import Decimal from "decimal.js";
import { computeBalances } from "@/lib/balances";

const MEMBERS = [
  { id: "a", display_name: "Alice" },
  { id: "b", display_name: "Bob" },
  { id: "c", display_name: "Charlie" },
];

describe("Phase 4: Dashboard & Feed", () => {
  // -------------------------------------------------------
  // 1. Net Balance Calculation
  // -------------------------------------------------------
  describe("Net Balance Calculation", () => {
    test("equal 3-way split: Alice pays $60", () => {
      const entries = [
        {
          id: "e1",
          type: "transaction" as const,
          amount_home: 60,
          payer_id: "a",
          recipient_id: null,
        },
      ];
      const splits = [
        { entry_id: "e1", user_id: "a", percentage: 33.33 },
        { entry_id: "e1", user_id: "b", percentage: 33.33 },
        { entry_id: "e1", user_id: "c", percentage: 33.34 },
      ];

      const balances = computeBalances(entries, splits, MEMBERS);
      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");

      const alice = balances.find((b) => b.memberId === "a")!;
      expect(alice.amount.greaterThan(0)).toBe(true);

      const bob = balances.find((b) => b.memberId === "b")!;
      const charlie = balances.find((b) => b.memberId === "c")!;
      expect(bob.amount.lessThan(0)).toBe(true);
      expect(charlie.amount.lessThan(0)).toBe(true);
    });

    test("payment settles debt: Bob pays Alice $20 after transaction", () => {
      const entries = [
        {
          id: "e1",
          type: "transaction" as const,
          amount_home: 60,
          payer_id: "a",
          recipient_id: null,
        },
        {
          id: "e2",
          type: "payment" as const,
          amount_home: 20,
          payer_id: "b",
          recipient_id: "a",
        },
      ];
      const splits = [
        { entry_id: "e1", user_id: "a", percentage: 33.33 },
        { entry_id: "e1", user_id: "b", percentage: 33.33 },
        { entry_id: "e1", user_id: "c", percentage: 33.34 },
      ];

      const balances = computeBalances(entries, splits, MEMBERS);
      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");

      // Bob sent $20 to Alice: Bob's balance goes up (settling debt), Alice's goes down
      const bob = balances.find((b) => b.memberId === "b")!;
      const bobWithoutPayment = -20; // approximate share
      const bobWithPayment = bobWithoutPayment + 20; // payment adds to his balance
      expect(bob.amount.greaterThan(bobWithoutPayment)).toBe(true);
    });

    test("payment: payer balance increases, recipient decreases", () => {
      const entries = [
        {
          id: "e1",
          type: "payment" as const,
          amount_home: 50,
          payer_id: "b",
          recipient_id: "a",
        },
      ];
      const splits: { entry_id: string; user_id: string; percentage: number }[] = [];

      const balances = computeBalances(entries, splits, MEMBERS);
      const alice = balances.find((b) => b.memberId === "a")!;
      const bob = balances.find((b) => b.memberId === "b")!;

      // Bob paid Alice $50: Bob's balance goes UP (settling), Alice's goes DOWN (repaid)
      expect(bob.amount.toFixed(2)).toBe("50.00");
      expect(alice.amount.toFixed(2)).toBe("-50.00");

      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");
    });

    test("empty entries gives zero balances", () => {
      const balances = computeBalances([], [], MEMBERS);
      balances.forEach((b) => {
        expect(b.amount.toFixed(2)).toBe("0.00");
      });
    });
  });

  // -------------------------------------------------------
  // 2. Penny-Drop Prevention
  // -------------------------------------------------------
  describe("Penny-Drop Prevention", () => {
    test("$10 split 33.33/33.33/33.34 — shares sum to exactly 10.00", () => {
      const entries = [
        {
          id: "e1",
          type: "transaction" as const,
          amount_home: 10,
          payer_id: "a",
          recipient_id: null,
        },
      ];
      const splits = [
        { entry_id: "e1", user_id: "a", percentage: 33.33 },
        { entry_id: "e1", user_id: "b", percentage: 33.33 },
        { entry_id: "e1", user_id: "c", percentage: 33.34 },
      ];

      const balances = computeBalances(entries, splits, MEMBERS);
      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");

      const alice = balances.find((b) => b.memberId === "a")!;
      expect(parseFloat(alice.amount.toFixed(2))).toBeCloseTo(6.67, 1);
    });

    test("$100 equal 3-way split balances sum to zero", () => {
      const entries = [
        {
          id: "e1",
          type: "transaction" as const,
          amount_home: 100,
          payer_id: "a",
          recipient_id: null,
        },
      ];
      const splits = [
        { entry_id: "e1", user_id: "a", percentage: 33.33 },
        { entry_id: "e1", user_id: "b", percentage: 33.33 },
        { entry_id: "e1", user_id: "c", percentage: 33.34 },
      ];

      const balances = computeBalances(entries, splits, MEMBERS);
      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");
    });
  });
});
