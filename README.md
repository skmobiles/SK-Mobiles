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
- Used Mobile Stock page: 4 small stat boxes in one row, compact purchase buttons, search + All/In stock/Sold above them.

## V5.6.166
- Walk-in Customer accounts are never suggested for merging; merge list rows no longer cut off.
- Signature opens as its own centred popup; pen is bolder and smoothed, signature is straightened, cropped and centred; the authorised (sales) signature is saved once and used on every bill until cleared.
- Home Recent Activity shows the 3 newest activities of any kind (newest first, same-day order fixed) and each opens its item.
- Home: Tempered Glass, Accessories and Other Inventory cards removed; new Shop Tools tiles (Price List, Reviews & Offers, Monthly Report, Dealer Payments).
- Dealer Payments: purchases count as paid by default; only ones marked "Pay later" are owed.

## V5.7
- Used Mobile Stock: search box is back under "Used Mobile Register".
- Home Recent Activity shows only today's 3 newest activities.
- Layout/alignment audit across all pages.

## V5.7.1
- App icon / splash: sharp full-resolution SK MOBILES logo (any + maskable icons with safe zone, white splash background) instead of the blurry blue "SK" icon.

## V5.7.2
- Home Quick Actions: "Edit" lets you choose your own 5 buttons (20 to pick from); saved on this device.
- Dark-mode button in the home header (works with the Appearance settings); dark header title colour fixed.

## V5.8.1
- Firebase free-quota saver: old cloud-backup clean-up runs once a day per device and deletes at most 1,000 documents a day (was 3,000 per run), so it no longer exhausts the 20K deletes / 50K reads daily limits.

## V5.8.1 — Popup icons, Text size fix (V5.8.2 adds the signature page fix)
- Every popup title now has a coloured icon (Dealer Payments, Search everywhere, Credit List, Monthly Report, Customers, Storage Health, Reviews & Offers and others), and the leftover plain emoji in popup buttons and headings are replaced by matching coloured icons (colorful-ui.js / colorful-ui.css, presentation only).
- Fixed: App Settings → Text size **Large / Compact** made popups wider / narrower than the phone screen (✕ button cut off). Full-screen popups now fill the screen exactly at every text size (css/appearance.css).
- Header shows V5.8. All Appearance options (style profiles, Light/Dark/System/Auto Night, accent colours, custom colour, surface, radius, button style, header, nav, text size, toggles, reset) were checked and work.
- The PIN / fingerprint lock added in the first V5.8.0 preview was removed completely. Firebase's saved login is used as before.
- Signature page (Bill → Add Customer / Sales Signature) is much bigger (fills the screen), the bottom menu no longer covers Clear / Save, and the drawn signature is no longer wiped when the screen size changes slightly (e.g. browser toolbar hiding).

## V5.8.3 — Used Mobile Stock date icon, popup gaps, live preview
- Used Mobile Stock → Add / Update Purchase: the date text no longer overlaps its calendar icon.
- Bill Details and other popups: removed the large blank block under the content (every popup used to reserve 112px at the bottom). Short popups now fit their content; Bill Details sits just above the bottom menu with the Edit / Download / WhatsApp buttons reachable by scrolling.
- App Settings & Themes: a LIVE PREVIEW strip (header, card, buttons, mini menu) stays pinned under the title, so accent, radius, button style, theme and other options are visible instantly inside the settings window.

## V5.8.4 — Version label, tile/card alignment
- The version shown in the Menu, the Tempered/Display header chip and the profile box now all come from one place (the app version), so they always match (was V5.7 / V5.5 / V5.8).
- Home "Shop Tools": icon, title and subtitle line up at the same height in every tile; subtitle text centred and not touching the border; "More" no longer touches the tiles.
- Tempered / Display cards: even inner spacing, "In Stock" pill and "Models Fit" box no longer touch their borders, model chips are never cut in half.
- Billing, Order, Admin and Item editor windows keep a small margin so boxes no longer touch the window border; Repair tabs have inner spacing.

## V5.8.5 — Appearance options now clearly work
- Ambient Aura Glow was hidden behind the page background (no visible change); now it shows as soft colour glows, and turning it ON/OFF is visible.
- Every Appearance option now shows a confirmation message (e.g. "Card corners: Pill", "Vibration: ON"); Vibration ON vibrates once and Click sound ON plays a click so you can feel the change.
- Appearance settings are now saved on each phone only (they are no longer synced through Firebase), so another device or an older copy cannot overwrite the option you just chose. Data keys are unchanged.
- Home Shop Tools tiles now follow the Card corner radius option.
- Live Preview strip also reflects Header style, Bottom menu style and Background.
- Settings section headers no longer overlap the options below them (Corner radius, Navigation, Visual effects, App data folder, Shell background).
- Used Mobile Inventory: closing the page with the phone's Back button no longer leaves a stale "form page" state behind (fixes the last failing back-button test).

