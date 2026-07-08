# PLAN-A — Tier 1 Planning Ledger (a.k.a. plan-1)

Conductor's document. Tier 1 writes the build ladder and timing here;
Tier 2 appends observations, proposals, and beat timings for the
conductor to read back. Tier 2 references this plan to derive plan-b.

---

## The MacroHarder Build Ladder — Phase 6 → Phase 12

> **REVISED 2026-07-08 — the MacroHarder pivot.** The product is now
> **MacroHarder™** (MacroHard mark taken by xAI filing) and the Phase 12
> Firestick HD deployment is **out**, replaced by the Windows ship
> (NSIS self-extracting .exe). The authoritative score is now
> **`plan-macroharder.md`** — master plan, full dependency tree, and the
> re-scored Phase 6→12 ladder. The ladder below is kept as the original
> record; where it conflicts with plan-macroharder.md, the latter wins.
> Also revised: MHARD-003 (`lane_macrohard_score` in lane-mcp) is
> relocated to MacroHarder's own MCP module surface — lane-mcp stays
> standalone.

Distilled from `RoadMaps/phases/phase-4-8-plan.md`,
`phase-9-16-sovereign-stack.md`, `phase-9-16-sovereign-expansion.md`,
and `.claude/roadmap/sibling-roadmap.json`. This is the score the tiers
rehearse against. No sprinting: cadence first, quality always.

### Phase 6 — Tauri Shell (in progress, current)
- [ ] MH-P6-02 — sqlxml-engine Cargo dependency: stub wired, keep Phase 7 activation path warm
- [ ] MHARD-003 — `lane_macrohard_score` endpoint exposed through lane-mcp (design compliance API)
- [x] MH-P6-01 — src-tauri/ Tauri 2.0 shell
- [x] MH-P6-03 — token inspector UI

### Phase 7 — Production Build
- [ ] MH-P7-01 — Windows MSI build workflow
- [ ] MH-P7-02 — Linux AppImage build workflow
- [ ] MH-AB-001 — sqlxml-engine live wire (requires sqlxml backend-agent restructured as a library crate)

### Phase 8 — Ship (Windows + Android, Oct–Nov 2026)
- [ ] MacroHard GUI ships as the Tauri WebView binary referenced by the Phase 9–16 stack plan
- [ ] Design authority services consumed by tauri-rustxml sovereign browser

