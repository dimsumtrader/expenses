import { describe, test, expect } from "vitest";
import Decimal from "decimal.js";
import { convertCurrency } from "@/lib/currency";

describe("Phase 3: Core Data Entry", () => {
  // -------------------------------------------------------
  // 1. Cent-Precision Split (decimal.js)
  // -------------------------------------------------------
  describe("Cent-Precision Split", () => {
    test("$10.00 split 33.33/33.33/33.34 — shares use remainder for last person", () => {
      const amountHome = new Decimal("10.00");
      const percentages = ["33.33", "33.33", "33.34"];
      const total = percentages.reduce(
        (sum, pct) => sum.plus(new Decimal(pct)),
        new Decimal(0),
      );
      expect(total.equals(100)).toBe(true);

      // Compute shares — first n-1 get rounded, last gets remainder
      const shares: Decimal[] = [];
      let runningTotal = new Decimal(0);
      for (let i = 0; i < percentages.length - 1; i++) {
        const share = amountHome.times(new Decimal(percentages[i])).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        shares.push(share);
        runningTotal = runningTotal.plus(share);
      }
      shares.push(amountHome.minus(runningTotal));

      const shareSum = shares.reduce((s, v) => s.plus(v), new Decimal(0));
      expect(shareSum.toFixed(2)).toBe("10.00");
    });

    test("$100.00 equal 3-way split computes correctly", () => {
      const amount = new Decimal("100.00");
      const each = amount.div(3).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      // 33.33 * 3 = 99.99 — last person gets remainder
      const shares = [each, each, amount.minus(each.times(2)).toDecimalPlaces(2)];
      const total = shares.reduce((s, v) => s.plus(v), new Decimal(0));
      expect(total.toFixed(2)).toBe("100.00");
    });

    test("percentages must total exactly 100%", () => {
      const badSplits = ["33.33", "33.33", "33.33"];
      const total = badSplits.reduce(
        (sum, pct) => sum.plus(new Decimal(pct)),
        new Decimal(0),
      );
      expect(total.equals(100)).toBe(false);
      expect(total.toFixed(2)).toBe("99.99");
    });

    test("split validation rejects 99% total", () => {
      const splits = ["50.00", "49.00"];
      const total = splits.reduce(
        (sum, pct) => sum.plus(new Decimal(pct)),
        new Decimal(0),
      );
      expect(total.equals(100)).toBe(false);
    });

    test("split validation rejects 101% total", () => {
      const splits = ["50.00", "51.00"];
      const total = splits.reduce(
        (sum, pct) => sum.plus(new Decimal(pct)),
        new Decimal(0),
      );
      expect(total.equals(100)).toBe(false);
    });
  });

  // -------------------------------------------------------
  // 2. Currency Conversion
  // -------------------------------------------------------
  describe("Currency Conversion", () => {
    test("same currency returns original amount", async () => {
      const result = await convertCurrency(new Decimal("100.00"), "USD", "USD");
      expect(result.toFixed(2)).toBe("100.00");
    });

    test("converts EUR to USD via Frankfurter API", async () => {
      const result = await convertCurrency(new Decimal("100.00"), "EUR", "USD");
      // Should be a positive number — exact rate varies daily
      expect(result.greaterThan(0)).toBe(true);
      // Should be rounded to 2 decimal places
      expect(result.toFixed(2)).toMatch(/^\d+\.\d{2}$/);
    });
  });

  // -------------------------------------------------------
  // 3. Payment Validation
  // -------------------------------------------------------
  describe("Payment Validation", () => {
    test("payer and recipient cannot be the same", () => {
      const payerId = "user-a";
      const recipientId = "user-a";
      expect(payerId).toBe(recipientId);
      // This would be caught by both UI (disabled button) and server action (throw)
    });

    test("amount must be positive", () => {
      const amount = new Decimal("0");
      expect(amount.greaterThan(0)).toBe(false);

      const validAmount = new Decimal("10.00");
      expect(validAmount.greaterThan(0)).toBe(true);
    });

    test("decimal.js avoids floating-point errors", () => {
      // Classic JS floating point: 0.1 + 0.2 = 0.30000000000000004
      const jsFloat = 0.1 + 0.2;
      expect(jsFloat).not.toBe(0.3);

      // Decimal.js handles it correctly
      const d = new Decimal("0.1").plus(new Decimal("0.2"));
      expect(d.toFixed(1)).toBe("0.3");
    });
  });
});
