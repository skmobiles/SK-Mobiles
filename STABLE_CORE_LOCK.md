# SK MOBILES — V5.6.1 STABLE CORE LOCK

## Status
**V5.6.1 is the current Stable Core baseline after the approved Design Studio changes.**

The existing application code in this package is treated as the Source of Truth for the V5.4 Stable Core. Future work must not modify, delete, rename, disable, or replace the locked core files unless explicit approval is given for a core change.

## Locked core
- `index.html`
- `js/app.js`
- `js/firebase-sync.js`
- `css/style.css`
- `firestore.rules`
- `FIREBASE_SETUP.txt`
- `README.mdSK-V4.13 ( Stabled Version) V3`

## Future feature rule
New functionality should be added through separate files under `js/features/` (or another clearly separated extension layer) and loaded without changing existing business logic wherever possible.

If a new feature genuinely requires a locked-core change, stop and obtain explicit approval before changing the core.

## Data protection
Do not change existing Firebase configuration, Firestore structure, document IDs, LocalStorage keys, bill/customer/product/repair/payment/receipt IDs, or existing working business logic as part of a new feature.

## Verification
`stable-core-lock.json` contains SHA-256 fingerprints of the locked files. Run:

```bash
python tools/verify_stable_core.py
```

A successful verification means the locked files still match the V5.6.1 baseline.

## Important limitation
This package-level lock is a development/source-control safeguard. It does not make browser-side JavaScript physically unmodifiable. For GitHub enforcement, protect the stable branch/tag and require review before changes are merged.
