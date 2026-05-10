# Implementation Plan

## Phase 1: Foundation ✅
- [x] **1.1 Scaffold Next.js 16** — App Router, TypeScript, Tailwind. Installed `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `decimal.js`.
- [x] **1.2 Supabase project** — Created project, ran schema SQL, RLS enabled.
- [x] **1.3 Supabase client helpers** — `lib/supabase/server.ts` (SSR), `lib/supabase/client.ts` (browser), `lib/supabase/middleware.ts` (session refresh).
- [x] **1.4 Design tokens** — Tailwind TE palette, Geist Mono + Inter via `next/font`.

## Phase 2: Auth & Groups ✅
- [x] **2.1 Email/Password auth flow** — `/login` with combined sign-up/sign-in form using `signUp()` + `signInWithPassword()`. No magic link.
- [x] **2.2 Middleware** — `src/middleware.ts` calls `updateSession()`. Protects all routes except `/login`, `/setup`, `/join`.
- [x] **2.3 Group creation** — `/setup` page. Generate 4-digit numeric room_id, set home_currency, insert groups + profiles.
- [x] **2.4 Group joining** — `/setup` page. Join by group code + display name. Multi-group supported.
- [x] **2.5 Logout** — Server action `logout()` signs out and redirects to `/login`.

## Phase 3: Core Data Entry ✅
- [x] **3.1 Transaction form** — `/add/transaction` with title, date, amount, currency dropdown, payer selection (defaults to current user), split % per user, "Exclude payer" shortcut.
- [x] **3.2 Currency conversion** — `lib/currency.ts` fetches Frankfurter API live rates. Displays converted amount. Stores `amount_orig`/`currency_orig` + `amount_home`.
- [x] **3.3 Payment form** — `/add/payment` with from/to selection (defaults: current user → another member), amount (home currency), date. Blocks same sender/recipient.
- [x] **3.4 Submit logic** — Server Actions with `decimal.js`. Validates split totals = 100%. Penny-drop handled by remainder-for-last pattern in balance calc (Phase 4). Haptic feedback on success.

## Phase 4: Dashboard & Feed ✅
- [x] **4.1 Net balance header** — `lib/balances.ts` with `computeBalances()` using `decimal.js`. Remainder-for-last pattern prevents penny-drop. Balances always sum to zero.
- [x] **4.2 Historical feed** — Reverse-chronological entry list on dashboard. Transactions: title/date/payer. Payments: "A → B". Original currency as subtext. FAB (International Orange) for new transaction.
- [x] **4.3 Entry detail modal** — Tap any entry for full details including split breakdown. Edit via `/edit/[id]` with pre-filled forms. Two-step delete confirmation. Delete cascades to splits.

## Phase 5: PWA & Polish ✅
- [x] **5.1 Dynamic manifest** — `app/manifest.ts` exports Manifest with `theme_color: '#FF4F00'`, `display: 'standalone'`, SVG icons.
- [x] **5.2 PWA metadata** — `layout.tsx` exports `metadata` (appleWebApp) and `viewport` (viewport-fit: cover). No `_document.js`.
- [x] **5.3 Service worker** — `public/sw.js` caches app shell, network-first strategy, registered via `next/script` in layout.
- [x] **5.4 Haptics** — `lib/haptics.ts` wraps `navigator.vibrate(10)`. Called on button taps and successful submissions.
- [x] **5.5 Mobile viewport** — Safe-area insets via `env(safe-area-inset-*)` in CSS. `overscroll-behavior: none` on body.

## Phase 6: Group Management ✅
- [x] **6.1 Multi-group dashboard** — Group switcher dropdown, copyable group code, "+ GROUP" button. Empty dashboard with "ADD GROUP" for users with no groups.
- [x] **6.2 Default splits** — Per-member default split percentages editable in group settings. New transactions pre-fill with saved defaults.
- [x] **6.3 Leave group** — Users can leave a group from Settings (soft-delete via `removed_at`). Group and transactions remain intact. User's default split removed on leave. User can rejoin later (profile reactivated).
- [x] **6.4 Group settings** — Single save button per group that saves both group info (name, currency) and default splits together.
