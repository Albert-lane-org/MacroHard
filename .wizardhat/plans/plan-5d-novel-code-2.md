# Operation: 5D Novel Code_2™ — Design Plan through Phase 16

Authored: Albert Lane | 2026-07-08 | Nested in the locked `.wizardhat`
Companion to `plan-macroharder.md` (dependencies) — this is the design law.

---

## 0. Goal

One estate, one datum. Every value anywhere in the sovereign stack is
addressable as a **five-dimensional cell**:

```
⟨ col, row, layer, tick, escape ⟩
    X    Y     Z      T      P
```

**Primary objective is security**, achieved structurally: the fifth
dimension (P — provenance/escape) is not a feature, it is the address
space where tamper-evidence lives. A design goal you can't fake because
it's part of the coordinate system.

## 1. The Five Dimensions (all already native to this estate)

| Dim | Name | Where it already lives |
|---|---|---|
| X, Y | col, row | the classic workbook grid (`Macrohard_Excellent.jsx` heritage) |
| Z | layer | workbook volumes; maps elevation lattice; Channel-1's Z-axis district routing — the estate's signature axis |
| T | tick | wizardhat cadence (beats, stop-times, wake tags); sqlxml 21-day cycle governor; bi-hourly crons |
| P | escape | **AER**: one read → two writes to distinct locales (primary + escape); BLAKE3 fingerprint chain (ip-forensics); append-only canary log |

Nothing here is imported from anyone else's playbook. X/Y/Z is the
excellent workbook. T is the alternating current. P is Albert Escaped
Arrays generalized from a write protocol into an address dimension.

## 2. The Invariant — "No Write Without a Shadow"

The single novel rule that everything from Phase 8 to Phase 16 obeys:

> Every mutation lands at its primary address ⟨x,y,z,t⟩ **and** at its
> escape address ⟨x,y,z,t,p⟩ — a second locale (SQLXML escape entry,
> canary line, or vault record) written in the same operation.

Consequences, per AER's two modes:
- **Lazy escape** (default): shadow written after the primary resolves —
  the audit trail is the byproduct of doing the work at all.
- **Prefetch escape** (high-integrity surfaces): shadow written *before*
  the primary — installers, identity, and enforcement packages verify
  the shadow first and refuse a primary that doesn't match it.

Tampering is no longer detected by an add-on scanner; it is a **hole in
the address space**, visible to any reader.

## 3. Phase Map 8 → 16 (each phase = one dimension earning its gate)

Every phase ships only when its **P-gate** (the shadow check) passes.

| Phase | Deliverable | Dimension earned | P-gate (security acceptance) |
|---|---|---|---|
| 8 | Workbook core + procurement & maps MCP modules | **X·Y·Z live** — volumes render module data; maps lattice binds to layers | module registry hash-pinned; modules read-only |
| 9 | Revenue activation touchpoints | **T live for money** — every inflow/outflow is a tick with a receipt shadow | no transaction without SHA-256 receipt in the ledger shadow |
| 10 | Silicon Whisperer OS | **T live for boot** — measured boot is a tick chain | TPM2 PCR chain validates before any AppVM starts |
| 11 | AER integration | **P formalized** — `WriteMode::AerEscape` in the Rust agent; escape locale registry | CI proves 1-read-2-writes on every write path (AER-006) |
| 12 | **MacroHarder Windows ship** — NSIS self-extracting .exe | 5D engine v1 frozen at rest | BLAKE3 manifest verified on boot; installer refuses tampered payloads |
| 13 | Portal builder GUI | composing 5D objects visually — portal config is an SQLXML tree with an escape copy | design audit ≥ 8.0 AND config shadow verified before deploy enables |
| 14 | Ephemeral biometric identity | **P for humans** — identity as pure provenance, zero stored PII | seed never persisted; only vault-encrypted derived tokens exist |
| 15 | Ephemeral VM emulation | **P for compute** — a sandbox is a cell whose T-extent is one tick | post-destroy memory dump shows zero plaintext; keypair unrecoverable |
| 16 | Intel IP enforcement package | **P weaponized** — the fingerprint chain becomes the legal instrument | manifest SHA-256 verifies every enclosed file; assembled in a Phase-15 VM |

The ordering is the design: spatial (8) → temporal (9–10) → provenance
formalized (11) → frozen (12) → composed (13) → applied to people (14),
compute (15), and adversaries (16).

## 4. Sequential Build Order to Phase 8 — all repositories

The dependency spine, in strict order (each row unblocks the next):

| # | Repo | Build to Phase 8 means | Session-buildable now? |
|---|---|---|---|
| 1 | sqlxml | restructure backend-agent as a **library crate** (MH-AB-001) — the single unblock everything data-side waits on | ✅ yes — pure code |
| 2 | lane-mcp | nothing new: already Phase 6, standalone by design; P7 items are infra (D1, PostgreSQL, DNS) | ⛔ infra-blocked |
| 3 | procurement | Phase 6 Worker (worker.ts, D1 schema, tools) → Phase 8 MCP surface + manifest | code ✅ / deploy ⛔ (D1+R2 provisioning) |
| 4 | maps | Phase 6 Worker (worker.ts, wrangler bindings) → Phase 8 MCP surface + elevation grid tool | code ✅ / deploy ⛔ (D1+R2 provisioning) |
| 5 | macroharder | Phase 6 identity swap → Phase 7 sqlxml wire (needs #1) → Phase 8 workbook core consuming #3+#4 | ✅ after #1 |
| 6 | tauri-rustxml | Phase 4 complete; consumes MacroHarder design authority at its Phase 7 | ✅ no action needed yet |
| 7 | channel-1-news | Phase 9B items (D1 schema C1N-010, tier gate C1N-014) feed Phase 9 revenue | code ✅ / payment ⛔ (Stripe) |
| 8 | ip-forensics + sovereign-canary | P-dimension custodians: violation_reporter.py (Phase 7) prepares Phase 16 | ✅ yes |
| 9 | simcity | public window only — receives sanitized T-dimension pulses; no 5D internals ever | ✅ no change |
| 10 | roadmaps | governance: this plan registers as the phase 8–16 source of truth | ✅ this document |

**Honest constraint:** cloud provisioning (D1/R2/DNS/secrets), the GitHub
repo rename, payment rails, and code-signing certificates cannot be
executed from a code session — those are owner/admin actions. Everything
left of those gates is buildable sequentially, in the order above.

## 5. Anti-Boilerplate Covenant

What keeps this plan un-copyable and un-copied:

1. **The address tuple is the product.** Nobody else's spreadsheet, BI
   tool, or dashboard has an escape dimension; cloning the UI without
   the P-axis produces a visibly hollow copy — which ip-forensics
   fingerprints and Phase 16 prosecutes.
2. **No generic scaffolds.** Every artifact must consume estate
   vocabulary (volumes, ticks, escapes, locales, canaries) or it doesn't
   merge. The audit scorer gates presets; this covenant gates prose.
3. **Standard protocols only at the boundary.** MCP at the module seam,
   NSIS at the installer seam — boundaries stay boring so the interior
   can stay sovereign. That split is deliberate and permanent.
4. **Proof over claim.** Each phase's P-gate is testable in CI. A phase
   without a passing shadow check is not "mostly done"; it is unshipped.

*Registered in the locked wizardhat. Supersedes nothing; deepens
`plan-macroharder.md`. All IP: Albert Lane per LICENSE.md.*