## V5.8.6 — Popup paint glitch fix
- EMI Reminder Settings (and other popups) could appear half-painted on some phones (header cut at the right, empty body). The Aura glow layer used a heavy blur that stayed on while popups were open, and popups used a second blur layer. Aura now uses a light gradient and is switched off while a popup or the menu is open; popups use a single blur layer.

## V5.8.7 — Contact picker fills the name everywhere
- Choosing a contact with the contact icon now fills the customer name as well as the phone number in every form: Credit entry (this was missing), Bill, Repair job, Credit, Worker add/edit and Worker profile. Name fields are matched by their ID, with a safe automatic fallback for fields named like "...Phone" / "...Name".

## V5.8.8 — Popup margins, softer Aura glow
- Every popup (Compatible Models, Credit entry, EMI reminder, Monthly/Daily report, Warranty, Dealer, Customers, Price List, Urgent repairs, Used Mobile Stock and others) now keeps a 12px margin, so inner boxes no longer touch the window border.
- Ambient Aura Glow (the coloured patches at the top-left and bottom-right of Home) now sits behind the cards instead of tinting them, is softer, and both patches follow the accent colour. Turn it off any time in Settings → Visual Effects → Ambient Aura Glow.

## V5.8.9 — Repair status without flicker, Used Stock spacing
- Repair Jobs → Next Status / Previous Status: only the card you tapped is redrawn; the other cards, chips and buttons no longer blink.
- Used Mobile Stock: gaps added between the header and the stat cards, and between the All / In stock / Sold chips and the table, so boxes no longer touch.

## V5.9.0 — Used mobiles: RAM / Storage split, iPhone Battery Health
- "6/128" (also 6+128, 6-128, "4 / 64") is read as 6 GB RAM + 128 GB Storage. A single 32 / 64 / 128 / 256 / 512 GB or 1 TB value is Storage only. A lone 8 or 16 is treated as a typing mistake and left empty.
- When the model name contains "iPhone", the RAM box is hidden and a Battery Health % box is shown (form, details page, bill, price list, stock aging).
- Typing "6/128" in the Storage box splits it into RAM and Storage automatically. Existing records (including the 415 imported ones) are shown split without rewriting the saved data; records saved from now on store RAM and Storage separately. New optional field: `battery` (iPhones only).
- Excel/CSV import applies the same rules (and reads a "Battery Health" column if present); CSV export uses the split values and adds a Battery Health column.

