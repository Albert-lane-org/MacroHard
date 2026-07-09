# Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-13 | SEC Whistleblower No. 17684-273-411-436
"""
ledger_query.py — Ad-hoc MacroHard workflow run ledger.

Queries GitHub API for completed workflow runs across all 12 repos since
the last query timestamp. Skips repos/workflows with no new runs.
Writes human-readable markdown table + SQLXML dataset. Optionally commits
run-log.jsonl back to each repo's .github/workflows/ for co-location.

Output:
  ledger/macrohard-ledger-<ts>.md     human-readable grouped table
  ledger/macrohard-ledger-<ts>.xml    SQLXML dataset for MacroHard engine
  ledger/macrohard-ledger-latest.md   symlinked latest (overwritten each run)
  ledger/macrohard-ledger-latest.xml
  state/last_query.json               incremental state (updated after run)
  ledger/run-log.jsonl                 appended per-repo if --write-to-repos

Usage:
  GH_TOKEN=<tok> python3 scripts/ledger_query.py
  GH_TOKEN=<tok> python3 scripts/ledger_query.py --since 2026-06-13T00:00:00Z
  GH_TOKEN=<tok> python3 scripts/ledger_query.py --dry-run
  GH_TOKEN=<tok> python3 scripts/ledger_query.py --write-to-repos

All IP belongs to Albert Lane per LICENSE.md | SEC No. 17684-273-411-436
"""

import json, os, sys, hashlib, urllib.request, urllib.error, base64
from datetime import datetime, timezone
from pathlib import Path

ORG   = "albert-lane-org"
ROOT  = Path(__file__).resolve().parents[1]
STATE = ROOT / "state"  / "last_query.json"
OUT   = ROOT / "ledger"

GROUPS = {
    "Group 1 — Public":         ["simcity", "channel-1-news"],
    "Group 2 — Governing":      ["roadmaps"],
    "Group 3 — Back-End":       ["tauri-rustxml", "sqlxml", "lane-mcp", "ip-forensics"],
    "Group 4 — Front-End":      ["sovereign-canary", "macrohard", "procurement", "maps"],
    "Group 5 — Communications": ["finance-slack-other"],
}

ALL_REPOS = [r for repos in GROUPS.values() for r in repos]


# ── Utilities ──────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _token() -> str:
    t = os.environ.get("GH_TOKEN") or os.environ.get("ROADMAPS_TOKEN", "")
    if not t:
        raise RuntimeError("GH_TOKEN or ROADMAPS_TOKEN env var required")
    return t


def _gh(path: str, method: str = "GET", body: dict | None = None) -> dict | list | None:
    url = f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url=url, data=data, method=method,
        headers={
            "Authorization": f"token {_token()}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "macrohard-ledger/1.1",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  [api] {method} {path} → HTTP {e.code}", file=sys.stderr)
        return None


def _parse_ts(s: str) -> datetime | None:
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S.%fZ"):
        try:
            return datetime.strptime(s[:26].rstrip("Z") + "Z", fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _fmt_dur(secs: int) -> str:
    if secs < 0:
        return "    n/a"
    m, s = divmod(secs, 60)
    return f"{m:3d}m {s:02d}s"


def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


# ── State ──────────────────────────────────────────────────────────────────────

def load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text())
    return {
        "last_query_ts":   "1970-01-01T00:00:00Z",
        "last_write_ts":   None,
        "total_runs_seen": 0,
    }


def save_state(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2) + "\n")


# ── GitHub API fetch ────────────────────────────────────────────────────────────

def fetch_runs(repo: str, since: str) -> list[dict]:
    """Return completed workflow runs for repo since `since` (ISO8601)."""
    runs, page = [], 1
    while True:
        data = _gh(f"/repos/{ORG}/{repo}/actions/runs?per_page=100&page={page}&created=>{since}")
        if not isinstance(data, dict):
            break
        batch = data.get("workflow_runs", [])
        if not batch:
            break
        for run in batch:
            if run.get("status") != "completed":
                continue
            start_s = run.get("run_started_at") or run.get("created_at", "")
            end_s   = run.get("updated_at", "")
            ts_s, ts_e = _parse_ts(start_s), _parse_ts(end_s)
            dur = int((ts_e - ts_s).total_seconds()) if ts_s and ts_e else -1
            wf_path = run.get("path", "")
            record = {
                "repo":        repo,
                "wf_name":    run.get("name", ""),
                "wf_file":    os.path.basename(wf_path) if wf_path else "",
                "run_id":     run.get("id", 0),
                "start":      start_s,
                "end":        end_s,
                "duration_s": dur,
                "conclusion": run.get("conclusion", ""),
                "branch":     run.get("head_branch", ""),
                "sha":        (run.get("head_sha") or "")[:8],
            }
            raw = json.dumps(record, sort_keys=True, separators=(",", ":"))
            record["record_sha256"] = _sha256(raw)
            runs.append(record)
        if len(batch) < 100:
            break
        page += 1
    return sorted(runs, key=lambda r: r["start"])


