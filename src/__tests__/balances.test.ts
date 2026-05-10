import { describe, test, expect } from "vitest";
import Decimal from "decimal.js";
import { computeBalances } from "@/lib/balances";

const ALICE = { id: "a", display_name: "Alice" };
const BOB = { id: "b", display_name: "Bob" };
const CHARLIE = { id: "c", display_name: "Charlie" };
const MEMBERS = [ALICE, BOB, CHARLIE];

describe("computeBalances", () => {
  // -------------------------------------------------------
  // Transactions
  // -------------------------------------------------------
  describe("Transactions", () => {
    test("equal 3-way split: Alice pays $60", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "transaction", amount_home: 60, payer_id: "a", recipient_id: null }],
        [
          { entry_id: "e1", user_id: "a", percentage: 33.33 },
          { entry_id: "e1", user_id: "b", percentage: 33.33 },
          { entry_id: "e1", user_id: "c", percentage: 33.34 },
        ],
        MEMBERS,
      );

      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");

      const alice = balances.find((b) => b.memberId === "a")!;
      expect(alice.amount.greaterThan(0)).toBe(true);

      const bob = balances.find((b) => b.memberId === "b")!;
      const charlie = balances.find((b) => b.memberId === "c")!;
      expect(bob.amount.lessThan(0)).toBe(true);
      expect(charlie.amount.lessThan(0)).toBe(true);
    });

    test("payer not in split still gets +amount", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "transaction", amount_home: 100, payer_id: "a", recipient_id: null }],
        [
          { entry_id: "e1", user_id: "b", percentage: 50 },
          { entry_id: "e1", user_id: "c", percentage: 50 },
        ],
        MEMBERS,
      );

      // Alice paid $100, owes $0 → net +$100
      const alice = balances.find((b) => b.memberId === "a")!;
      expect(alice.amount.toFixed(2)).toBe("100.00");

      // Bob owes $50, Charlie owes $50
      const bob = balances.find((b) => b.memberId === "b")!;
      const charlie = balances.find((b) => b.memberId === "c")!;
      expect(bob.amount.toFixed(2)).toBe("-50.00");
      expect(charlie.amount.toFixed(2)).toBe("-50.00");
    });

    test("50/50 two-person split", () => {
      const twoMembers = [ALICE, BOB];
      const balances = computeBalances(
        [{ id: "e1", type: "transaction", amount_home: 100, payer_id: "a", recipient_id: null }],
        [
          { entry_id: "e1", user_id: "a", percentage: 50 },
          { entry_id: "e1", user_id: "b", percentage: 50 },
        ],
        twoMembers,
      );

      const alice = balances.find((b) => b.memberId === "a")!;
      const bob = balances.find((b) => b.memberId === "b")!;
      expect(alice.amount.toFixed(2)).toBe("50.00");
      expect(bob.amount.toFixed(2)).toBe("-50.00");

      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");
    });

    test("multiple transactions accumulate", () => {
      const balances = computeBalances(
        [
          { id: "e1", type: "transaction", amount_home: 60, payer_id: "a", recipient_id: null },
          { id: "e2", type: "transaction", amount_home: 30, payer_id: "b", recipient_id: null },
        ],
        [
          { entry_id: "e1", user_id: "a", percentage: 50 },
          { entry_id: "e1", user_id: "b", percentage: 50 },
          { entry_id: "e2", user_id: "a", percentage: 50 },
          { entry_id: "e2", user_id: "b", percentage: 50 },
        ],
        [ALICE, BOB],
      );

      const alice = balances.find((b) => b.memberId === "a")!;
      const bob = balances.find((b) => b.memberId === "b")!;
      // Alice: +60 -30 -15 +0 = +30 (paid 60 for e1, owes 30 for e1, owes 15 for e2)
      // Actually: +60 (paid e1) -30 (her share e1) +0 (didn't pay e2) -15 (her share e2) = +15
      expect(alice.amount.toFixed(2)).toBe("15.00");
      expect(bob.amount.toFixed(2)).toBe("-15.00");
    });

    test("100% paid by same person results in zero for them", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "transaction", amount_home: 50, payer_id: "a", recipient_id: null }],
        [{ entry_id: "e1", user_id: "a", percentage: 100 }],
        [ALICE, BOB],
      );

      const alice = balances.find((b) => b.memberId === "a")!;
      expect(alice.amount.toFixed(2)).toBe("0.00");
    });
  });

  // -------------------------------------------------------
  // Payments
  // -------------------------------------------------------
  describe("Payments", () => {
    test("Bob pays Alice $50: Bob's balance goes up, Alice's goes down", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "payment", amount_home: 50, payer_id: "b", recipient_id: "a" }],
        [],
        MEMBERS,
      );

      const alice = balances.find((b) => b.memberId === "a")!;
      const bob = balances.find((b) => b.memberId === "b")!;
      // Bob paid $50 to settle debt → his balance increases
      expect(bob.amount.toFixed(2)).toBe("50.00");
      // Alice received $50 → her balance decreases (debt settled)
      expect(alice.amount.toFixed(2)).toBe("-50.00");

      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");
    });

    test("payment settles transaction debt exactly", () => {
      // Alice pays $100 dinner, split 50/50. Bob owes Alice $50.
      // Then Bob pays Alice $50 to settle.
      const balances = computeBalances(
        [
          { id: "e1", type: "transaction", amount_home: 100, payer_id: "a", recipient_id: null },
          { id: "e2", type: "payment", amount_home: 50, payer_id: "b", recipient_id: "a" },
        ],
        [
          { entry_id: "e1", user_id: "a", percentage: 50 },
          { entry_id: "e1", user_id: "b", percentage: 50 },
        ],
        [ALICE, BOB],
      );

      // After settlement, both should be at zero
      const alice = balances.find((b) => b.memberId === "a")!;
      const bob = balances.find((b) => b.memberId === "b")!;
      expect(alice.amount.toFixed(2)).toBe("0.00");
      expect(bob.amount.toFixed(2)).toBe("0.00");
    });

    test("partial payment reduces but doesn't eliminate debt", () => {
      // Alice pays $100 dinner, split 50/50. Bob owes $50. Bob pays $20.
      const balances = computeBalances(
        [
          { id: "e1", type: "transaction", amount_home: 100, payer_id: "a", recipient_id: null },
          { id: "e2", type: "payment", amount_home: 20, payer_id: "b", recipient_id: "a" },
        ],
        [
          { entry_id: "e1", user_id: "a", percentage: 50 },
          { entry_id: "e1", user_id: "b", percentage: 50 },
        ],
        [ALICE, BOB],
      );

      // Alice: +100 (paid) -50 (her share) -20 (received payment) = +30
      const alice = balances.find((b) => b.memberId === "a")!;
      expect(alice.amount.toFixed(2)).toBe("30.00");

      // Bob: -50 (his share) +20 (sent payment) = -30
      const bob = balances.find((b) => b.memberId === "b")!;
      expect(bob.amount.toFixed(2)).toBe("-30.00");
    });

    test("overpayment flips the balance direction", () => {
      // Alice owes Bob $50 but accidentally pays $80
      const balances = computeBalances(
        [{ id: "e1", type: "payment", amount_home: 80, payer_id: "a", recipient_id: "b" }],
        [],
        [ALICE, BOB],
      );

      // Alice overpaid → now Bob owes Alice
      const alice = balances.find((b) => b.memberId === "a")!;
      const bob = balances.find((b) => b.memberId === "b")!;
      expect(alice.amount.toFixed(2)).toBe("80.00");
      expect(bob.amount.toFixed(2)).toBe("-80.00");
    });
  });

  // -------------------------------------------------------
  // Penny-Drop Prevention
  // -------------------------------------------------------
  describe("Penny-Drop Prevention", () => {
    test("$10 split 33.33/33.33/33.34 — shares sum to exactly 10.00", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "transaction", amount_home: 10, payer_id: "a", recipient_id: null }],
        [
          { entry_id: "e1", user_id: "a", percentage: 33.33 },
          { entry_id: "e1", user_id: "b", percentage: 33.33 },
          { entry_id: "e1", user_id: "c", percentage: 33.34 },
        ],
        MEMBERS,
      );

      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");
    });

    test("$1 split 3 ways — remainder-for-last prevents penny loss", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "transaction", amount_home: 1, payer_id: "a", recipient_id: null }],
        [
          { entry_id: "e1", user_id: "a", percentage: 33.33 },
          { entry_id: "e1", user_id: "b", percentage: 33.33 },
          { entry_id: "e1", user_id: "c", percentage: 33.34 },
        ],
        MEMBERS,
      );

      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");
    });

    test("$99.99 split 33.33/33.33/33.34", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "transaction", amount_home: 99.99, payer_id: "a", recipient_id: null }],
        [
          { entry_id: "e1", user_id: "a", percentage: 33.33 },
          { entry_id: "e1", user_id: "b", percentage: 33.33 },
          { entry_id: "e1", user_id: "c", percentage: 33.34 },
        ],
        MEMBERS,
      );

      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");
    });
  });

  // -------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------
  describe("Edge Cases", () => {
    test("empty entries gives zero balances", () => {
      const balances = computeBalances([], [], MEMBERS);
      balances.forEach((b) => {
        expect(b.amount.toFixed(2)).toBe("0.00");
      });
    });

    test("single member group", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "transaction", amount_home: 100, payer_id: "a", recipient_id: null }],
        [{ entry_id: "e1", user_id: "a", percentage: 100 }],
        [ALICE],
      );

      const alice = balances.find((b) => b.memberId === "a")!;
      expect(alice.amount.toFixed(2)).toBe("0.00");
    });

    test("complex scenario: multiple transactions + payments", () => {
      // Day 1: Alice pays $90 dinner (30/30/40 split)
      // Day 2: Bob pays $60 taxi (50/50 Alice+Bob)
      // Day 3: Charlie pays Alice $25
      const balances = computeBalances(
        [
          { id: "e1", type: "transaction", amount_home: 90, payer_id: "a", recipient_id: null },
          { id: "e2", type: "transaction", amount_home: 60, payer_id: "b", recipient_id: null },
          { id: "e3", type: "payment", amount_home: 25, payer_id: "c", recipient_id: "a" },
        ],
        [
          { entry_id: "e1", user_id: "a", percentage: 30 },
          { entry_id: "e1", user_id: "b", percentage: 30 },
          { entry_id: "e1", user_id: "c", percentage: 40 },
          { entry_id: "e2", user_id: "a", percentage: 50 },
          { entry_id: "e2", user_id: "b", percentage: 50 },
        ],
        MEMBERS,
      );

      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");

      // Verify each balance direction
      // Alice: +90 (paid e1) -27 (her share e1) -30 (her share e2) -25 (received payment e3) = +8
      // Bob: +60 (paid e2) -27 (his share e1) -30 (his share e2) = +3
      // Charlie: -36 (his share e1) +25 (sent payment e3) = -11
      const alice = balances.find((b) => b.memberId === "a")!;
      const bob = balances.find((b) => b.memberId === "b")!;
      const charlie = balances.find((b) => b.memberId === "c")!;

      expect(alice.amount.toFixed(2)).toBe("8.00");
      expect(bob.amount.toFixed(2)).toBe("3.00");
      expect(charlie.amount.toFixed(2)).toBe("-11.00");
    });

    test("payment with no recipient (null) only affects payer", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "payment", amount_home: 100, payer_id: "a", recipient_id: null }],
        [],
        MEMBERS,
      );

      const alice = balances.find((b) => b.memberId === "a")!;
      expect(alice.amount.toFixed(2)).toBe("100.00");

      // Bob and Charlie unaffected
      const bob = balances.find((b) => b.memberId === "b")!;
      const charlie = balances.find((b) => b.memberId === "c")!;
      expect(bob.amount.toFixed(2)).toBe("0.00");
      expect(charlie.amount.toFixed(2)).toBe("0.00");
    });

    test("uneven split: 60/30/10", () => {
      const balances = computeBalances(
        [{ id: "e1", type: "transaction", amount_home: 200, payer_id: "a", recipient_id: null }],
        [
          { entry_id: "e1", user_id: "a", percentage: 60 },
          { entry_id: "e1", user_id: "b", percentage: 30 },
          { entry_id: "e1", user_id: "c", percentage: 10 },
        ],
        MEMBERS,
      );

      // Alice: +200 (paid) -120 (60%) = +80
      // Bob: -60 (30%)
      // Charlie: -20 (10%)
      const alice = balances.find((b) => b.memberId === "a")!;
      const bob = balances.find((b) => b.memberId === "b")!;
      const charlie = balances.find((b) => b.memberId === "c")!;
      expect(alice.amount.toFixed(2)).toBe("80.00");
      expect(bob.amount.toFixed(2)).toBe("-60.00");
      expect(charlie.amount.toFixed(2)).toBe("-20.00");

      const total = balances.reduce((s, b) => s.plus(b.amount), new Decimal(0));
      expect(total.toFixed(2)).toBe("0.00");
    });
  });
});
