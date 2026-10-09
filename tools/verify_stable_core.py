#!/usr/bin/env python3
import hashlib, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "stable-core-lock.json"
data = json.loads(LOCK.read_text(encoding="utf-8"))
failed = False
for rel, expected in data["core_files"].items():
    p = ROOT / rel
    if not p.exists():
        print(f"MISSING: {rel}")
        failed = True
        continue
    actual = hashlib.sha256(p.read_bytes()).hexdigest()
    if actual != expected:
        print(f"CHANGED: {rel}")
        failed = True
    else:
        print(f"OK: {rel}")
if failed:
    print("\nV5.4 STABLE CORE VERIFICATION FAILED.")
    sys.exit(1)
print("\nV5.4 STABLE CORE VERIFIED — no locked core file changed.")
