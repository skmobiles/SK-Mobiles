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
