# TEST SUITE: EASY-SPLIT

This document outlines the mandatory tests to be performed after each implementation phase to ensure financial accuracy, data security, and PWA stability.

## PHASE 2: AUTH & GROUPS (Security Baseline)
*Run these tests to ensure the auth flow and RLS policies are secure.*

- [x] **RLS Isolation Test:** Create two groups (Group A and Group B) with separate users.
    - Assert that User A cannot fetch the `group_id` or `profiles` of Group B.
- [x] **Unauthenticated Access:** Assert that any request to `/`, `/entries`, or `/settings` without a valid Supabase session redirects to `/login`.
- [x] **Email/Password Auth:** Verify that `signUp()` creates a new user and `signInWithPassword()` authenticates correctly.
- [x] **Group Join Logic:** Verify that entering a non-existent group code returns a clear "Group not found" error.
    - Verify that joining a group creates a `profile` record linked to the correct `auth.uid`.

## PHASE 3: CORE DATA ENTRY (The "Engine" Tests)
*Run these tests to ensure the ledger math is perfect. Use Vitest.*

- [x] **Cent-Precision Split:**
    - Input: $10.00 split between 3 users (33.33%, 33.33%, 33.34%).
    - Assert: The sum of computed share amounts (percentage × `amount_home` via `Decimal.js`) equals exactly `10.00`.
    - Assert: Split percentages in the `splits` table sum to exactly 100%.
    - Library: Must use `Decimal.js` to avoid floating-point errors.
- [x] **Currency Conversion Mock:**
    - Action: Mock `api.frankfurter.app` to return a rate of 1 USD = 0.92 EUR.
    - Input: Transaction of 100 EUR in a USD-home group.
    - Assert: `amount_home` is recorded as `108.70` (rounded correctly).
- [x] **Validation Guardrails:**
    - Assert: Transaction fails if split percentages sum to 99% or 101%.
    - Assert: Payment fails if `payer_id` equals `recipient_id`.

## PHASE 4: DASHBOARD & FEED (The "Truth" Tests)
*Run these tests to ensure the balances shown to users are mathematically correct.*

- [x] **Net Balance Calculation:**
    - Scenario:
        1. User A pays $60 (Equal 3-way split: A=$20, B=$20, C=$20).
        2. User B pays User A $20 (Payment/Settlement).
    - Assert Net Balances always sum to $0.00.
    - Assert: Payer balance increases (settling debt), recipient balance decreases (getting repaid).
- [x] **Payment Direction:**
    - When Bob pays Alice $50: Bob's balance goes UP (+$50), Alice's goes DOWN (-$50).
    - Full settlement: Alice pays $100 dinner (50/50), Bob pays Alice $50 → both at $0.
    - Partial payment reduces but doesn't eliminate debt.
    - Overpayment flips balance direction.
- [x] **Penny-Drop Prevention:**
    - $10 split 33.33/33.33/33.34 — balances sum to exactly 0.00.
    - $1 split 3 ways — remainder-for-last prevents penny loss.
    - $99.99 split 3 ways — no floating-point drift.
- [x] **Complex Scenarios:**
    - Multiple transactions + payments accumulate correctly.
    - Uneven splits (60/30/10) produce correct balances.
    - Payer not in split still gets +amount.
    - Empty entries give zero balances for all members.
- [x] **Edit Entry:**
    - Action: Edit a transaction's amount from $30 to $50.
    - Assert: `amount_home` updates, splits are recalculated, net balances update.
    - Assert: Editing a transaction to change split percentages re-validates total = 100%.
- [x] **Delete Cascade:**
    - Action: Delete a transaction.
    - Assert: All associated rows in the `splits` table are automatically removed (Database Cascade).
    - Assert: The Net Balance header updates immediately to reflect the deletion.

## PHASE 5: PWA & POLISH (UX Tests)
*Manual and automated browser tests.*

- [x] **Standalone Mode:**
    - Check: Manifest `display: standalone` is active.
    - Check: No "browser chrome" (URL bars) visible when launched from home screen.
- [x] **Haptic Feedback:**
    - Check: `navigator.vibrate` is called on successful button tap (mock the navigator object in Vitest).
- [x] **Offline Resilience:**
    - Action: Disable network in DevTools.
    - Assert: App shell still loads, and UI shows a "You are offline" indicator if a fetch fails.

## PHASE 6: GROUP MANAGEMENT
*Tests for multi-group features, default splits, and leave/rejoin.*

- [ ] **Default Splits:**
    - Set default splits (Alice 60%, Bob 40%) in Settings → save.
    - Create a new transaction → splits pre-fill with 60/40.
    - Join a new member with no default → equal split used.
- [ ] **Leave Group:**
    - User leaves a group → profile soft-deleted (`removed_at` set).
    - Dashboard no longer shows the group.
    - Other group members unaffected, transactions intact.
    - User rejoins via group code → profile reactivated, old transactions visible again.
    - User's default split removed on leave.
- [ ] **Settings Save:**
    - Change group name + default splits → single save updates both.
    - Invalid splits (not 100%) → save blocked with error.
