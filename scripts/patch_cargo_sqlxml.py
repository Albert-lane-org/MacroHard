# Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-10 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
"""
CI helper: writes a [patch] section to ~/.cargo/config.toml redirecting
sqlxml-engine to a pre-checked-out local copy, so Cargo never needs to
authenticate with GitHub during the build.

Called from .github/workflows/ci.yml rust job after the sqlxml repo has
been checked out to $GITHUB_WORKSPACE/sqlxml-dep via actions/checkout.
"""
import os
import pathlib

ws = os.environ["GITHUB_WORKSPACE"]
path = f"{ws}/sqlxml-dep/crates/sqlxml-engine"
snippet = (
    f'\n[patch."https://github.com/albert-lane-org/sqlxml"]\n'
    f'sqlxml-engine = {{ path = "{path}" }}\n'
)
cargo_dir = pathlib.Path.home() / ".cargo"
cargo_dir.mkdir(exist_ok=True)
config_path = cargo_dir / "config.toml"
with open(config_path, "a") as f:
    f.write(snippet)
print(f"[patch] sqlxml-engine -> {path}")