## V5.9.1 — Excel import: correct sold / in-stock count
- The Excel import read *formatted* cell text, so long IMEIs in "General" cells became "3.53881E+14" and did not match the Sales sheet; those phones stayed "In Stock" (app showed 45 instead of the Inventory sheet's 27 rows / 26 phones).
- Import now reads the real cell values. Re-importing the same Excel also repairs records imported earlier: IMEIs saved as "3.5E+14" are corrected (matched by model + IMEI), and phones that appear in the Sales sheet are marked Sold with their sale details. Nothing is added twice.
- Tested with the shop's Used Mobiles 2026 workbook: fresh import and re-import over the old data both give 415 phones, 389 sold, 26 in stock — matching the Inventory sheet.
- Re-import also repairs IMEIs that were saved as "354596000000000" (the rounded form of "3.54596E+14").
- **Clear All** (Used Mobile Stock) now really clears the whole Used Mobile register so a fresh Excel can be imported. Accessories got a matching **🗑 Clear List** next to Upload / Export. Both ask for confirmation, then ask you to type CLEAR, and download a backup file (CSV / list export) before clearing. The cleared list also syncs to your other devices.

## V5.9.2 — WhatsApp buttons open WhatsApp Business
- On Android, every WhatsApp button (bill, credit reminder / statement, repair ready, price list, monthly report, dealer, reviews, bulk message, shop phone) now opens **WhatsApp Business** directly (new js/features/wa-business.js). If WhatsApp Business is not installed, it falls back to the normal wa.me link. Desktop / iPhone unchanged.
- PDF sharing still uses the phone's Share sheet — choose WhatsApp Business there (a web page cannot force one app for file sharing).

## V5.9.3 — Spacing sweep
- Sale Price and the "Old mobile exchange" box no longer touch; Accent colour swatches are round and stay inside the card, with a gap before the Custom Brand Hex row whose text now stays inside its box.
- An automatic check of every page and popup (normal and Large text) for boxes that touch: gaps added for repair-job buttons, repair details, admin profile, worker edit, tools note, settings terms / logo / UPI and all section headers.

## V5.9.4 — WhatsApp PDF, short statement, reminder due date
- WhatsApp PDF: building the PDF takes a few seconds, after which Android no longer treats it as a tap and blocks sharing ("WhatsApp invoice PDF failed"). Now a small "Invoice PDF ready — Share on WhatsApp" prompt appears; one more tap opens the share sheet. Cancelling the share sheet no longer shows an error, and any real error now shows its reason.
- Send history (credit ledger) message is now short: outstanding amount, last payment (amount + date) and only the last 3 credit items.
- Credit Reminders: "Change date / Set due date" opens a small popup with a date box and Save / Remove (the old hidden date box did not open on some phones). The reset and WhatsApp buttons are round with the icon centred.

## V5.9.5 — PDF export fixed ("unsupported color function 'color'")
- Cause: newer Chrome reports colours built with CSS color-mix() as `color(srgb …)`. The PDF library (html2canvas inside html2pdf 0.10.1) cannot read that format, so WhatsApp PDF, Download PDF, Monthly report PDF and Credit list PDF all failed on updated phones.
- Fix (new js/features/pdf-color-fix.js): just before a PDF is drawn, every such colour in the copy being printed is converted to plain rgba(), and the page background is given as white. Tested with the real html2pdf 0.10.1 library with forced `color(srgb …)` colours: all four PDFs are created again.

## V5.9.6 — PDF export: page background fix
- V5.9.5 still failed when the app background was "Subtle Slate" (and similar): html2canvas also reads the background colour of the live page (<html>/<body>), which Chrome reports as color(srgb …). While a PDF is being made those two colours are now given as plain rgba(), then put back. The fix now also runs for every html2pdf call (set()/from() return new worker objects, so the earlier hook could be skipped).
- Tested with the real html2pdf 0.10.1 library: WhatsApp PDF, Download PDF, Monthly report PDF and Credit list PDF all work with Subtle Slate (light and dark) and all other backgrounds / presets. Nothing else changed.

## V5.9.7 — Download PDF: same file path as WhatsApp PDF, real error shown
- Download PDF now builds the PDF file first (like WhatsApp PDF) and hands it to the phone's download manager; if the phone blocks the download, a "Share" prompt is offered instead. If it still fails, the message now shows the real reason (instead of "check browser download permissions").

## V5.9.8 — Reliable Home taps, Download "Open", version on Home, speed
- Home boxes sometimes did nothing until the app was refreshed. Two causes fixed (new js/features/tap-guard.js): cloud-sync redraws now wait until the finger is lifted (a box replaced mid-tap lost the tap), and on touch phones the boxes are no longer HTML-draggable (a long press started a browser drag that could swallow later taps).
- Download PDF: after the file is saved a "PDF downloaded — Open / Share" prompt appears, because an app installed on the home screen shows no "Open" after a download.
- The app version is now shown next to "SK MOBILES" on the Home screen.
- Speed: search boxes no longer force a re-layout per box at start-up, and the Settings live preview does its measuring only while Settings is open (start-up about 18% faster in a 4x-slowed phone test). A full sweep of all pages and popups shows no script errors.
- Long-press re-order on phones: hold a Home box (Business Summary or Shop Tools) about half a second until it lifts, slide it to the new place and lift the finger. The order is saved like before; a normal tap still opens the box.
- PDF freeze fixed: the PDF library used to copy the whole app (all pages and popups) before drawing, which froze the app for many seconds on a phone (about 45 s in a 6x-slowed test). Now only the bill area is copied: about 3 s, with no long freeze. WhatsApp PDF, Download PDF, Monthly report and Credit list PDF all tested.
- Monthly report PDF and Credit list PDF were coming out blank (the hidden source box was off-screen); fixed.

## V5.9.9 — Full mobile review
- PDF prompt: one clear row "✅ PDF downloaded — [Open PDF] ✕" placed just above the bottom menu (Share removed); the WhatsApp "PDF ready" prompt uses the same style.
- Used Mobile Register rows: name and price on the first line, dealer and status on the second, full IMEI on the third; the Actions column only takes the space it needs (no empty area on sold phones).
- Review of every page and popup at phone size: Bill page sections now have an even 14px rhythm (were 26–42px apart); Order list and Repair details fit their content; Credit ledger starts at the top; EMI reminder fields keep a margin; Accessories buttons form a 2 x 2 grid; Dealer date box matches other inputs; Repair-details date no longer splits the year. Automatic spacing check: no touching boxes anywhere.

## V5.9.10 — Used Mobile Register cards (as in the approved demo)
- Every phone is one even card, the same in All / In stock / Sold: phone icon with its number, model name and dealer, price and In Stock / Sold on the right; a thin line; then the full IMEI with Bill + ⋮ (in stock) or Profit + ⋮ (sold). The old column header row is hidden. Works in light and dark.

## V5.9.11 — Stat cards centred, smooth Menu scroll
- Used Mobile Stock stat cards (Total Devices / In Stock / Sold / Sold Profit): icon, label and value are centred; in dark mode the cards are dark with readable labels (were light grey and faded).
- Menu: scrolling the menu no longer makes the Home page behind it blink. The menu no longer live-blurs the page behind it on every scroll step, and the long-press re-order only blocks scrolling while a box is actually being moved.

## V5.9.12 — Serial "#1" chips, colourful nav icons, menu blink
- Used Mobile Register: serial number shown as a soft "#1" chip before the phone name (was a dark dot on the phone icon).
- Price List (image / PDF): each item now has the same "#1" chip before its name.
- Bottom navigation: colourful icons (Tempered sky blue, Display purple, Billing green, Orders orange); the open page gets a light tile. Home button unchanged.
- Menu: scrolling inside the menu no longer toggles the page-wide scroll-performance class, and the background glow stays while the menu is open — removes the one-time home page blink.

## V5.9.13 — Tempered freeze, Credit Ledger full page, EMI fields
- Tempered / Display / any long list: the emoji→icon pass (colorful-ui.js) re-measured the whole page after every icon; it now reads first and writes after. Tempered page with ~170 cards: 23 s freeze → ~15 ms.
- Customer Credit Ledger: full page from the top down to just above the nav bar; only the inside scrolls, so history cards never slide behind the nav bar or out of the white box.
- Credit form: Months / Interest % / Date stay hidden while "No EMI" is selected (a CSS rule matched the word "grid" inside the hidden field's style).
- Home / Tempered / Display: cards fade out just above the floating nav bar instead of showing around and under it (page-coloured fade under the bar, follows the theme; hidden while a page, popup or the menu is open).

## V5.9.14 — Same scroll and same width on every page & popup
- Title bar (name + ✕) stays at the top on every page and popup; only the content below it scrolls.
- Every full page starts 8px from the top and ends on the same line just above the nav bar; scrolling content fades out at that edge. Used Mobile Stock uses the same frame.
- Every page and popup: white box 8px from the screen edges, content 12px inside it.
- Short popups stay centred; real pages (Ledger, Billing, Settings, Repair Jobs, reports…) always open full size. Centring now measures the content itself.

## V5.9.15 — Clean style: Customer Credit Ledger + Settings
- Both pages: no floating box; one simple top bar that stays; plain lists; fewer font sizes; colour icons.
- Ledger customer view: ← name/phone ⋮ bar; one Outstanding card (Credit · Paid); Credit / Payment buttons; Customer QR and Send history links; history as a plain list with a small ✎ edit on every entry. ⋮ menu: Edit customer, Customer QR, Send history, Close ledger, Delete customer. All buttons call the same functions as before.
- Settings: grouped list (Shop / Look / Permissions / Data); a row opens only its part; ← or the phone Back returns to the list. Menu "App Data Folder" opens that part directly.
- Ledger customer list: one "Total outstanding" card (customers · on EMI), search + Credit, Reminders row, simple tabs, plain customer rows (soft letter circle, amount + "due", small WhatsApp icon). Delete customer lives in the customer ⋮ menu (removed from each list row).

## V5.9.16 — Clean style: Billing + Repair Jobs
- Same frame as Ledger / Settings: no floating box, simple top bar that stays, old pull-handle gap removed.
- Tabs (New Bill / History, Jobs / Pending / History) are plain text with a line under the open one; New / Used / Keypad is one quiet switch.
- Sections are plain white cards with small grey headings; inputs 46px with one thin border; pay-mode chips; Save (blue), WhatsApp (green), Download / Print (outline).
- Bill history and repair lists: quiet cards. CSS only — no change to billing or repair logic.

## V5.9.17 — Clean style for every other page and popup
- Pages (Accessories, Daily / Monthly Report, Storage, Bulk WhatsApp, Reviews, Admin, Item editor, Tools notes, Worker, Bill details, Recent activity): same simple top bar and frame as Billing / Ledger.
- Popups: lighter box, simple title with a thin line under it, plain ✕.
- Everywhere: same labels, 46px fields with one thin border, same main buttons (blue / green), plain white cards. CSS only.

## V5.9.18 — Clean style: Used Mobile Stock
- Same simple top bar (← title chart) and frame as every other page.
- The four numbers sit in one quiet card; Save Purchase is the one blue button, Clear / Export / Import are outline buttons.
- Register and Add / Update Purchase are plain white cards; All / In stock / Sold are plain tabs; single-border search box.
- Filter popup: simple title and ✕ like the other popups. CSS only.

## V5.9.19 — Fixes from the phone check + clean Home and Menu
- Bill History scrolls with the page (it had its own inner scroll under the tabs).
- Every page / popup title bar now reaches both edges (it had width:100% plus negative margins, so it stopped short on the right).
- Ledger customer view: summary card padding and spacing restored (a global margin/padding reset was wiping them); "Send history" can no longer appear twice.
- Text that spilled out: Used Stock numbers shrink to fit, date field, Import button, "Mobile Only" select, "Keypad Mobile", home recent activity — checked on every screen at 360px and 390px.
- Home page and Menu in the clean style (quiet cards, colour icons without boxes, grouped menu list).

## V5.9.20 — Used mobile details in the clean style
- Simple top bar (← name, status); details as one white list (label left, value right, colour icons).
- The buttons were partly hidden behind the nav bar; they now sit above it: Bill this mobile (blue), Edit | Delete (red outline), Select for Bill. Same functions as before. CSS only.
- Dark mode: no more white boxes (search box, header buttons, Used Stock form fields, status chips, row menu, repair details, filter fields) and no unreadable text (home recent activity, pay-mode chips, used details title, repair amounts). Popup backdrops stay dark. Checked every screen with a contrast scan.

## V5.9.21 — Speed: smooth scroll, quicker taps
- Scroll: the page-wide "sk-perf-scrolling" class on <html> restyled every element at the start and end of each scroll (100–200 ms stall on a phone); on Used Mobile Stock it flipped on every frame (~2 s per frame). Removed — every page now scrolls at 60 fps in a 4× slowed-CPU test.
- Taps: date fields no longer force a page layout on every value change (Used purchase form opened ~200 ms faster); bill preview reads the bill number with textContent (no forced layout); number auto-fit only runs when Used Stock / Ledger is open.
- Long lists (Tempered / Display cards, used register, bill history, ledger list) only lay out the cards on screen: opening Tempered ~760 → ~310 ms in the slowed test.
- Same left/right width on every page: Bill History cards, Admin boxes, Accessories, Bulk WhatsApp, Reviews now start 16px from the screen edge like every other page; Backup, Stock aging, Price List and Repair details popups use the popup width (20px). Measured on every screen.

## V5.9.22 — Scroll starts smoothly, taps work first time, Used Stock wider
- Scroll: no live blur behind the bottom bar, no fade mask on scrolling boxes (both are redrawn on every scroll frame by the phone's graphics chip), and the V5.9.21 "only draw cards on screen" rule removed (it drew cards while the finger was moving, giving a hitch at the start of a scroll).
- Taps: pressed buttons no longer shrink (a shrinking button could slip out from under the finger); taps fire at once (touch-action: manipulation); with the menu open the bottom bar is on top and a tap on it closes the menu and opens the page.
- Used Mobile Stock: the register is no longer a box inside a box — each phone card uses the full width.
- Home "Pending Jobs" box: the "1 urgent" pill now sits inside the box (bottom-right); it was cut off at the top edge.
- Repair Jobs list: urgent jobs have a red border (light and dark).

## V5.9.23 — No blink on list redraws, smooth page opening
- Blink: an old performance layer delays every DOM watcher by 50 ms, so after a list redraw (Repair Next/Previous Status, Ledger tabs) the icons and the clean style were applied ~3 frames late — rows showed the old emoji/colours first and then blinked. The two look-only decorators (colorful-ui, clean-pages) now use the browser's direct watcher and style new rows before the screen is drawn. Button colour checks are cached so this stays fast.
- Smooth opening: every page and popup fades in and rises 14 px (0.2 s, opacity/transform only); Home / Tempered / Display switch the same way. Turned off when "Reduce motion" is on.

## Hosting address: skmobilesdpi.web.app
- `firebase.json` now deploys to the `skmobilesdpi` site (https://skmobilesdpi.web.app) in the same Firebase project (sk-mobiles-2d61d). The old address sk-mobiles-2d61d.web.app stays on V5.9.23 and gets no more updates.
- `authDomain` in js/firebase-sync.js is unchanged on purpose (it is the Firebase sign-in handler, not the app address). skmobilesdpi.web.app and skmobilesdpi.firebaseapp.com were added to Authentication → Authorized domains.
- Phone data is stored per address: take Backup & Restore → Download backup (JSON) in the old app, then Restore in the new one (Used Mobile Stock is local-only).

## V5.10.0 — Sign in with Google + People & access
- Login is "Sign in with Google" only (no email/password form). The owner is skmobilesdpi@gmail.com.
- A new person who signs in gets a users/{uid} record with role "pending" and sees "Waiting for access". The app opens by itself when the owner gives a role.
- Settings → Staff → People & access (owner only): Waiting for access + Staff lists; role per person: Manager / Worker / No access. "No access" stops all data at once; their earlier entries stay.
- Existing staff keep their role: Google sign-in on the same Gmail uses the same Firebase account, so users/{uid} is unchanged.
- firestore.rules: the fixed three-email list is gone. Create = own record as "pending" (or "admin" for the verified owner email); only the owner can set manager / worker / none, never on their own record. Data rules unchanged. **Publish firestore.rules in the Firebase console** — GitHub deploys only the app, not the rules.

## V5.10.1 — Cloud backup fixed, no forced restart
- Backup writes are now split by size as well as count (each Firestore batch ≤ 7 MB / 400 writes; it used 450 writes of up to 650 KB each, which can exceed the 10 MB request limit once the data grows).
- Each stored piece is 280 000 characters, so it stays under Firestore's 1 MiB-per-document limit even for non-English text (650 000 such characters ≈ 1.9 MB).
- When a backup fails the app no longer restarts itself; it shows the reason (no permission / no internet / daily limit / error code).

## V5.10.2 — Cloud backup "no permission" fix
- firestore.rules: backup pieces (`items/{id}/chunks/{n}`) are now allowed (same access as items). Publish the rules in the Firebase console.
- Backup writes go in batches of 20 (security rules allow only about 1000 checks per request; 400-write batches were refused as "permission-denied").
- If a part is still refused, the message names it: backup record, backup items or backup pieces (chunks).

## V5.10.3 — Install app button
- Chrome asks "Install app" only once per site. Now the sign-in card has **Install app on this phone**, and a small bar above the bottom navigation shows **Install SK Mobiles**.
- Shown only when the phone can install the app and it is not installed yet. ✕ hides the bar for 7 days on that phone (device-only, not synced).
## V5.10.4 — Cloud backup "no permission to save backup items"
- Older user records have no `active` field. The rules read `active` directly, which fails for a missing field, so the owner was not seen as Owner. Rules now use `get('active', true)` / `get('role','')`.
- On sign-in the app adds `active: true` to such records (role untouched), so it works even before the rules are published.
- A permission error now also shows the signed-in email and the cloud role.

## V5.10.5 — Used Mobile Stock fixes
- ⋮ menu on each card opens next to the button again (the register panel's blur effect moved the menu off-screen) and stays above the bottom navigation.
- Card price shows the **customer price** (sold phones: the sale price). Purchase / dealer price are not shown on the list. Price filter uses the same customer price.
- Profit correctness: deleting a used-mobile bill puts the phone back In Stock (its profit is no longer counted); restoring the bill marks it sold again; editing a bill updates the sale price / profit and frees the old phone if the IMEI changed.
- Same IMEI can come back (exchange / bought again): every purchase is its own entry; only one In Stock entry per IMEI. Edit / Delete / Details work on the exact entry.
- Excel import reads only **Purchases, Sales, Inventory**. Dealer = purchase + 1000, Customer = purchase + 2000. Profit = sale price − purchase price (Excel "Profit" column not used). Each sale is paired with the purchase before it; a resale without a purchase row uses sale − Excel profit as the purchase price. Phones in the Excel replace their old app entries (Excel prices win); phones only in the app stay. A summary lists anything to check.
- Phones billed in the app (Used Mobile bill, matching IMEI) are marked Sold with the bill's customer and price.
- Sold cards show "Sold to customer · date", sale price and profit; Sold tab lists newest sale first. Details show Sold To / Sale Date / Sale Price / Profit.
- Stock summary button (top right) opens Stock aging.
- Includes V5.10.3 Install app button.

## V5.11.27
- Repair detail: "Payments received" rows are aligned inside the box — date, amount and a compact "↩ Cancel" button in three columns.
- Button labels never break in the middle of a word anywhere in the app (e.g. "Delivere/d"); Repair Jobs action tiles and the filter chips (e.g. "Not collected") wrap to at most 2 lines, even on narrow phones or large text sizes. In History cards the name / phone lines no longer run under the Outstanding box.

## V5.11.26
- Repair History cards: tapping anywhere on the card (including the empty space around the buttons) opens the repair details. Edit / Delete / Rework / Ready message are equal-width tiles.
- In Pending cards the "Delivery Status" line is removed; the status and work-type chips (Received / Normal) and the age label take its place. In History cards the extra blue status chip is removed, the Outstanding / Paid amount sits in the card's top-right corner, and Edit / Delete / Ready message / Mark Delivered are on one line.
- Each History card shows the **Outstanding** amount (and what was Paid), or "Fully paid".

## V5.11.25
- Repair Jobs: Edit / Delete / Previous / Next (Pending) and Edit / Delete / Ready message / Mark Delivered / Rework (History) are now icon-on-top tiles with larger, bolder text. "Previous Status" / "Next Status" are shortened to "Previous" / "Next".

## V5.11.24
- Repair job detail: every advance / delivery payment now has a **↩ Cancel payment** button (reason required). The amount is added back to the outstanding balance, a delivered job's balance returns to the customer's Credit ledger, and the matching receipt is kept but marked CANCELLED. Admin always; Manager only when Edit/Delete is allowed.

## V5.11.23
- Fix: editing a **Delivered** repair job (e.g. clearing the advance) blanked its status, so the job vanished from Repair Jobs, History and the Recycle Bin. The edit form now keeps "Delivered", a blank status can no longer be saved, and any job already hidden this way is restored automatically on the next open.

## V5.11.22
- Customer credit reminder (English and Tamil) now shows a boxed summary: mobile name and bill number of the credit bill(s), **Outstanding** amount and **Due** date in bold with icons. Also shows Total and Advance paid. Wording changed from "pending" to "Outstanding".

## V5.11.21 — Manager access in one place (People & access)
- Settings -> People & access now starts with a **Manager access** card: Manager can sign in (master switch), Full access / Reset to basic buttons, and one switch per area (Billing, Orders, Repair, Credit, Inventory, Tools & Notes, Edit & delete records, App Settings, Shop profile, App Data Folder, Cloud backup, Cloud restore, Recycle Bin, User management). Changes reach the Manager's phone straight away.
- The old Manager section in Admin Control is replaced by a button that opens People & access.
- New permission **Edit & delete records** (`editDelete`, default off = same as before). When on, the Manager's Edit / Delete / Next status buttons and the edit/delete functions work for the areas they are allowed in.
- Fix: the Manager's Settings page was locked as a whole even when Admin had allowed it. Each Settings part is now locked or open by its own permission (Look -> App Settings, Shop/Terms/Logo -> Shop profile, Backup / Cloud -> backup & restore, App data folder). Spring bounce and Camera & notifications are always open.
- Firestore rules unchanged (the new key is only used by the app).

## V5.11.20 — Spring fix (stuck after release)
- Fixed a bug from V5.11.19: the spring-back code referenced removed constants (`K`, `C`), threw an error every frame and left the page stuck where it was pulled (worst on High). Verified Low / Medium / High all return to 0 after drag and after a fast scroll, with no errors.
- Home pull-to-reload now needs a real ~230px finger pull at every strength (before, High reached the old threshold with a short pull and could reload by accident). If the reload does not happen, the page lets go after 2.5 s instead of staying stuck.
- Smoother on big pages: the moving layer is promoted only while it moves, and the target list is cached.

## V5.11.19 — Spring settings + same-day buy back
- Settings -> Spring bounce: On/Off, Strength Low/Medium/High, and Home pull-to-reload On/Off. Saved on this phone only (`skdev_spring`, not synced).
- Used stock buy back: when a phone is bought and sold on the same day (or sold, bought back and sold again the same day), the newer record counts as the buy-back, decided by the record id timestamp, else list order.

## V5.11.18 — Staff phone speed + Buy back fix
- Speed: the role-restriction scan ran on every single DOM change and rewrote every blocked button each time (about 21,000 DOM writes in 4 s while idle on a Staff login, 84,000 on Manager). It now runs once per burst (180 ms) and only writes buttons whose state really changes (Staff: 21,000 -> ~120, Manager: 84,000 -> ~50 per 4 s idle). Same buttons are blocked as before.
- Used stock: "Already bought back" was wrongly shown on the latest sale of an IMEI when its own purchase date was the same day or later than its sale date (the record compared itself to a copy of itself). Records are now compared by id.

## V5.11.17 — Repair filters in 2 rows, History spacing, People in Menu
- Repair Jobs: All / Urgent / Received / Checking / Repairing / Not collected now sit in 2 rows of 3.
- Repair History: section titles and cards have more inner space so text no longer touches the box border; Mark Delivered is always full width and fully readable.
- Menu: "People & access" (owner only) is the first row; it opens Settings straight on that page (the Settings row stays too).

## V5.11.16 — iPhone-style spring physics
- `spring-scroll.js` rewritten: rubber-band drag (heavier the further you pull), real damped spring on release that carries your release speed, and fast scrolls that hit the end feed their speed into the same spring. Home pull-to-reload threshold now matches the new drag feel (~200px pull).

## V5.11.15 — Used mobile details: wider box
- The details box now uses the full page width (same side gaps as the buttons below it), is taller, and the inner scrollbar no longer eats width.

## V5.11.14 — Pull down to reload on Home
- Home page only, when already at the top: pull down past ~80px and release to reload the app (a small ↻ indicator shows). Pulling up at the bottom, and every other page / popup / Menu, still just bounces.

## V5.11.13 — Fling bounce uses the same spring as drag-release
- The bounce when a normal scroll reaches the end now starts instantly and springs back with the same feel as letting go after a pull (no pause before moving).

## V5.11.12 — Spring bounce scrolling
- New `js/features/spring-scroll.js`: every scrolling page, popup and the Menu springs at the top/bottom. Dragging past the end follows the finger and springs back on release; a normal fast scroll that reaches the end gives one calm bounce (same feel at any speed). Uses the CSS `translate` property on the scroller's children (page = `.app-viewport`), skips inputs/horizontal swipes. `overscroll-behavior-y:none` removes the native glow. No data keys.

## V5.11.11 — Remove staff
- People & access: a 🗑 Remove button on every row except the owner and yourself. It deletes the user record (allowed by the existing Firestore rules, no rules change). Their old entries stay; if they sign in again they appear under "Waiting for access".
- Bottom-sheet popups (Entry details, receipt/return dialogs, repair filter, used-stock filter/detail) now open centered like the Edit popup.

## V5.11.10 — Reminders in English or Tamil
- Before a credit reminder or a repair "not collected" reminder opens WhatsApp, a popup asks English or Tamil (the last choice is marked). The Tamil text lives only in `js/features/remind-ta.js` (the one exception to the English-only rule, customer messages only). The app screens stay English.

## V5.11.9 — Ledger row actions, return without repair, polite messages
- Customer Ledger history: tap a row for full details (date, amount, mode, note, bill, receipt) with Edit / Delete; long press for an Edit / Delete menu. Delete goes to the Recycle Bin; deleting a payment made against a bill puts the amount back on the bill balance and removes its receipt, and Restore puts both back. Payments made against a bill are edited through their receipt.
- The Edit Credit / Payment popup has a Delete button and closes with the phone Back button.
- Repair: **Return without repair** (job details): reason, optional checking charge, refund shown when the advance is more than the charge. History has a separate "Returned – not repaired" section and tag.
- All customer WhatsApp messages (credit reminder, repair ready, not-collected reminders) were rewritten in a more polite tone (English).

## V5.11.8 — Repair: ready but not collected
- New chip **⏰ Not collected** in Pending Jobs: repaired (Ready) mobiles waiting 7+ days, oldest first. Each card has a WhatsApp button: **Reminder** (7+ days), **Warning** (30+, collect within 30 days, otherwise customer's risk) and **Final notice** (60+, shop not responsible; may dispose of / adjust against dues to the extent permitted by law). A UPI pay link is added when a balance is due. Sent reminders are remembered (`sk_repair_remind_log_v1`).
- The day a job becomes Ready is now stored (`readyAt`); older jobs use their last update date.
- The wording is not legal advice; add the 30 / 60 day rule to Bill terms / job slip too.

## V5.11.7 — pay link safety
- `pay.html`: shows "Balance as on <date>", the customer can change the amount (part payment), and the link expires after 3 days (then it asks the customer to contact the shop). The reminder message says the balance date and that the link is valid for 3 days.

## V5.11.6
- Customer QR removed everywhere (ledger link, ledger menu, bill history button). The file `js/features/customer-qr.js` is kept but no longer loaded; `view.html` stays.

## V5.11.5 — UPI pay link in credit reminders
- The WhatsApp credit reminder for one customer now ends with a "Pay ₹X now" link and the shop UPI ID (only when a UPI ID is saved in Shop Profile). The link opens new page `pay.html`, whose button opens GPay / PhonePe / Paytm with the pending amount filled in; it also has a Copy UPI ID button.

## V5.11.4
- Customer Ledger ⋮ menu: removed "Send history" (the blue link under the buttons stays).

## V5.11.3 — one Send history
- Customer Ledger: removed the duplicate big "Send history" box; the blue "Send history" link (next to Customer QR) and the ⋮ menu entry remain.

## V5.11.2 — History row fix
- Customer Ledger: the word "Credit" no longer breaks into two lines on repair-balance rows (the detail line is shown, not the "Tap to open" hint).

## V5.11.1 — Ledger layout, back button, bill order
- Customer Ledger: Receipts / Credit / Payment sit on one line; the bill card buttons are a 2 x 2 grid with the text inside the boxes.
- Phone Back button now closes the receipt / filter popups first (before, it closed the page under the popup).
- Bill History and the ledger bill list: bills of the same day are ordered by bill number, newest first.

## V5.11.0 — Receipts for every payment, repair search, buy back once, search fixes
- **Receipts:** every payment now gets its own shareable receipt (down payment, credit / EMI payment, repair advance, repair payment, account payment) showing amount, mode, total, paid so far and the balance. Share as WhatsApp text or PDF. Stored in `sk_receipts_v1`. Receipts can be edited (amount of a credit payment, date, mode, note, name); the bill balance and ledger follow. Customer Ledger → customer → 🧾 Receipts lists every receipt of that customer.
- **Sale bill is never changed by later payments:** a credit payment no longer adds to the bill's Down Payment. The bill shows the balance at the time of sale; Bill Details has a "Payments after sale" block with the receipts and the current balance. Old bills are repaired once (original Down Payment restored from the payment records, missing receipts created).
- **Repair Jobs (Pending):** search box (customer, phone, model, problem, amount, dealer) and a filter button (dealer, received date) with a "Filter ✕ Clear" bar.
- **Used stock:** Return / Buy back only on the latest sale of an IMEI; older sales show "Already bought back".
- **Search boxes:** the keyboard's search key hides the keyboard; the ✕ clears on the first tap.
- **Customer Ledger:** sales bill list shows the newest bill first.
- **People & access:** the row is also shown from the saved owner role and refreshes as soon as the cloud role is known.

## V5.10.6 — Used stock: buy back, sold edit, quick filter clear
- **Return / Buy back** on sold phones (⋮ menu and details): opens a new purchase with model, IMEI, colour, storage, kit filled in and the customer as dealer; enter the price and save. The old sale stays as history.
- **Edit on a sold phone** shows Sale details (Sold To, Phone, Sale Date, Sale Price); profit is recalculated.
- After an Excel import the list is stored newest first; future dates (e.g. 02/07/2027) are listed under "Please check".
- Active filters show under the search box with **✕ Clear**; the filter button shows a red dot while a filter is on.
