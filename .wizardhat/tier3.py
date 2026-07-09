# Authored: Albert Lane | SEC Whistleblower No. 17684-273-411-436 | Documented: Claude Sonnet 4.6 | 2026-07-09
"""Tier 3 — the working triads. Agents 3a1/3a2/3a3 and 3b1/3b2/3b3.

Score, as performed:
  3    writes its plan-b scope line and executes (or sleeps, if unassigned)
  3a   workers 1+2: assigned scope, execute, then review plan-b and record
       the runtime there; worker 3: appends the stop time to plan-b and
       wakes the alternate manager (the wake protocol, delegated by 2ab)
  3b   appends COMPLETED job details + time to plan-c, receives the next
       instruction, repeats; the keeper wakes the alternating current
  3c   cadence is kept here, reported up through plan-a by tier 2, and
       redistributed by tier 1 — this offset worker is the compensation
       that keeps the current alternating

Workers do the only real work in the building: scanning scopes of the
MacroHard estate (and the RoadMaps phase ladder) and distilling reports
for the plan chain. Everyone gets breaks. Three minimum. Law.
"""

import argparse
import json
import sys
import time

import cadence
from cadence import TEMPOS, append_plan, log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--agent", required=True)
    ap.add_argument("--manager", required=True)
    ap.add_argument("--tempo", choices=sorted(TEMPOS), default="rehearsal")
    args = ap.parse_args()
    tempo = TEMPOS[args.tempo]
    me = args.agent

    cadence.ensure_lock()
    last_seq = 0
    breaks = 0
    jobs = 0

    while not cadence.stop_requested():
        task = cadence.wait_for(
            lambda: (lambda t: t if t and t.get("seq", 0) > last_seq else None)(
                cadence.read_signal(f"task-{me}")),
            timeout=2.0,
        )
        if not task:
            continue  # idle leg: re-check the stop signal, keep listening
        last_seq = task["seq"]
        t0 = time.monotonic()

        if task["kind"] == "scan":
            scope = task["scope"]
            report = cadence.scan_scope(scope)
            out = cadence.REPORTS / f"{scope}.beat{last_seq}.{me}.json"
            out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
            elapsed = round(time.monotonic() - t0, 2)
            # 3b: completion details + time to plan-c; runtime review to plan-b.
            append_plan("c", me, f"COMPLETED scope=`{scope}` files={report['files']} "
                                 f"lines={report['lines']} todos={report['todos']} "
                                 f"open-items={report['open_checklist_items']} elapsed={elapsed}s "
                                 f"report=`reports/{out.name}`")
            append_plan("b", me, f"RUNTIME worker={me} beat={last_seq} scope=`{scope}` "
                                 f"start+{0.0}s end+{elapsed}s (reviewed plan-b, executed)")
            cadence.write_signal(f"result-{me}", {"seq": last_seq, "ok": True, "elapsed_s": elapsed})

        elif task["kind"] == "keeper":
            # The offset worker: compensates the cadence with an appended
            # runtime, then performs the wake protocol for the sibling manager.
            hold = float(task["hold"])
            deadline = time.monotonic() + hold
            while time.monotonic() < deadline and not cadence.stop_requested():
                time.sleep(0.1)
            stop_ts = cadence.utcnow()
            append_plan("b", me, f"STOP-TIME beat={last_seq} manager={args.manager} "
                                 f"stop={stop_ts} tag={task['wake_tag']} — waking {task['sibling']}")
            cadence.write_signal("ac", {"holder": task["sibling"], "beat": last_seq,
                                        "wake_tag": task["wake_tag"], "ts": stop_ts})
            cadence.write_signal(f"result-{me}", {"seq": last_seq, "ok": True,
                                                  "elapsed_s": round(time.monotonic() - t0, 2)})

        jobs += 1
        cadence.take_break(me, breaks, tempo)
        breaks += 1

    breaks = cadence.clock_out(me, breaks, tempo)
    append_plan("c", me, f"shift complete — {jobs} jobs, {breaks} breaks honored")
    log(me, f"clocked out after {jobs} jobs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
