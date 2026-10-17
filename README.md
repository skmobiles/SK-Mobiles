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

## V5.6.154
- Payment page: Due Date field removed (still available on Credit entries); Date now full width.
- All Tamil-script text in the app (messages, alerts, notes, code comments) replaced with English; new feature messages are plain English too.

## V5.6.153
- Tools & Others note page: oversized Templates icon fixed (icons without a size rule can no longer balloon, app-wide); spacing between Save/Share and Quick Templates; "Required" chip no longer wraps.
- Calendar buttons stay inside their date boxes (Repair History etc.); Accessories rows no longer have empty left space.
- Phone fields: tap an empty phone field to open the phone contact list (name + number fill in); new contact icon.
- IMEI fields (Bill, Used stock): camera scan button (BarcodeDetector, ZXing fallback). Second IMEI on a label fills IMEI 2.
- Audit: all handlers defined, no duplicate ids, every button clicked on every screen without JS errors; copy-models no longer throws when clipboard is blocked.

## V5.6.152
- **Bill saved popup:** after Save Bill, one-tap WhatsApp message to the customer (bill no, item, total, balance, warranty).
- **Customers** (drawer, or tap the name on a Bill History card): bills, repairs, credit balance, Call/WhatsApp.
- **Warranty:** new Warranty dropdown on the bill (7 days – 1 year), shown on the invoice terms; **Warranty Tracker** (drawer) with Ending soon / Active / Expired and WhatsApp reminder.
- **Undo delete:** 10-second Undo bar after deleting a bill, repair job, credit customer, used mobile, accessories or inventory item.

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

## V5.6.155
- **Monthly Report** (drawer): sales, profit (used mobiles + repairs), best-selling models, credit collected; share on WhatsApp, Excel and PDF.
- **UPI QR on bills**: set the UPI ID in Settings; the QR prints on the invoice when a balance is due (or always / never).
- **Repair photos**: up to 3 compressed photos per repair job; removed automatically 90 days after delivery.
- **Dealer Payments** (drawer): bought vs paid per dealer, payments, settle-all, WhatsApp statement.
- **Search everywhere**: the search button on Home finds bills, customers, phone, IMEI, repair jobs and used stock.
- **Cloud backup guard / Storage Health**: auto backup on first open of the day and after 21:00, only the last 14 backups are kept.
- **Dark mode**: dark page surface, readable labels and softer borders on every screen.
- No change to core sync, Firebase config or data keys.

## V5.6.156
- **Credit List** (drawer / Credit Reminders): date-to-date, customer-wise pending credit with days pending; WhatsApp statement per customer, WhatsApp list, PDF.
- **Credit Reminders** now show "N days pending".
- **Old mobile exchange** on the bill: exchange value is deducted from the sale price, the invoice shows sale price / exchange / amount payable, and the old mobile is added to Used Mobile stock (cost = exchange value). Used-stock profit still uses the full sale price.
- **Repair Ready**: when a job becomes Ready, a popup offers a one-tap WhatsApp message (model + balance).
- **Price List** (drawer): used mobiles in stock + priced accessories; share as image, PDF or text.
- Offline billing verified (shell cached by the service worker, data kept locally and uploaded on the next online open). Core sync untouched.

## V5.6.157
- Old cloud backups are now removed gradually (max 3,000 document deletes per day) so the Firestore free-plan limit of 20,000 deletes/day is never used up by clean-up.

## V5.6.158
- **Price List**: Customer price / Dealer price switch, kit and notes line, accessories and used mobiles toggles.
- **Popups**: short popup windows (Recycle Bin, filters, login…) open in the centre of the screen; tall pages keep full height.
- **Customer ledger**: "Send history" button sends the customer's credit bills, credit/payment history and outstanding on WhatsApp.
- **Used Mobile Stock**: All / In stock / Sold switch above the register.

## V5.6.159
- **Android Back button** now steps back one level on every page (ledger detail -> ledger list -> home, bill view -> billing -> home, used stock detail/form, repair detail, price list, drawer...). `js/features/back-nav.js` owns modal history; the old per-modal history hooks in app.js are disabled.
- **Used Mobile Stock**: "Bill" button on each row and "Bill this mobile" in the detail dialog open Billing with brand, model, RAM, storage, colour, IMEI, price and Used tab filled.
- **Layout**: Order List sheet is centred; in-sheet scrollbars hidden so pages no longer look pushed off screen.
- **Newest first** (display only): bill history, used stock register, customers, credit customers, credit entries, orders, global search bills.
- **Credit ledger**: customers without bills no longer show an outstanding amount in the list after their credit is fully paid.

