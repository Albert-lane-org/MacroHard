"""Tier 1 — the wizard. Agent 1. The conductor who never sleeps.

Score, as performed:
  1   writes plan-b instruction-to-scope, raises two Tier 2 managers
  1a  writes plan-b agenda outside the current plan-c scope
  1b  receives tier-2 pulses, reads plan-b, sets a timing-delayed agenda
      back to plan-b, appends findings to plan-a
  1c  reads timing from plan-a appends, adjusts the beat (starts slow,
      ramps up), writes timing + task to plan-b; still not sleeping
  curtain: requests stop, drains the tiers, writes the coalescence report

The conductor does not scan and does not sleep. It plans, listens, and
keeps time. Breaks are taken standing up (mandatory, three minimum).
"""

import argparse
import subprocess
import sys
import time

import cadence
from cadence import WIZARDHAT, TEMPOS, append_plan, log


def spawn_manager(agent, tempo_name):
    return subprocess.Popen(
        [sys.executable, str(WIZARDHAT / "tier2.py"), "--agent", agent, "--tempo", tempo_name],
        cwd=str(WIZARDHAT),
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tempo", choices=sorted(TEMPOS), default="rehearsal")
    args = ap.parse_args()
    tempo = TEMPOS[args.tempo]
    me = "wizard-1"

    cadence.ensure_lock()
    # Clear the previous performance's runtime signals; plans persist (append-only).
    for f in cadence.SIGNALS.glob("*.json"):
        f.unlink()

    t_start = time.monotonic()
    breaks = 0
    themes = list(cadence.SCOPES)
    completions_baseline = cadence.read_plan("c").count("COMPLETED scope=")

    append_plan("a", me, f"curtain up — tempo `{args.tempo}`, cycles={tempo['cycles']}, "
                         f"hold {tempo['beat_hold_initial']}s → {tempo['beat_hold_min']}s (ramp {tempo['ramp']})")

    # Step 1: instruction-to-scope, then raise the middle tier.
    append_plan("b", me, f"INSTRUCTION-TO-SCOPE — managers 2a/2b: alternate the current, "
                         f"triads scan two fresh scopes per beat, keepers hold the wake protocol. "
                         f"Theme order: {', '.join(themes)}")
    cadence.write_signal("ac", {"holder": "2a", "beat": 0, "wake_tag": "AC-0-seed", "ts": cadence.utcnow()})
    managers = {a: spawn_manager(a, args.tempo) for a in ("2a", "2b")}
    log(me, "two managers raised; six workers coalescing beneath them")

    hold = tempo["beat_hold_initial"]
    for cycle in range(tempo["cycles"]):
        if time.monotonic() - t_start > tempo["wall_cap"]:
            append_plan("a", me, "watchdog: wall cap reached — early curtain")
            break

        # Steps 1a/1c: agenda outside the scopes already burned into plan-c,
        # timing set from the ramp. Tier 2 reads AGENDA lines from plan-b.
        used = (cadence.read_signal("scopes-used") or {}).get("used", [])
        fresh = [t for t in themes if t not in used] or themes
        append_plan("b", me, f"AGENDA cycle={cycle} hold={hold:.1f}s themes={','.join(fresh[:4])} "
                             f"(outside current plan-c scope)")
        cadence.write_signal("timing", {"cycle": cycle, "hold": round(hold, 2), "ts": cadence.utcnow()})

        # Step 1b: listen for the middle tier's pulse — the conductor's ear.
        # The AC beat counter is global, so the loudest pulse IS the beat.
        expected = cycle + 1
        def pulse_beat():
            top = max((cadence.read_signal(f"pulse-{a}") or {}).get("beats", 0) for a in managers)
            return top if top >= expected else 0
        got = cadence.wait_for(pulse_beat, timeout=hold + tempo["worker_timeout"])
        stop_line = cadence.last_directive("b", "STOP-TIME") or "no stop-time yet"
        append_plan("a", me, f"cycle {cycle}: pulses={got or 'timeout'} — last handoff: {stop_line.split('—')[-1].strip()}")

        # Step 1c: read the timing the tiers reported into plan-a, adjust.
        hold = max(tempo["beat_hold_min"], hold * tempo["ramp"])
        append_plan("a", me, f"timing adjusted → next hold {hold:.1f}s (ramping up; tier 1 not sleeping)")

        # The law is the law, even on the podium.
        if breaks < cadence.MIN_BREAKS and cycle >= 1:
            cadence.take_break(me, breaks, tempo)
            breaks += 1

    # Curtain call.
    cadence.request_stop("score complete — cadence captured")
    append_plan("b", me, "STOP — full stop for all tiers; clock out through the breakroom")
    for agent, proc in managers.items():
        try:
            proc.wait(timeout=tempo["worker_timeout"])
        except subprocess.TimeoutExpired:
            proc.kill()
            append_plan("a", me, f"manager {agent} overslept the curtain — reclaimed")
    breaks = cadence.clock_out(me, breaks, tempo)

    # Coalescence report: the chain reported up; the wizard writes it down.
    completions = cadence.read_plan("c").count("COMPLETED scope=") - completions_baseline
    reports = len(list(cadence.REPORTS.glob("*.json")))
    elapsed = time.monotonic() - t_start
    append_plan("a", me, f"COALESCENCE — {completions} completions, {reports} scan reports, "
                         f"{elapsed:.1f}s wall, breaks honored across all tiers. "
                         f"Cadence is captured; lateral scaffolding can inherit this score.")
    log(me, f"performance complete: {completions} completions, {reports} reports, {elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
