# TEST SUITE: EASY-SPLIT

This document outlines the mandatory tests to be performed after each implementation phase to ensure financial accuracy, data security, and PWA stability.

## PHASE 2: AUTH & GROUPS (Security Baseline)
*Run these tests to ensure the "4-Digit Room" logic is secure.*

- [ ] **RLS Isolation Test:** - Create two groups (Room A and Room B) with separate users.
    - Assert that User A cannot fetch the `group_id` or `profiles` of Room B.
- [ ] **Unauthenticated Access:** - Assert that any request to `/`, `/entries`, or `/setup` without a valid Supabase session redirects to `/login`.
- [ ] **Room Join Logic:** - Verify that entering a non-existent 4-digit code returns a clear "Room not found" error.
    - Verify that joining a room creates a `profile` record linked to the correct `auth.uid`.

## PHASE 3: CORE DATA ENTRY (The "Engine" Tests)
*Run these tests to ensure the ledger math is perfect. Use Vitest.*

- [ ] **Cent-Precision Split:**
    - Input: $10.00 split between 3 users (33.33%, 33.33%, 33.34%).
    - Assert: The sum of computed share amounts (percentage × `amount_home` via `Decimal.js`) equals exactly `10.00`.
    - Assert: Split percentages in the `splits` table sum to exactly 100%.
    - Library: Must use `Decimal.js` to avoid floating-point errors.
- [ ] **Currency Conversion Mock:**
    - Action: Mock `api.frankfurter.app` to return a rate of 1 USD = 0.92 EUR.
    - Input: Transaction of 100 EUR in a USD-home group.
    - Assert: `amount_home` is recorded as `108.70` (rounded correctly).
- [ ] **Validation Guardrails:**
    - Assert: Transaction fails if split percentages sum to 99% or 101%.
    - Assert: Payment fails if `payer_id` equals `recipient_id`.

## PHASE 4: DASHBOARD & FEED (The "Truth" Tests)
*Run these tests to ensure the balances shown to users are mathematically correct.*

- [ ] **Net Balance Calculation:**
    - Formula: `(Total Paid + Payments Received) - (User's Split Share + Payments Sent)`
    - Scenario:
        1. User A pays $60 (Equal 3-way split: A=$20, B=$20, C=$20).
        2. User B pays User A $20 (Payment/Settlement).
    - Assert Net Balances:
        - User A: +$40 (($60 paid + $20 payment received) - ($20 share + $0 payments sent)).
        - User B: -$20 (($0 paid + $0 received) - ($20 share + $20 payment sent)).
        - User C: -$20 (($0 paid + $0 received) - ($20 share + $0 payments sent)).
- [ ] **Edit Entry:**
    - Action: Edit a transaction's amount from $30 to $50.
    - Assert: `amount_home` updates, splits are recalculated, net balances update.
    - Assert: Editing a transaction to change split percentages re-validates total = 100%.
- [ ] **Delete Cascade:**
    - Action: Delete a transaction.
    - Assert: All associated rows in the `splits` table are automatically removed (Database Cascade).
    - Assert: The Net Balance header updates immediately to reflect the deletion.

## PHASE 5: PWA & POLISH (UX Tests)
*Manual and automated browser tests.*

- [ ] **Standalone Mode:**
    - Check: Manifest `display: standalone` is active.
    - Check: No "browser chrome" (URL bars) visible when launched from home screen.
- [ ] **Haptic Feedback:**
    - Check: `navigator.vibrate` is called on successful button tap (mock the navigator object in Vitest).
- [ ] **Offline Resilience:**
    - Action: Disable network in DevTools.
    - Assert: App shell still loads, and UI shows a "You are offline" indicator if a fetch fails.