# Implementation Plan

## Phase 1: Foundation ✅
- [x] **1.1 Scaffold Next.js 16** — App Router, TypeScript, Tailwind. Installed `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `decimal.js`.
- [x] **1.2 Supabase project** — Created project, ran schema SQL, RLS enabled.
- [x] **1.3 Supabase client helpers** — `lib/supabase/server.ts` (SSR), `lib/supabase/client.ts` (browser), `lib/supabase/middleware.ts` (session refresh).
- [x] **1.4 Design tokens** — Tailwind TE palette, Geist Mono + Inter via `next/font`.

## Phase 2: Auth & Groups ✅
- [x] **2.1 Magic Link auth flow** — `/login` with `signInWithOtp`. `/auth/confirm` callback with `exchangeCodeForSession()`.
- [x] **2.2 Middleware** — `src/middleware.ts` calls `updateSession()`. Protects all routes except `/login`, `/auth/confirm`, `/setup`.
- [x] **2.3 Group creation** — `/setup` page. Generate 4-char room_id, set home_currency, insert groups + profiles.
- [x] **2.4 Group joining** — `/setup` page. Join by room code + display name. Multi-group supported.

## Phase 3: Core Data Entry ✅
- [x] **3.1 Transaction form** — `/add/transaction` with title, date, amount, currency dropdown, payer selection, split % per user, "Exclude payer" shortcut.
- [x] **3.2 Currency conversion** — `lib/currency.ts` fetches Frankfurter API live rates. Displays converted amount. Stores `amount_orig`/`currency_orig` + `amount_home`.
- [x] **3.3 Payment form** — `/add/payment` with from/to selection, amount (home currency), date. Blocks same sender/recipient.
- [x] **3.4 Submit logic** — Server Actions with `decimal.js`. Validates split totals = 100%. Penny-drop handled by remainder-for-last pattern in balance calc (Phase 4). Haptic feedback on success.

## Phase 4: Dashboard & Feed ✅
- [x] **4.1 Net balance header** — `lib/balances.ts` with `computeBalances()` using `decimal.js`. Remainder-for-last pattern prevents penny-drop. Balances always sum to zero.
- [x] **4.2 Historical feed** — Reverse-chronological entry list on dashboard. Transactions: title/date/payer. Payments: "A → B". Original currency as subtext. FAB (International Orange) for new transaction.
- [x] **4.3 Edit/delete entries** — Entry detail modal with view/edit/delete. Edit via `/edit/[id]` with pre-filled forms. Two-step delete confirmation. Delete cascades to splits.

## Phase 5: PWA & Polish ✅
- [x] **5.1 Dynamic manifest** — `app/manifest.ts` exports Manifest with `theme_color: '#FF4F00'`, `display: 'standalone'`, SVG icons.
- [x] **5.2 PWA metadata** — `layout.tsx` exports `metadata` (appleWebApp) and `viewport` (viewport-fit: cover). No `_document.js`.
- [x] **5.3 Service worker** — `public/sw.js` caches app shell, network-first strategy, registered via `next/script` in layout.
- [x] **5.4 Haptics** — `lib/haptics.ts` wraps `navigator.vibrate(10)`. Called on button taps and successful submissions.
- [x] **5.5 Mobile viewport** — Safe-area insets via `env(safe-area-inset-*)` in CSS. `overscroll-behavior: none` on body.
