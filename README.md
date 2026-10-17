# SK MOBILES V5.6.107 — Firestore Read Optimization

## Changes
- Removed the duplicate initial collection fetch before realtime listeners for bills, repair jobs, and universal sync data.
- The first `onSnapshot` now establishes the initial baseline; later snapshots continue incremental realtime synchronization.
- Preserved local-newer conflict handling, unpublished local record upload, repair tombstones, and the existing localStorage/Firebase data formats.
- Bumped the app/cache version to 5.6.107 so clients can fetch the updated sync code.

## Validation
- JavaScript syntax check passed for `js/firebase-sync.js`.
- ZIP integrity check performed after packaging.
- Browser-level Firebase usage measurements were not available in this environment; confirm read counts in Firebase Usage after deploying and using the app.


## V5.6.113 targeted fixes
- Invoice PDF export uses a stable A4 content width and normalizes export-only table sizing to avoid clipped invoice edges. The live preview remains the canonical source.
- Billing tabs and mobile-type selector borders/sizing normalized.
- Toast notification lifecycle now clears prior timers and reliably hides after display.
- Bottom navigation z-index raised to remain visible across page sheets; drawer interaction remains disabled while open.
- No Firebase, business logic, data schema, IDs, or event handlers intentionally changed.


## V5.6.122 — Inventory Universal UI Refresh
- Dashboard quick cards visually normalized to the Saved Bills / Repair Spares Orders card rhythm.
- Tempered Glass / Display inventory cards, responsive grid, header actions, badges and model chips restyled with scoped CSS only.
- App typography base normalized without modifying invoice/receipt print canvas styles.
- No JavaScript, Firebase configuration/rules, data structures, IDs, handlers or business logic changed.


V5.6.122: scoped mobile layout corrections for Order List, Inventory Search, Used Mobile Stock spacing, register table scrolling, and purchase buttons. No business logic or data structures changed.


Version 5.6.122: mobile UI sizing, search-field spacing, and content overflow CSS correction based on supplied screenshots. UI-only; no application logic changes.


V5.6.122: Appearance Studio option-to-style coverage fix. Presentation CSS only; application business logic unchanged.


## V5.6.122 — Search icon position fix
- Adjusted only the mobile model-search icon glyph size and vertical optical alignment.
- No application logic or data behavior changed.


## V5.6.141 — Security hardening + cleanup
- New `js/features/pin-security.js`: Admin PIN and worker passwords are now stored as salted, iterated SHA-256 hashes. Legacy plain-text values still work and are upgraded automatically on first login / app start.
- Hard-coded default Worker PIN (`1111`) removed. The factory Admin PIN is accepted only until first login, which now forces setting a new PIN.
- Worker passwords are no longer shown in the Edit Worker form (leave blank to keep, type to reset).
- Login lockout: 5 wrong attempts locks PIN / worker login for 60 s (doubling on repeats).
- Removed `app.js.bak`, `style.css.bak`, `__pycache__`; synced all version strings; refreshed `stable-core-lock.json`.
- Note: a short numeric PIN is still weak against offline guessing; the real gate is Firebase Auth + Firestore rules.


## V5.6.145
- App Settings & Themes page rebuilt (icon cards): style profiles, theme mode, accent + custom hex, surface, corner radius, new Button Style, card surface, header/nav, interface scale (Compact / Normal / Large 110%), effects toggles, shop profile (+ Email, GST on invoice), terms editor, logo, JSON backup/restore, Firebase backup, App Data Folder, Auto Sync.
- Tools & Others Notes: Templates, Quick Templates, 0/2000 counter, WhatsApp share.
- Credit Ledger: one-line amounts, customer detail page with avatar, 3 stat boxes, equal Credit/Payment buttons, bill cards; Payment popup in 2-column layout.
- Repair Details redesigned (device header, Call + WhatsApp row, problem box, date/status/work chips, estimate/final/paid cards, highlighted balance, note).
- Date fields now open the normal keyboard (not number pad) and have a calendar icon in the right corner (`js/features/date-fields-v145.js`).
- Compact forms with paired fields and coloured field icons (`js/features/form-icons-v145.js`); equal-width button rows.
- New: css/settings-v145.css, css/screens-v145.css. Presentation only; no Firebase / data-key changes.

