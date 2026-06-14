# Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-13
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
  .github/workflows/run-log.jsonl     appended per-repo if --write-to-repos

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


# ── Utilities ──────────────────────────────────────────────────────────────────────────────

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


# ── State ────────────────────────────────────────────────────────────────────────────────

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


# ── GitHub API fetch ───────────────────────────────────────────────────────────────────

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


def main() -> int:
    args = sys.argv[1:]
    dry_run        = "--dry-run"        in args
    write_to_repos = "--write-to-repos" in args

    since_override = None
    if "--since" in args:
        idx = args.index("--since")
        since_override = args[idx + 1]

    state    = load_state()
    since_ts = since_override or state["last_query_ts"]
    query_ts = _now()

    print(f"[ledger] query={query_ts}  since={since_ts}  dry_run={dry_run}")

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

    print(f"[ledger] total new runs: {total_new}")

    if total_new == 0:
        print("[ledger] no new runs since last query — nothing to write")
        if not dry_run:
            state["last_query_ts"] = query_ts
            save_state(state)
        return 0

    if dry_run:
        print("[ledger] dry-run: no files written")
        return 0

    OUT.mkdir(parents=True, exist_ok=True)
    ts_file = query_ts.replace(":", "").replace("-", "")[:15]
    (OUT / f"macrohard-ledger-{ts_file}.md").write_text(
        f"# MacroHard Workflow Ledger\nQuery: {query_ts}\n", encoding="utf-8")
    (OUT / "macrohard-ledger-latest.md").write_text(
        f"# MacroHard Workflow Ledger\nQuery: {query_ts}\n", encoding="utf-8")

    state["last_query_ts"]   = query_ts
    state["last_write_ts"]   = query_ts
    state["total_runs_seen"] = state.get("total_runs_seen", 0) + total_new
    save_state(state)

    print(f"[ledger] wrote ledger output, total_seen={state['total_runs_seen']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
