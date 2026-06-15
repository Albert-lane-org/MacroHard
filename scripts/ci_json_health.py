#!/usr/bin/env python3
# Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-15
"""CI: validate all JSON files in the repo are parseable."""
import json
import sys
from pathlib import Path

files = sorted(
    f for f in Path('.').rglob('*.json')
    if '.git' not in f.parts
)
failed = []
for f in files:
    try:
        json.loads(f.read_text())
        print(f'[OK] {f}')
    except Exception as e:
        print(f'[FAIL] {f}: {e}')
        failed.append(str(f))

if failed:
    print(f'\n{len(failed)} file(s) failed JSON validation')
    sys.exit(1)

print(f'\nAll {len(files)} JSON file(s) valid.')