## V5.6.160
- **Duplicate bills fixed**: editing a saved bill and then pressing New Bill / closing no longer creates a second copy; Save Bill refuses to save the exact same bill twice.
- **Used Mobile Stock**: Bill button and the 3-dot menu now sit inside the row card, aligned in every row.
- **Used Mobile Stock form**: Save Purchase / Reset buttons are no longer hidden behind the bottom navigation bar.

## V5.6.161
- **Customer ledger**: Credit / Payment buttons show proper icons (were white boxes). "Send history" now opens a popup with From / To dates and Today / 7 days / 1 month / All; the full history of the chosen period is sent (no 15/25 entry limit).
- **Credit list**: opens on the Credit filter; filter chips fill the row; customer avatars are round and coloured per customer. **Credit Reminders**: each customer has a "Change date / Set due date" button (key `skx_credit_due_override_v1`).
- **Home header**: the floating role badge no longer overlaps the profile icon; the profile icon itself shows the role (crown / briefcase / wrench).
- **Billing**: after Save or Update the New Bill form is empty, also when you return later; abandoning an edit does not leave its data in the New Bill form.
- **Fields keep their data** when tapped (billing fields no longer clear on focus).

## V5.6.162
- **Flicker fixed**: the popup-centering script re-toggled the class of every popup in an endless loop (~500 DOM changes per second). It now does nothing when nothing changes (3 changes in 3 s).
- **Customers page**: new Edit (name / phone) and Merge buttons on each customer, and a banner when one name has more than one account. Merge re-points every bill, repair job and credit entry to the final name + phone (history stays date-wise), keeps the due-date override, and offers a 15 s Undo. File `js/features/customer-merge.js`.
- **Outstanding**: ledger-only credit of a customer who also has bills (for example after merging) is now included in the outstanding total (minus ledger-only payments).
- **Home**: Recent Activity cards open the bill / repair / stock item they show; View All opens one newest-first list of bills, repairs, used-stock purchases and credit entries (`js/features/recent-activity.js`). View All / See All are plain links (no tall box).

## V5.6.163
- Phone field: tapping the field opens the number pad; the contact picker opens only from the contact icon.
- Price list: now drawn directly on a canvas (no external library, works offline). Share image and PDF (A4, multi-page) both work; preview is exactly what is sent.
- Every search box gets a small (x) button that clears all text at once.
- Settings: Full Pill button radius no longer turns option tiles into ovals.

## V5.6.164
- Merge / Edit customer popups redesigned (even padding, coloured icons, pill-safe buttons). Shared `.skpop` popup style for all new popups.
- Customer details: name, phone, alternate phone, address, e-mail, notes (key `skx_customer_profiles_v1`). Tap the customer name on the credit ledger page to edit; address shows under the phone. Profile follows rename / merge and is restored by Undo.
- Every calendar field shows dd/mm/yyyy (stored value stays ISO). Remaining text dates (trash, sync stamps, customer bills) switched to dd/mm/yyyy.
- Bulk WhatsApp (drawer): group + message template, one-tap Send per customer / Send next.
- Stock aging (drawer): unsold used mobiles 30/60/90+ days, money locked, reduce customer price.
- Backup & Restore (drawer): JSON / Excel download, one-tap restore, weekly reminder bar.
- Customer QR: QR holds a link to `/view.html` with a compressed summary of the latest bills inside the link. No data uploaded. `sw.js` now caches `/index.html` only for the real app page.

## V5.6.165
- Credit List and Customer Credit Ledger now show the same balance (ledger payments are netted off the oldest dues first).
- Undo bars hide automatically after 5 seconds.
- Tempered Glass long-press bar (Cancel / Select All / Delete) is one clean row.
- Home Recent Activity cards show the newest bill / repair and open the same item.
- New "Reviews & Offers": separate saved contacts (mobile buyers, finished repairs), WhatsApp review-link request and offers.
