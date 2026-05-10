# SPECIFICATION: "EASY-SPLIT" PWA

## 1. VISION
A high-design, minimalist PWA for shared expense tracking. Optimized for 2-3 users. All balances are calculated in a fixed "Group Home Currency." The UI follows a "Teenage Engineering" industrial aesthetic: high-contrast, monochrome, and tactile.

## 2. CORE FEATURES

### A. Group & Authentication
- **Join Logic:** Users create/join a group via a **4-digit numeric Group Code** (e.g., `1234`).
- **Auth:** Email/Password authentication via Supabase. Users sign up or log in with email + password. Simple passwords allowed. No email confirmation required.
- **Identity:** Users set a "Display Name" upon joining a group.
- **Home Currency:** Set globally for the Group upon creation (e.g., USD, EUR, HKD). All final balances are shown in this unit.
- **Multi-Group:** Users can belong to multiple groups. Dashboard has a group switcher dropdown.
- **Leave Group:** Users can leave a group from Settings. The group and its transactions remain intact for other members. Users can rejoin later using the group code. Leaving removes the user's default split percentage.
- **Default Splits:** Each group can set per-member default split percentages in Settings. New transactions pre-fill with these defaults instead of equal split.

### B. Two Entry Types (The "Input" Module)
The app must provide two distinct flows for adding data:

#### 1. Transaction Entry (Spending)
- **Title:** Text input (e.g., "Weekly Groceries").
- **Date:** Date picker (defaults to current date).
- **Amount:** Numerical value.
- **Input Currency:** Dropdown (Defaults to Group Home Currency).
- **Exchange Rate:** If Input != Home, fetch live rate via Frankfurter API and display the converted "Home" amount immediately.
- **Payer:** Radio selection of the group member who paid (defaults to current user).
- **Split %:** Percentage-based input per user.
    - Defaults to saved default splits if set, otherwise equal split.
    - Must total 100% to save.
    - Support "Exclude Payer" (Payer gets 0%, others split 100%).

#### 2. Payment Entry (Settling Up)
- **From:** Sender selection (defaults to current user).
- **To:** Recipient selection (defaults to another member).
- **Amount:** Numerical (Locked to Group Home Currency).
- **Date:** Defaults to today.
- *Note:* Payments do not have titles or split logic; they directly shift the net balance between two people.

### C. Dashboard & Historical Overview
- **Group Header:** Group name as dropdown switcher, copyable group code, "+ GROUP" button to add/join groups.
- **Net Balance Header (Sticky):** A prominent list of all users and their current standing in Home Currency.
    - **Positive (+):** The group owes this person.
    - **Negative (-):** This person owes the group.
- **Historical Feed:** Reverse-chronological ledger of all entries.
    - Transactions show Title, Date, and Payer.
    - Payments show "User A → User B".
    - Amounts are always shown in Home Currency (with original currency as sub-text).
- **Entry Detail Modal:** Tap any entry to see full details including split breakdown (per-member percentage and share amount). Edit and delete available for entries created by the current user.

## 3. DESIGN SYSTEM (TEENAGE ENGINEERING STYLE)
- **Palette:** Strictly Monochrome. Background: `#FFFFFF`, Text/Borders: `#000000`.
- **Accent:** `#FF4F00` (International Orange) for the "Add" button and "Submit" actions.
- **Visuals:** 2px solid black borders, sharp corners (`rounded-none`), no shadows, no gradients.
- **Typography:** `Geist Mono` for all numbers, balances, dates, and currency codes. `Inter` for prose.
- **Tactile Feedback:** Use `window.navigator.vibrate(10)` on successful submissions and button taps.

## 4. TECHNICAL ARCHITECTURE
- **Framework:** Next.js 16 (App Router).
- **Styling:** Tailwind CSS.
- **Database/Auth:** Supabase (PostgreSQL).
- **Currency API:** Frankfurter API (Free, no key required).
- **PWA:** Manifest and Service Worker configured for "Standalone" mobile mode.

## 5. DATABASE SCHEMA
- `groups`: (id, room_id VARCHAR(4), name, home_currency, created_at)
- `profiles`: (id, user_id, group_id, display_name, created_at, removed_at)
- `entries`:
    - `id`, `group_id`, `date`, `type` (enum: 'transaction', 'payment')
    - `title` (nullable), `amount_home`, `amount_orig`, `currency_orig`
    - `payer_id` (sender), `recipient_id` (recipient - payment only)
    - `created_by`
- `splits`: (id, entry_id, user_id, percentage)
- `default_splits`: (id, group_id, user_id, percentage)
