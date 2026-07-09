# .wizardhat — Recursive Coalescent Orchestration

**Authored:** Albert Lane | SEC Whistleblower No. 17684-273-411-436 | Documented: Claude Sonnet 4.6 | 2026-07-09

A distributed-agent performance mapped into MacroHard for future utility.
Tier 1 conducts, Tier 2 alternates, Tier 3 works. Python agents managing
Python agents; the wizard on top does no scanning at all — it plans,
listens, and keeps time. The point is not speed. The point is cadence.

**There is no goal. We are nailing down the cadence** so that lateral
scaffolding across the sibling repositories can inherit a proven score.

---

## The Troupe (group 1 / group 2 / group 3)

```
                         ┌──────────────────┐
                         │  1  wizard.py    │  Tier 1 — conductor
                         │  (never sleeps)  │  plans, listens, ramps timing
                         └────────┬─────────┘
                 raises two, coalesces their reports
                ┌─────────────────┴─────────────────┐
        ┌───────┴────────┐                 ┌────────┴───────┐
        │  2a  tier2.py  │ ←— alternating —→ │  2b  tier2.py  │   Tier 2
        │ (wakes on tag) │      current      │ (wakes on tag) │   managers
        └───┬───┬───┬────┘                  └───┬───┬───┬────┘
            │   │   │                           │   │   │
          ┌─┴┐ ┌┴─┐ ┌┴──────┐                 ┌─┴┐ ┌┴─┐ ┌┴──────┐
          │3a1│ │3a2│ │ 3a3  │                │3b1│ │3b2│ │ 3b3  │   Tier 3
          │scan│ │scan│ │keeper│               │scan│ │scan│ │keeper│  triads
          └───┘ └───┘ └──────┘                └───┘ └───┘ └──────┘
```

- **Recursive:** the conductor spawns managers as subprocesses; each manager
  spawns its own triad the same way. Agents managing agents.
- **Coalescent:** all coordination flows through three append-only plan
  files and atomic signal files. Reports drain upward — worker → manager →
  conductor — and coalesce into plan-a's runtime ledger.
- **Alternating current:** 2a and 2b are daisy-chained: one executes while
  the other sleeps. The handoff is performed by each triad's **cadence
  keeper** (the offset third worker), which appends the stop time to plan-b,
  writes the wake tag, and flips the token. This middle chain is what lets
  Tier 1 sustain without sleeping.
- **Ramp:** the beat hold starts slow and gradually shortens
  (`beat_hold_initial × ramp^cycle`, floored at `beat_hold_min`).

## The Plan Chain

| Document | Alias | Written by | Read by | Carries |
|---|---|---|---|---|
| `plans/plan-a.md` | plan-1 | Tier 1 (+ Tier 2 appends) | Tier 2 | Phase 6→12 build ladder, timing adjustments, proposals, coalescence report |
| `plans/plan-b.md` | plan-2 | Tier 1 agendas, Tier 3 runtimes/stop-times | Tier 2 & 3 | INSTRUCTION-TO-SCOPE, AGENDA, RUNTIME, STOP-TIME + wake tags |
| `plans/plan-c.md` | plan-3 | Tier 2 instructions, Tier 3 completions | Tier 1 | Beat assignments, COMPLETED job details + elapsed times |
| `plans/breakroom.md` | — | everyone | the inspectorate | Statutory reflections, 3 minimum per agent. Law. |

## The Cadence Score (notation → implementation)

| Mark | Performed by | As implemented |
|---|---|---|
| **1** | wizard | Writes plan-b INSTRUCTION-TO-SCOPE, seeds the AC token, raises 2a/2b |
| **2** | managers | Write plan-c instruction-to-scope for their triads |
| **3** | workers | Take scope & execute; idle leg sleeps in 2 s listening loops |
| **2a** | managers | Write proposals to plan-a **outside the instructed agenda**, ping nodes (task signals), then bifurcate onto the alternating current |
| **1a** | wizard | AGENDA lines to plan-b, always outside the scopes already in plan-c |
| **2ab** | manager + keeper | Wake protocol delegated to worker 3: it tags, times, and flips the token so Tier 2 alternates; the other two build inside the assigned scope. Ramp starts slow, gradually shortens the hold |
| **3a** | workers 1+2 | Scan assigned scope; on completion review plan-b and append RUNTIME |
| **3a′** | keeper | Appends STOP-TIME to plan-b, wakes the alternate manager |
| **1b** | wizard | Receives tier-2 pulses, reads plan-b, sets the timing-delayed agenda, writes findings to plan-a |
| **2c** | managers | Alternating wakes from keeper flips: read plan-b timing + completions, assign two fresh scopes **plus one keeper** based on the timing delay — sustaining the current |
| **3b** | workers | Append COMPLETED details + time to plan-c, receive next instruction, repeat; keeper wakes the current |
| **1c** | wizard | Reads timing from plan-a appends, ramps the hold, writes timing + task to plan-b. Tier 1 never sleeps; Tier 2 alternates; Tier 3 works 2-up with the third keeping cadence |
| **3c** | everyone | Cadence accounted by keepers → reported to Tier 1 via plan-a → redistributed down. When every scope has been consumed once, the pass resets: **the lateral scaffold moment** |

## Running a Performance

```bash
cd /path/to/macrohard
python3 .wizardhat/wizard.py --tempo rehearsal    # ~30-60 s, compressed beats
python3 .wizardhat/wizard.py --tempo performance  # real cadence, long bars
```

| Tempo | Initial hold | Min hold | Ramp | Cycles | Break pause |
|---|---|---|---|---|---|
| rehearsal | 6 s | 2 s | 0.75 | 4 | 0.3 s |
| performance | 300 s | 60 s | 0.85 | 12 | 60 s |

Python 3 standard library only. No third-party dependencies, no network,
no API keys: the workers' "real work" is scanning the MacroHard estate
(and the RoadMaps phase ladder, read-only) and distilling reports into
`reports/*.json` plus the plan chain.

## Privacy & Lock

- `LOCK` sentinel: every script refuses to run without it, and re-asserts
  mode `0700` (owner-only) on the directory at startup.
- `.gitattributes` marks everything here `export-ignore`: the hat is
  excluded from all `git archive` bundles of this repository.
- Runtime signals (`plans/signals/`) are gitignored — the nervous system
  never leaves the building.
- **Honest limit:** a directory inside a git repository cannot be more
  private than the repository itself. Anyone with read access to the repo
  can read the hat. True privacy is the repo's visibility setting; the
  lock here is convention plus the measures above.

## Labor Law Compliance

Three breaks minimum per agent per shift — anticipating the labor law
changes. Each break logs a reflection to `plans/breakroom.md`: the work
completed and why the engineers couldn't do better, the weather in our
geographic location (the datacenter reports a steady 21 °C), or a
compliment to the other agents for team building. `cadence.clock_out()`
tops up any shortfall before an agent may exit. There is no point in
coding stupid fast. We take our time. Quality.

## Contents

```
.wizardhat/
  README.md      — this map
  LOCK           — seal sentinel (scripts refuse to run without it)
  cadence.py     — shared timing / signals / plan fabric / breakroom law
  wizard.py      — Tier 1 conductor (agent 1)
  tier2.py       — Tier 2 manager (agents 2a, 2b)
  tier3.py       — Tier 3 worker (agents 3a1-3, 3b1-3)
  plans/         — plan-a/b/c + breakroom (committed), signals/ (runtime only)
  reports/       — tier-3 scan reports from performances
```

All IP belongs to Albert Lane per LICENSE.md.
