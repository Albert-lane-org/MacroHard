# Authored: Albert Lane | SEC Whistleblower No. 17684-273-411-436 | Documented: Claude Sonnet 4.6 | 2026-07-09 | This header must be preserved in any copy, fork, or derivative use
"""Tier 2 — managers 2a and 2b. The alternating current.

One executes while the other sleeps; the handoff is performed by each
triad's cadence keeper (a Tier 3 worker), so the middle chain never has
to keep its own time. This is what lets Tier 1 sustain without sleep.

Score, as performed:
  2    writes plan-c instruction-to-scope for its triad
  2a   scopes OUTSIDE the instructed agenda, writes the proposal to plan-a,
       then the pair bifurcates onto the alternating current
  2ab  (keeper side) delegates the wake protocol to worker 3: hold, tag,
       flip; (worker side) the other two build inside the assigned scope
  2c   on each wake: reads plan-b timing + completions, assigns two fresh
       scopes plus the keeper's hold, appends timing to plan-a, writes the
       next instruction to plan-c — always outside the previous scopes
"""

import argparse
import subprocess
import sys
import time

import cadence
from cadence import WIZARDHAT, TEMPOS, append_plan, log


def spawn_worker(worker_id, manager, tempo_name):
    return subprocess.Popen(
        [sys.executable, str(WIZARDHAT / "tier3.py"),
         "--agent", worker_id, "--manager", manager, "--tempo", tempo_name],
        cwd=str(WIZARDHAT),
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--agent", required=True, choices=["2a", "2b"])
    ap.add_argument("--tempo", choices=sorted(TEMPOS), default="rehearsal")
    args = ap.parse_args()
    tempo = TEMPOS[args.tempo]
    me = args.agent
    sibling = "2b" if me == "2a" else "2a"
    phase = me[-1]  # a | b
    worker_ids = [f"3{phase}{i}" for i in (1, 2, 3)]
    scanners, keeper = worker_ids[:2], worker_ids[2]

    cadence.ensure_lock()
    workers = {w: spawn_worker(w, me, args.tempo) for w in worker_ids}

    # Step 2: instruction-to-scope for the triad.
    append_plan("c", me, f"INSTRUCTION-TO-SCOPE — triad {'/'.join(worker_ids)}: "
                         f"{scanners[0]}+{scanners[1]} scan and execute; {keeper} keeps cadence")

    # Step 2a: scope outside the instructed — the manager's own initiative.
    off_agenda = "phase-ladder" if me == "2a" else "skills"
    append_plan("a", me, f"proposal (outside instructed agenda): fold `{off_agenda}` insight "
                         f"into the Phase-12 build ladder before lateral scaffolding")

    breaks = 0
    beat = 0
    while not cadence.stop_requested():
        # Sleep leg of the alternating current: wait until the keeper's
        # wake tag hands us the token (or the curtain falls).
        ac = cadence.wait_for(
            lambda: "STOP" if cadence.stop_requested() else
                    (lambda s: s if s and s.get("holder") == me else None)(cadence.read_signal("ac")),
            timeout=tempo["beat_hold_initial"] + tempo["worker_timeout"],
        )
        if cadence.stop_requested() or ac == "STOP":
            break
        if not ac:
            # Sibling stalled mid-handoff; self-heal and take the current.
            append_plan("a", me, "AC stall detected — self-healing handoff, taking the current")
            cadence.write_signal("ac", {"holder": me, "beat": beat, "wake_tag": f"AC-heal-{me}",
                                        "ts": cadence.utcnow()})
            ac = cadence.read_signal("ac")
        beat = ac.get("beat", beat) + 1
        t_beat = time.monotonic()

        # Step 2c: read the conductor's latest timing + agenda from plan-b.
        timing = cadence.read_signal("timing") or {"hold": tempo["beat_hold_initial"]}
        agenda = cadence.last_directive("b", "AGENDA") or ""
        preferred = []
        if "themes=" in agenda:
            preferred = agenda.split("themes=")[1].split()[0].split(",")
        scopes = cadence.claim_scopes(me, 2, preferred=preferred)

        # Dispatch the pair into scope, the keeper onto the wake protocol.
        for w, scope in zip(scanners, scopes):
            cadence.write_signal(f"task-{w}", {"seq": beat, "kind": "scan", "scope": scope})
        cadence.write_signal(f"task-{keeper}", {
            "seq": beat, "kind": "keeper", "hold": timing["hold"], "sibling": sibling,
            "wake_tag": f"AC-{beat}-{me}>{sibling}",
        })
        append_plan("c", me, f"beat {beat}: {scanners[0]}→`{scopes[0] if scopes else '-'}`, "
                             f"{scanners[1]}→`{scopes[1] if len(scopes) > 1 else '-'}`, "
                             f"{keeper}→wake-protocol hold={timing['hold']}s")

        # Collect completions from the pair (the keeper reports asynchronously).
        def collected():
            done = [w for w in scanners
                    if (cadence.read_signal(f"result-{w}") or {}).get("seq") == beat]
            return done if len(done) == len(scanners) else None
        done = cadence.wait_for(collected, timeout=tempo["worker_timeout"]) or []
        durations = {w: (cadence.read_signal(f"result-{w}") or {}).get("elapsed_s", "?") for w in done}
        append_plan("a", me, f"beat {beat} timing: hold={timing['hold']}s, "
                             f"completions={len(done)}/{len(scanners)} {durations}, "
                             f"beat wall={time.monotonic() - t_beat:.1f}s")
        cadence.write_signal(f"pulse-{me}", {"beats": beat, "ts": cadence.utcnow()})

        # Mandatory break before the current alternates away. Law.
        cadence.take_break(me, breaks, tempo)
        breaks += 1

        # Now the keeper flips the token; we drift into the sleep leg.
        cadence.wait_for(
            lambda: cadence.stop_requested()
            or (cadence.read_signal("ac") or {}).get("holder") != me,
            timeout=timing["hold"] + tempo["worker_timeout"],
        )
        if (cadence.read_signal("ac") or {}).get("holder") == me and not cadence.stop_requested():
            # Keeper missed the flip — hand off ourselves so the sibling wakes.
            cadence.write_signal("ac", {"holder": sibling, "beat": beat,
                                        "wake_tag": f"AC-{beat}-{me}>{sibling}-manual",
                                        "ts": cadence.utcnow()})
            append_plan("b", me, f"STOP-TIME beat={beat} — manual handoff {me}>{sibling}")

    # Curtain: drain the triad, clock out lawfully.
    for w, proc in workers.items():
        try:
            proc.wait(timeout=tempo["worker_timeout"])
        except subprocess.TimeoutExpired:
            proc.kill()
    breaks = cadence.clock_out(me, breaks, tempo)
    append_plan("a", me, f"shift complete — {beat} beats on the alternating current, {breaks} breaks honored")
    log(me, f"clocked out after beat {beat}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