### Phase 9 — Revenue Activation touchpoints
- [ ] MacroHard design audit gate on every public/subscription surface (Channel #1 News, procurement dashboard)
- [ ] Audit scoring (`scripts/audit_score.py`) promoted to a deploy gate: no surface ships below threshold

### Phase 10 — Silicon Whisperer OS
- [ ] MacroHard runs as an isolated Tauri AppVM under Qubes² (each AppVM is itself a Tauri application)
- [ ] Audit tooling reachable only via qrexec-proxied lane-mcp — never raw sockets

### Phase 11 — Albert Escaped Arrays integration
- [ ] Design tokens + inspector affordances for the one-read-two-writes (primary + escape locale) visualization
- [ ] UI surfaces for `WriteMode::AerEscape` (sibling dependency: AER-004 in sqlxml)

### ~~Phase 12 — Silicon Whisperer OS → Firestick HD (Jan–Feb 2027)~~ SUPERSEDED
- **OUT (2026-07-08):** Firestick HD deployment cancelled. Phase 12 is now
  the **MacroHarder Windows ship** — NSIS self-extracting .exe installer,
  filesystem integrity manifest on boot, signed release. See
  `plan-macroharder.md` §5 for the full re-scored ladder (Android and
  macOS follow at 13+).

**Lateral scaffolding:** once the cadence below is captured on this one
repository, the same score (tiers, plans, alternating current) is reusable
across the sibling repos — that is the future utility this directory maps.

---

## Runtime ledger (appended by the tiers during performances)
- `07:10:20.999Z` **wizard-1** — curtain up — tempo `rehearsal`, cycles=4, hold 6.0s → 2.0s (ramp 0.75)
- `07:10:21.033Z` **2b** — proposal (outside instructed agenda): fold `skills` insight into the Phase-12 build ladder before lateral scaffolding
- `07:10:21.064Z` **2a** — proposal (outside instructed agenda): fold `phase-ladder` insight into the Phase-12 build ladder before lateral scaffolding
- `07:10:21.267Z` **2a** — beat 1 timing: hold=6.0s, completions=2/2 {'3a1': 0.0, '3a2': 0.0}, beat wall=0.2s
- `07:10:21.331Z` **wizard-1** — cycle 0: pulses=1 — last handoff: STOP-TIME lines + wake tags as they flip the alternating current.
- `07:10:21.331Z` **wizard-1** — timing adjusted → next hold 4.5s (ramping up; tier 1 not sleeping)
- `07:10:27.354Z` **2b** — beat 2 timing: hold=4.5s, completions=2/2 {'3b1': 0.0, '3b2': 0.0}, beat wall=0.1s
- `07:10:27.453Z` **wizard-1** — cycle 1: pulses=2 — last handoff: waking 2b
- `07:10:27.453Z` **wizard-1** — timing adjusted → next hold 3.4s (ramping up; tier 1 not sleeping)
- `07:10:31.898Z` **2a** — beat 3 timing: hold=3.38s, completions=2/2 {'3a1': 0.0, '3a2': 0.0}, beat wall=0.1s
- `07:10:31.968Z` **wizard-1** — cycle 2: pulses=3 — last handoff: waking 2a
- `07:10:31.968Z` **wizard-1** — timing adjusted → next hold 2.5s (ramping up; tier 1 not sleeping)
- `07:10:35.381Z` **2b** — beat 4 timing: hold=2.53s, completions=2/2 {'3b1': 0.0, '3b2': 0.01}, beat wall=0.1s
- `07:10:35.480Z` **wizard-1** — cycle 3: pulses=4 — last handoff: waking 2b
- `07:10:35.480Z` **wizard-1** — timing adjusted → next hold 2.0s (ramping up; tier 1 not sleeping)
- `07:10:38.175Z` **2a** — shift complete — 3 beats on the alternating current, 3 breaks honored
- `07:10:38.267Z` **2b** — shift complete — 4 beats on the alternating current, 3 breaks honored
- `07:10:38.318Z` **wizard-1** — COALESCENCE — 9 completions, 8 scan reports, 17.3s wall, breaks honored across all tiers. Cadence is captured; lateral scaffolding can inherit this score.
- `07:11:17.029Z` **wizard-1** — curtain up — tempo `rehearsal`, cycles=4, hold 6.0s → 2.0s (ramp 0.75)
- `07:11:17.066Z` **2a** — proposal (outside instructed agenda): fold `phase-ladder` insight into the Phase-12 build ladder before lateral scaffolding
- `07:11:17.072Z` **2b** — proposal (outside instructed agenda): fold `skills` insight into the Phase-12 build ladder before lateral scaffolding
- `07:11:17.168Z` **2a** — beat 1 timing: hold=6.0s, completions=2/2 {'3a1': 0.0, '3a2': 0.0}, beat wall=0.1s
- `07:11:17.231Z` **wizard-1** — cycle 0: pulses=1 — last handoff: waking 2a
- `07:11:17.231Z` **wizard-1** — timing adjusted → next hold 4.5s (ramping up; tier 1 not sleeping)
- `07:11:23.296Z` **2b** — beat 2 timing: hold=4.5s, completions=2/2 {'3b1': 0.0, '3b2': 0.0}, beat wall=0.1s
- `07:11:23.385Z` **wizard-1** — cycle 1: pulses=2 — last handoff: waking 2b
- `07:11:23.386Z` **wizard-1** — timing adjusted → next hold 3.4s (ramping up; tier 1 not sleeping)
- `07:11:27.914Z` **2a** — beat 3 timing: hold=3.38s, completions=2/2 {'3a1': 0.0, '3a2': 0.0}, beat wall=0.1s
- `07:11:28.013Z` **wizard-1** — cycle 2: pulses=3 — last handoff: waking 2a
- `07:11:28.013Z` **wizard-1** — timing adjusted → next hold 2.5s (ramping up; tier 1 not sleeping)
- `07:11:31.428Z` **2b** — beat 4 timing: hold=2.53s, completions=2/2 {'3b1': 0.0, '3b2': 0.01}, beat wall=0.1s
- `07:11:31.527Z` **wizard-1** — cycle 3: pulses=4 — last handoff: waking 2b
- `07:11:31.527Z` **wizard-1** — timing adjusted → next hold 2.0s (ramping up; tier 1 not sleeping)
- `07:11:34.263Z` **2a** — shift complete — 3 beats on the alternating current, 3 breaks honored
- `07:11:34.327Z` **2b** — shift complete — 4 beats on the alternating current, 3 breaks honored
- `07:11:34.365Z` **wizard-1** — COALESCENCE — 8 completions, 8 scan reports, 17.3s wall, breaks honored across all tiers. Cadence is captured; lateral scaffolding can inherit this score.
