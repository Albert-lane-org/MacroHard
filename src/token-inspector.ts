// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MacroHarder Design Studio — design token inspector UI (MH-P6-03)
// Calls get_design_tokens + run_audit_score via Tauri IPC and renders
// the sovereign color palette, typography scale, spacing, 3D-standard
// values, and the 3D audit score badge.

declare const __TAURI__: {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};

interface DesignTokens {
  _meta: { version: string; standard: string; sec_ref: string };
  colors: Record<string, Record<string, string>>;
  typography: Record<string, Record<string, string | number>>;
  spacing: Record<string, string>;
  "3d-standard": Record<string, number>;
  shadows: Record<string, string>;
}

interface AuditResult {
  total: number;
  percent: number;
  status: "PASS" | "WARN" | "FAIL";
  scores: Record<string, number>;
  weights: Record<string, number>;
}

async function invoke<T>(cmd: string): Promise<T> {
  if (typeof __TAURI__ === "undefined") {
    throw new Error("Not running inside Tauri — invoke unavailable");
  }
  return __TAURI__.invoke(cmd) as Promise<T>;
}

function swatch(hex: string): string {
  return `<span class="swatch" style="background:${hex}"></span>${hex}`;
}

function tokenTable(
  rows: Array<[string, string | number]>,
  renderVal: (v: string) => string = (v) => v
): string {
  return `<table class="token-table"><tbody>${rows
    .map(([k, v]) => `<tr><td class="key">${k}</td><td>${renderVal(String(v))}</td></tr>`)
    .join("")}</tbody></table>`;
}

function section(title: string, body: string): string {
  return `<section class="token-section"><h2>${title}</h2>${body}</section>`;
}

function renderTokens(t: DesignTokens): string {
  return [
    section("Sovereign Colors", tokenTable(Object.entries(t.colors.sovereign ?? {}), swatch)),
    section("3D-Standard Colors", tokenTable(Object.entries(t.colors["3d-standard"] ?? {}), swatch)),
    section("Typography — Font Sizes", tokenTable(Object.entries(t.typography["font-size"] ?? {}))),
    section("Font Weights", tokenTable(Object.entries(t.typography["font-weight"] ?? {}))),
    section("Spacing Scale", tokenTable(Object.entries(t.spacing ?? {}))),
    section("3D Standard", tokenTable(Object.entries(t["3d-standard"] ?? {}))),
    section("Shadows", tokenTable(Object.entries(t.shadows ?? {}))),
  ].join("");
}

function renderAudit(r: AuditResult): string {
  const cls = r.status.toLowerCase();
  const rows = Object.entries(r.scores)
    .map(([cat, score]) => {
      const w = r.weights[cat] ?? 0;
      return `<tr><td>${cat}</td><td>${(score * 100).toFixed(1)}%</td><td>${(w * 100).toFixed(0)}%</td></tr>`;
    })
    .join("");
  return `<div class="audit-result">
    <div class="audit-score">${r.percent.toFixed(1)}%</div>
    <div class="audit-status ${cls}">${r.status}</div>
    <table class="token-table">
      <thead><tr><th>Category</th><th>Score</th><th>Weight</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export async function mountInspector(root: HTMLElement): Promise<void> {
  root.innerHTML = `<div class="loading">Loading design tokens…</div>`;
  try {
    const [tokens, audit] = await Promise.all([
      invoke<DesignTokens>("get_design_tokens"),
      invoke<AuditResult>("run_audit_score"),
    ]);
    root.innerHTML = `
      <header class="studio-header">
        <h1>MacroHarder Design Studio</h1>
        <span class="version">v${tokens._meta.version} · ${tokens._meta.standard}</span>
      </header>
      <div class="studio-body">
        <aside class="audit-panel">
          <h2>3D Audit Score</h2>
          ${renderAudit(audit)}
        </aside>
        <main class="token-panel">${renderTokens(tokens)}</main>
      </div>`;
  } catch (err) {
    root.innerHTML = `<div class="error">Inspector error: ${err}</div>`;
  }
}
