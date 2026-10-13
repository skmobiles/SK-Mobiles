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
