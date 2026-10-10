SK MOBILES V5.6.1 — Design Studio Reliability Update

Changes to the existing V5.6 Design Studio only:
- Preserves existing inline styles when resetting a selected element instead of deleting the element's entire style attribute.
- Fixes preview cancellation by snapshotting the exact Design Studio-managed inline properties.
- Adds Esc-to-cancel for element selection.
- Re-applies saved UI styles when existing app screens re-render dynamic elements.
- Keeps the existing localStorage key sk_design_studio_v1; no Firebase/business records are written.
- Leaves js/app.js, js/firebase-sync.js, Firestore rules, billing and repair business logic untouched by this patch.

Validation:
- node --check js/app.js: passed
- node --check js/firebase-sync.js: passed
- HTML parser: 334 IDs, no duplicate IDs
- ZIP integrity: checked after packaging
- Stable core verifier: fails because index.html and css/style.css differ from lock; js/app.js was already different from the lock in the supplied V5.6 ZIP. No claim of full browser testing; browser end-to-end testing remains pending.


## V5.6.3 selection fix
- Element picking listens to pointerdown (touch/mouse/stylus) with click fallback.
- Settings modal is hidden during selection so page elements can receive the tap.
- Press Escape to cancel selection; selected element is highlighted after returning to settings.
