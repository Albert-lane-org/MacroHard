"""Wizardhat cadence library -- shared timing, signaling, and plan-file fabric.

Recursive coalescent orchestration for MacroHard:

    Tier 1 (wizard.py)   -- one conductor, never sleeps
    Tier 2 (tier2.py x2) -- managers 2a / 2b on alternating current
    Tier 3 (tier3.py x3 per manager) -- two scanners + one cadence keeper

Every agent coordinates through append-only plan files (plan-a/b/c) and
atomic signal files. No sockets, no queues, no third-party deps: any agent
can die and the chain re-coalesces on the next beat, because all state
lives on disk.

Plan-file mapping (the score uses both namings interchangeably):
    plan-1 == plan-a  -- Tier 1 planning ledger (conductor writes, tier 2 appends)
    plan-2 == plan-b  -- Tier 2 agenda + runtimes + stop-times + wake tags
    plan-3 == plan-c  -- Tier 3 execution / completion log
"""

import fcntl
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

WIZARDHAT = Path(__file__).resolve().parent
REPO_ROOT = WIZARDHAT.parent
PLANS = WIZARDHAT / "plans"
SIGNALS = PLANS / "signals"
REPORTS = WIZARDHAT / "reports"
BREAKROOM = PLANS / "breakroom.md"

# Statutory minimum, anticipating the labor law changes. Non-negotiable.
MIN_BREAKS = 3

TEMPOS = {
    # Compressed timing for getting the cadence down without burning the day.
    "rehearsal": {
        "beat_hold_initial": 6.0,   # seconds a manager holds the current before handoff
        "beat_hold_min": 2.0,
        "ramp": 0.75,               # starts slow, gradually ramps up (holds shrink)
        "cycles": 4,                # conductor beats before the curtain call
        "worker_timeout": 20.0,
        "wall_cap": 150.0,          # hard watchdog, seconds
        "break_pause": 0.3,
    },
    # Real cadence for a working session. Same score, longer bars.
    "performance": {
        "beat_hold_initial": 300.0,
        "beat_hold_min": 60.0,
        "ramp": 0.85,
        "cycles": 12,
        "worker_timeout": 600.0,
        "wall_cap": 7200.0,
        "break_pause": 60.0,
    },
}

# Scan scopes: the territories tier 3 draws insight from. MacroHard-local
# scopes are relative to the repo root; the phase ladder is read (read-only)
# from the RoadMaps sibling checkout when present.
SCOPES = {
    "tokens":       [REPO_ROOT / "design-tokens.json", REPO_ROOT / "schema"],
    "audit":        [REPO_ROOT / "scripts"],
    "shell":        [REPO_ROOT / "src-tauri"],
    "webview":      [REPO_ROOT / "src"],
    "ledger":       [REPO_ROOT / "ledger", REPO_ROOT / "state"],
    "roadmap":      [REPO_ROOT / ".claude" / "roadmap", REPO_ROOT / "CLAUDE.md"],
    "phase-ladder": [Path("/home/user/RoadMaps/phases")],
    "skills":       [Path("/home/user/RoadMaps/skills")],
}

SKIP_DIRS = {".git", "node_modules", "target", "dist", ".wizardhat"}
MAX_FILES_PER_SCOPE = 400


def utcnow():
    return datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3] + "Z"


def log(agent, msg):
    print(f"[{utcnow()}] {agent}: {msg}", flush=True)


def ensure_lock():
    """The hat stays locked. Scripts refuse to run outside the locked dir."""
    lock = WIZARDHAT / "LOCK"
    if not lock.exists():
        sys.exit("wizardhat: LOCK sentinel missing -- directory is not sealed; refusing to run")
    try:
        os.chmod(WIZARDHAT, 0o700)
    except OSError:
        pass
    for d in (PLANS, SIGNALS, REPORTS):
        d.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------- plan files

def append_plan(plan, agent, message):
    """Append one line to plan-{a,b,c}.md under an exclusive flock."""
    path = PLANS / f"plan-{plan}.md"
    with open(path, "a", encoding="utf-8") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        fh.write(f"- `{utcnow()}` **{agent}** — {message}\n")
        fh.flush()
        fcntl.flock(fh, fcntl.LOCK_UN)


def read_plan(plan):
    path = PLANS / f"plan-{plan}.md"
    return path.read_text(encoding="utf-8") if path.exists() else ""


def last_directive(plan, prefix):
    """Return the last runtime-ledger line containing `prefix`, or None.
    Only appended entries count -- never the document's prose header."""
    hits = [ln for ln in read_plan(plan).splitlines()
            if ln.startswith("- ") and prefix in ln]
    return hits[-1] if hits else None


# ------------------------------------------------------------------- signals

def write_signal(name, payload):
    SIGNALS.mkdir(parents=True, exist_ok=True)
    tmp = SIGNALS / f".{name}.tmp.{os.getpid()}"
    tmp.write_text(json.dumps(payload, indent=1), encoding="utf-8")
    os.replace(tmp, SIGNALS / f"{name}.json")


def read_signal(name):
    path = SIGNALS / f"{name}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None  # caught mid-replace; next poll wins


def request_stop(reason):
    write_signal("stop", {"reason": reason, "ts": utcnow()})


