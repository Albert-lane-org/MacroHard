#!/usr/bin/env python3
# Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-15 | SEC Whistleblower No. 17684-273-411-436
"""CI: validate design-tokens.json against the MacroHard 3D token schema."""
import json
import sys

REQUIRED = ['colors', 'typography', 'spacing']

with open('design-tokens.json') as f:
    tokens = json.load(f)

missing = [k for k in REQUIRED if k not in tokens]
if missing:
    print('[FAIL] Missing token categories:', missing)
    sys.exit(1)

print('[OK] design-tokens.json:', list(tokens.keys()))