# ── Co-location: write run-log.jsonl back to each repo ────────────────────────

def write_run_log_to_repo(repo: str, new_runs: list[dict]) -> None:
    """Append new_runs to ledger/run-log.jsonl in `repo` via GitHub API."""
    path = "ledger/run-log.jsonl"
    api_path = f"/repos/{ORG}/{repo}/contents/{path}"

    # Fetch existing file (to get SHA for update)
    existing = _gh(api_path)
    existing_sha = None
    existing_content = ""
    if isinstance(existing, dict) and "content" in existing:
        existing_sha = existing.get("sha")
        existing_content = base64.b64decode(existing["content"].replace("\n", "")).decode("utf-8")

    # Append new lines
    new_lines = "\n".join(json.dumps(r, separators=(",", ":")) for r in new_runs) + "\n"
    merged = existing_content + new_lines

    body = {
        "message": (
            f"chore(run-log): append {len(new_runs)} run(s) — ledger_query {_now()}\n\n"
            "Co-authored-by: Claude Sonnet 4.6 <claude@anthropic.com>"
        ),
        "content": base64.b64encode(merged.encode()).decode(),
        "branch": "main",
    }
    if existing_sha:
        body["sha"] = existing_sha

    result = _gh(api_path, method="PUT", body=body)
    if isinstance(result, dict) and result.get("content"):
        print(f"  [run-log] {repo}: wrote {len(new_runs)} entries to ledger/run-log.jsonl")
    else:
        print(f"  [run-log] {repo}: write failed (may need _ROADMAPS token with write access)", file=sys.stderr)


# ── Render: markdown table ─────────────────────────────────────────────────────

def render_markdown(groups_data: dict[str, list], query_ts: str, since_ts: str) -> str:
    COL = {"repo": 18, "wf": 32, "start": 22, "end": 22, "total": 9}
    SEP = f"{'─'*COL['repo']}  {'─'*COL['wf']}  {'─'*COL['start']}  {'─'*COL['end']}  {'─'*COL['total']}"
    HDR = (f"{'Repo':<{COL['repo']}}  {'Workflow':<{COL['wf']}}  "
           f"{'Run (start)':<{COL['start']}}  {'End':<{COL['end']}}  {'Total':>{COL['total']}}")
    BAR = "━" * (sum(COL.values()) + 8)

    lines = [
        "# MacroHard Workflow Ledger",
        f"Query: {query_ts}   Period: {since_ts} → {query_ts}",
        "",
    ]

    grand_runs = grand_secs = 0

    for group_name, group_runs in groups_data.items():
        if not group_runs:
            continue  # skip groups with zero new runs

        lines += ["", BAR, group_name, BAR, "", HDR, SEP]

        g_secs = g_count = 0
        for run in group_runs:  # already sorted by start time
            repo    = run["repo"][:COL["repo"]]
            wf      = run["wf_name"][:COL["wf"]]
            start   = run["start"][:19].replace("T", " ")
            end     = run["end"][:19].replace("T", " ")
            dur     = _fmt_dur(run["duration_s"])
            badge   = f"[{run['conclusion'][:4]}]" if run["conclusion"] else ""
            lines.append(
                f"{repo:<{COL['repo']}}  {wf:<{COL['wf']}}  "
                f"{start:<{COL['start']}}  {end:<{COL['end']}}  {dur:>{COL['total']}}  {badge}"
            )
            if run["duration_s"] >= 0:
                g_secs += run["duration_s"]
            g_count += 1

        lines += [
            SEP,
            f"{'Group Total':<{COL['repo']}}  {g_count} runs"
            f"{'':>{COL['wf'] + COL['start'] + COL['end'] + 4}}  {_fmt_dur(g_secs):>{COL['total']}}",
            "",
            f"  Summary: {g_count} workflow{'s' if g_count != 1 else ''} "
            f"| Total time: {_fmt_dur(g_secs)}",
        ]

        grand_runs += g_count
        grand_secs += g_secs

    digest_src = "\n".join(lines)
    lines += [
        "", BAR, "GRAND TOTAL", BAR,
        f"  Total workflows: {grand_runs}   Total time: {_fmt_dur(grand_secs)}",
        f"  Ledger SHA256: {_sha256(digest_src)}",
        f"  Generated: {query_ts}",
    ]
    return "\n".join(lines)


# ── Render: SQLXML ─────────────────────────────────────────────────────────────