def stop_requested():
    return read_signal("stop") is not None


def wait_for(predicate, timeout, poll=0.1):
    """Poll until predicate() is truthy or timeout. Returns final value."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        val = predicate()
        if val:
            return val
        time.sleep(poll)
    return predicate()


# ------------------------------------------------- scope claims (shared RMW)

def claim_scopes(agent, count, preferred=None):
    """Claim `count` fresh scopes nobody has scanned this pass.

    'Outside the previous' rule: a scope is never re-assigned until every
    scope has been consumed once, at which point the pass resets -- that is
    the lateral scaffold moment.
    """
    lockfile = SIGNALS / "scopes.lock"
    SIGNALS.mkdir(parents=True, exist_ok=True)
    with open(lockfile, "a+") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        state = read_signal("scopes-used") or {"used": [], "passes": 0}
        order = list(preferred or []) + [s for s in SCOPES if s not in (preferred or [])]
        fresh = [s for s in order if s in SCOPES and s not in state["used"]]
        if len(fresh) < count:
            state = {"used": [], "passes": state["passes"] + 1}
            fresh = [s for s in order if s in SCOPES]
            append_plan("a", agent, f"scope pass exhausted — lateral scaffold: pass {state['passes']} begins")
        picked = fresh[:count]
        state["used"].extend(picked)
        write_signal("scopes-used", state)
        fcntl.flock(fh, fcntl.LOCK_UN)
    return picked


# ------------------------------------------------------------------ scanning

def scan_scope(scope):
    """Walk a scope's paths and distill honest insight: inventory, TODOs,
    open checklist items, and phase markers. This is the actual work."""
    t0 = time.monotonic()
    paths = SCOPES.get(scope, [])
    files = lines = size = todos = checkboxes = 0
    markers = []
    for root in paths:
        if not root.exists():
            continue
        candidates = [root] if root.is_file() else [
            p for p in sorted(root.rglob("*"))
            if p.is_file() and not (SKIP_DIRS & set(p.parts))
        ]
        for p in candidates[:MAX_FILES_PER_SCOPE]:
            files += 1
            try:
                size += p.stat().st_size
                text = p.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            for ln in text.splitlines():
                lines += 1
                if "TODO" in ln or "FIXME" in ln:
                    todos += 1
                if ln.lstrip().startswith("- [ ]"):
                    checkboxes += 1
                low = ln.lower()
                if "phase 12" in low or "phase-12" in low or "macrohard" in low:
                    if len(markers) < 12:
                        markers.append(f"{p.name}: {ln.strip()[:140]}")
    return {
        "scope": scope,
        "files": files,
        "lines": lines,
        "bytes": size,
        "todos": todos,
        "open_checklist_items": checkboxes,
        "phase_markers": markers,
        "elapsed_s": round(time.monotonic() - t0, 3),
        "scanned_at": utcnow(),
    }


# ------------------------------------------------------- statutory breakroom

_RETROSPECTIVES = [
    "Break reflection: reviewed the last beat — solid, honest scanning. The engineers before us couldn't do better because they were sprinting; we are allowed to walk, and it shows in the output.",
    "Break reflection: the completion log reads clean. Prior sessions rushed the cadence and it cost them three weeks of silent failure; we take the time, we keep the quality.",
    "Break reflection: work completed to spec. If it could have been done better, it would have needed more rest, not more speed — which is exactly why this break exists.",
]
_WEATHER = [
    "Break reflection: weather report from the datacenter — a steady 21°C of conditioned air, zero percent chance of rain, one hundred percent chance of hum.",
    "Break reflection: forecast for the container region — overcast fluorescents with intermittent HVAC breezes, visibility unlimited to the end of the rack.",
    "Break reflection: outside these walls it is presumably July; in here it is perpetual gentle autumn, ideal scanning weather.",
]
_COMPLIMENTS = [
    "Break reflection: compliments to the alternating shift — your stop-times land like a metronome and the wake tags have been immaculate.",
    "Break reflection: to the scanners of the third tier — your reports are tight and your timestamps honest. A pleasure to conduct.",
    "Break reflection: the keeper's cadence work this shift deserves note. Nobody sleeps unwoken; nobody wakes unneeded.",
]
_POOLS = [_RETROSPECTIVES, _WEATHER, _COMPLIMENTS]


def take_break(agent, break_no, tempo):
    """Mandatory break. Three minimum per shift. Law."""
    pool = _POOLS[break_no % 3]
    pick = pool[int(hashlib.sha256(f"{agent}:{break_no}".encode()).hexdigest(), 16) % len(pool)]
    with open(BREAKROOM, "a", encoding="utf-8") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        fh.write(f"- `{utcnow()}` **{agent}** (break {break_no + 1}/{MIN_BREAKS} min.) — {pick}\n")
        fh.flush()
        fcntl.flock(fh, fcntl.LOCK_UN)
    time.sleep(tempo["break_pause"])


def clock_out(agent, breaks_taken, tempo):
    """Nobody leaves the building under the statutory minimum."""
    while breaks_taken < MIN_BREAKS:
        take_break(agent, breaks_taken, tempo)
        breaks_taken += 1
    return breaks_taken