## V5.6.144
- One invoice layout (540px paper) for Live Preview, Saved Bill, PDF, WhatsApp and Print.
- Bill History filters by New / Used / Keypad; list scrolls to screen edge.
- Used Mobile: Save Purchase/Edit open a separate form page; details is a full page above the nav.
- Modern gradient page headers; tablet/PC centred layouts.
- Fix: applyShopConfig crash (missing low-stock inputs) that skipped custom terms.

## V5.6.143 — Polish & layout fixes
- Home: Low Stock box replaced by Repair Spares Orders.
- Even boxes/fonts on Used Mobile Stock, filter sheet fits screen with icons, consistent titles/close buttons, even Add Item popup, bottom-nav clearance, minimum font sizes.
- New css/polish-v143.css (presentation only).

## V5.6.142 — Colorful icon UI
- New `css/colorful-ui.css` + `js/features/colorful-ui.js`: one inline-SVG icon library drawn as tinted rounded icon tiles on every page (headers, section titles, buttons, stat cards, history actions, drawer menu). Leading emoji in static labels are swapped for matching coloured icons.
- Home: "Business Summary" and "Inventory & Stock" cards with icon-tile rows (templates in `renderCards` updated; handlers, ids and data unchanged).
- Layout fixes: bill history search/date icon overlap, Used Mobile Register empty-state text.
- Presentation only; no business logic, Firebase or data-schema changes.

## V5.6.146
- Settings page fixed: card/button radii, ✕ clear buttons, sticky header, bottom spacing, status colours.
- One global bottom navigation (`css/bottom-nav.css`) used identically on every page, including Used Stock.
- Removed legacy patch code (forced shop phone, tempered-glass card cleaner, one-time glass reset), 15 unused functions and ~150 dead CSS rules.
- No Firebase config, business logic or data keys changed.

## V5.6.147
- Added SK Mobiles logo: `Logo.png` (login, invoice), header logo, and app icons (192/512). Logo.png added to the offline cache.

## V5.6.148
- **Daily Report** (drawer + home "Today Report"): sales, repairs, credit collected, total collection for any date; share on WhatsApp or copy. Read-only over existing data.
- **Credit reminders:** 💬 WhatsApp button on every customer row with a pending balance, a Reminders list (overdue first, "reminded today" marker) and a link to the EMI reminder settings. Only `sk_credit_reminder_log_v1` is newly written.

## V5.6.151
- Font weights lightened (WhatsApp/YouTube style): 400 regular, 500–600 medium, 700–900 now semibold. No heavy bold anywhere.
- Used Mobile details page: multi-colour fields with icons; Edit/Delete/Select-for-Bill no longer hidden behind the bottom nav; Delete is red.
- Bottom-nav Home / inventory buttons now also close the Used-mobile details page (was stuck open).

## V5.6.150
- **Settings → Themes & Appearance:** every option now works (header, nav, scale, aura, surface, card/button radius, card surface, button style, presets). Root cause: the old rules targeted legacy class names that no longer exist; replaced by one `css/appearance.css` layer and the dead rules deleted.
- **One font everywhere:** self-hosted Inter (`fonts/`, no Google Fonts requests, works offline). Font picker, 30 old fonts, their CSS/JS and the Settings "Font style" row removed. Invoice/PDF also Inter.
- **Bell:** red dot only when there is an urgent repair/message.
- **Home:** backup status button (green = backed up, red = changes not backed up, amber = running). Tap = cloud backup; if cloud backup is not possible the app restarts. Inventory & Stock now compact 2-column tiles; shop name no longer truncated (role badge floats).
- **Bill History / other cards:** empty space left by removed buttons closed (2-button grid).

## V5.6.149
- Removed the low-stock home banner/list added in 5.6.148 (code and CSS deleted).
- Pending Jobs: **Next/Previous Status no longer moves the job**. Order is urgent first, then newest received date (never "last updated").
- Pending Jobs: filter chips (All / Urgent / Received / Checking / Repairing) and a days-pending badge (red from 7 days).
- Home: red "🚨 N urgent" badge on the Pending Jobs box.
- "Ready" WhatsApp message: one-tap button on Ready jobs in History; message now includes the model and balance. Fixed a phone-number cleanup typo (`/\\D/`) in repair call/WhatsApp.
- Tap the box to open: Bill History (opens bill), Used Mobile Stock rows (opens details), Accessories (opens edit; long-press still selects). The separate View / arrow / Edit buttons were removed. Edit/Delete/menu buttons that remain are unchanged.