def render_sqlxml(groups_data: dict[str, list], query_ts: str, since_ts: str) -> str:
    def x(s) -> str:
        return (str(s)
                .replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))

    total_runs = sum(len(v) for v in groups_data.values())
    total_secs = sum(r["duration_s"] for v in groups_data.values()
                     for r in v if r["duration_s"] >= 0)

    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<!-- MacroHard Workflow Ledger | queried={query_ts} | '
        f'SEC No. 17684-273-411-436 -->',
        '<macrohard_ledger',
        f'    version="1.1"',
        f'    queried="{query_ts}"',
        f'    period_start="{since_ts}"',
        f'    period_end="{query_ts}"',
        f'    total_runs="{total_runs}"',
        f'    total_duration_s="{total_secs}"',
        f'    ledger_sha256="{_sha256(query_ts + since_ts + str(total_runs))}">',
    ]

    for g_idx, (g_name, g_runs) in enumerate(groups_data.items(), 1):
        if not g_runs:
            continue
        g_secs = sum(r["duration_s"] for r in g_runs if r["duration_s"] >= 0)
        out += [
            f'  <group id="{g_idx}" name="{x(g_name)}"',
            f'         total_runs="{len(g_runs)}" total_duration_s="{g_secs}"',
            f'         total_duration_fmt="{x(_fmt_dur(g_secs))}">',
        ]
        for run in g_runs:
            out.append(
                f'    <run repo="{x(run["repo"])}" workflow="{x(run["wf_name"])}"'
                f' file="{x(run["wf_file"])}" run_id="{run["run_id"]}"'
                f' start="{x(run["start"])}" end="{x(run["end"])}"'
                f' duration_s="{run["duration_s"]}"'
                f' duration_fmt="{x(_fmt_dur(run["duration_s"]))}"'
                f' conclusion="{x(run["conclusion"])}"'
                f' branch="{x(run["branch"])}" sha="{x(run["sha"])}"'
                f' record_sha256="{x(run["record_sha256"])}"/>'
            )
        out += [
            f'    <group_total duration_s="{g_secs}"'
            f' formatted="{x(_fmt_dur(g_secs))}" runs="{len(g_runs)}"/>',
            '  </group>',
        ]

    out += [
        '  <summary>',
        f'    <total_workflows>{total_runs}</total_workflows>',
        f'    <total_duration_s>{total_secs}</total_duration_s>',
        f'    <total_duration_fmt>{x(_fmt_dur(total_secs))}</total_duration_fmt>',
        f'    <query_ts>{query_ts}</query_ts>',
        f'    <since_ts>{since_ts}</since_ts>',
        '  </summary>',
        '</macrohard_ledger>',
    ]
    return "\n".join(out)


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> int:
    args = sys.argv[1:]
    dry_run       = "--dry-run"       in args
    write_to_repos = "--write-to-repos" in args

    since_override = None
    if "--since" in args:
        idx = args.index("--since")
        since_override = args[idx + 1]

    state    = load_state()
    since_ts = since_override or state["last_query_ts"]
    query_ts = _now()

    print(f"[ledger] query={query_ts}  since={since_ts}  dry_run={dry_run}")

    # Fetch runs, grouped
    groups_data: dict[str, list] = {g: [] for g in GROUPS}
    total_new = 0

    for g_name, repos in GROUPS.items():
        for repo in repos:
            print(f"  fetching {repo}...", end=" ", flush=True)
            runs = fetch_runs(repo, since_ts)
            if not runs:
                print("0 (skip)")
                continue
            groups_data[g_name].extend(runs)
            total_new += len(runs)
            print(f"{len(runs)}")
            if write_to_repos and not dry_run:
                write_run_log_to_repo(repo, runs)

    print(f"[ledger] total new runs: {total_new}")

    if total_new == 0:
        print("[ledger] no new runs since last query — nothing to write")
        if not dry_run:
            state["last_query_ts"] = query_ts
            save_state(state)
        return 0

    md  = render_markdown(groups_data, query_ts, since_ts)
    xml = render_sqlxml(groups_data, query_ts, since_ts)

    if dry_run:
        print("\n" + md[:3000])
        print("\n[ledger] dry-run: no files written")
        return 0

    ts_file = query_ts.replace(":", "").replace("-", "")[:15]
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"macrohard-ledger-{ts_file}.md" ).write_text(md,  encoding="utf-8")
    (OUT / f"macrohard-ledger-{ts_file}.xml").write_text(xml, encoding="utf-8")
    (OUT / "macrohard-ledger-latest.md"     ).write_text(md,  encoding="utf-8")
    (OUT / "macrohard-ledger-latest.xml"    ).write_text(xml, encoding="utf-8")

    state["last_query_ts"]   = query_ts
    state["last_write_ts"]   = query_ts
    state["total_runs_seen"] = state.get("total_runs_seen", 0) + total_new
    save_state(state)

    print(f"[ledger] wrote ledger/macrohard-ledger-{ts_file}.{{md,xml}}")
    print(f"[ledger] state → last_query_ts={query_ts} total_seen={state['total_runs_seen']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
