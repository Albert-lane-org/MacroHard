// Author: Albert Lane · albertlane.net
// AI Co-Architect: Claude (Anthropic) · claude-sonnet-4-6
// License: Proprietary — see LICENSE-MACROHARD.md
// SEC Whistleblower Reference: No. 17684-273-411-436
import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// ── Fonts ─────────────────────────────────────────────────────────────────────
(() => {
  if (document.getElementById("mh-fonts")) return;
  const l = document.createElement("link");
  l.id = "mh-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
})();

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  // Sheet bg
  bg:        "#09090e",
  bgHdr:     "#0d0f1c",
  bgTitle:   "#0a0b14",
  bgEdit:    "#0e1020",
  border:    "#2a2418",
  borderHdr: "#343020",
  // Amber accent
  accent:    "#f5b800",
  accentHi:  "#ffe040",
  accentLo:  "rgba(245,184,0,.14)",
  // Text — HIGH CONTRAST
  dataFg:    "#e8cc88",   // main cell text — bright warm gold
  hdrFg:     "#d4a840",   // column header names — vivid amber
  rowNumFg:  "#907840",   // row numbers — clearly visible
  rowNumSel: "#ffe040",
  muted:     "#907840",   // hint/status — readable
  colLetter: "#60501c",   // tiny col letters
  selData:   "#fff0a0",
  formulaFg: "#60e898",
  // Rust HUD palette (graph tab)
  rustBg:    "#0e0804",
  rustMid:   "#1a0e06",
  rustBorder:"#5a3018",
  rustAccent:"#e85010",
  rustGlow:  "rgba(232,80,16,.20)",
};

// ── CSV parser ─────────────────────────────────────────────────────────────────
function parseCSV(raw) {
  if (!raw?.trim()) return { headers: [], rows: [] };
  const lines = []; let row = [], cell = "", inQ = false;
  const flush = () => { row.push(cell); cell = ""; };
  const flushRow = () => { flush(); if (row.some(Boolean) || lines.length) lines.push(row); row = []; };
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i], nx = raw[i + 1];
    if (inQ) { ch === '"' && nx === '"' ? (cell += '"', i++) : ch === '"' ? (inQ = false) : (cell += ch); }
    else if (ch === '"') inQ = true;
    else if (ch === ',') flush();
    else if (ch === '\r' && nx === '\n') { flushRow(); i++; }
    else if (ch === '\r' || ch === '\n') flushRow();
    else cell += ch;
  }
  if (cell || row.length) flushRow();
  if (!lines.length) return { headers: [], rows: [] };
  const w = Math.max(...lines.map(l => l.length));
  const pad = l => [...l, ...Array(w - l.length).fill("")];
  return { headers: pad(lines[0]), rows: lines.slice(1).map(pad) };
}

// ── Column letter ─────────────────────────────────────────────────────────────
const colLetter = i => {
  let s = ""; i++;
  while (i > 0) { s = String.fromCharCode(64 + (i % 26 || 26)) + s; i = Math.floor((i - 1) / 26); }
  return s;
};

// ── Formula engine ─────────────────────────────────────────────────────────────
function parseCellAddr(addr) {
  const m = addr.match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  let c = 0;
  for (const ch of m[1].toUpperCase()) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { c: c - 1, r: parseInt(m[2], 10) - 1 };
}

function evalFormula(formula, rows) {
  if (!formula?.startsWith("=")) return formula;
  const expr = formula.slice(1).trim().toUpperCase();
  const getCell = addr => { const p = parseCellAddr(addr); if (!p) return 0; const v = rows[p.r]?.[p.c] ?? ""; return isNaN(parseFloat(v)) ? 0 : parseFloat(v); };
  const getRange = range => {
    const parts = range.includes(":") ? range.split(":") : [range, range];
    const a = parseCellAddr(parts[0]), b = parseCellAddr(parts[1] || parts[0]);
    if (!a || !b) return [];
    const vals = [];
    for (let r = Math.min(a.r,b.r); r <= Math.max(a.r,b.r); r++)
      for (let c2 = Math.min(a.c,b.c); c2 <= Math.max(a.c,b.c); c2++) { const v = rows[r]?.[c2] ?? ""; const n = parseFloat(v); if (!isNaN(n)) vals.push(n); }
    return vals;
  };
  try {
    let e = expr
      .replace(/SUM\(([^)]+)\)/g, (_,rng) => { const v=getRange(rng); return v.length?v.reduce((a,b)=>a+b,0):0; })
      .replace(/AVERAGE\(([^)]+)\)|AVG\(([^)]+)\)/g, (_,r1,r2) => { const v=getRange(r1||r2); return v.length?v.reduce((a,b)=>a+b,0)/v.length:0; })
      .replace(/COUNT\(([^)]+)\)/g, (_,rng) => getRange(rng).length)
      .replace(/MAX\(([^)]+)\)/g, (_,rng) => { const v=getRange(rng); return v.length?Math.max(...v):0; })
      .replace(/MIN\(([^)]+)\)/g, (_,rng) => { const v=getRange(rng); return v.length?Math.min(...v):0; })
      .replace(/ROUND\(([^,)]+),([^)]+)\)/g, (_,n,d) => `Math.round((${n})*Math.pow(10,${d}))/Math.pow(10,${d})`)
      .replace(/ABS\(([^)]+)\)/g, (_,n) => `Math.abs(${n})`)
      .replace(/SQRT\(([^)]+)\)/g, (_,n) => `Math.sqrt(${n})`)
      .replace(/\b([A-Z]+\d+)\b/g, (_,addr) => getCell(addr));
    // eslint-disable-next-line no-new-func
    const result = new Function('"use strict"; return (' + e + ')')();
    if (typeof result === "number") return isFinite(result) ? (Number.isInteger(result) ? result : parseFloat(result.toFixed(6))) : "#DIV/0!";
    return result ?? "";
  } catch { return "#ERR"; }
}

// ── NMG Graph Data ────────────────────────────────────────────────────────────
const NMG_TRUNKS = [
  { name: "Electoral",    nodes: ["DNC / RNC", "Oregon State Comm.", "WashCo Central Comm."],     color: "#38c8ff" },
  { name: "Legislative",  nodes: ["U.S. Congress", "Oregon Legislature", "WashCo Commissioners"],  color: "#30f090" },
  { name: "Executive",    nodes: ["U.S. President", "Governor of Oregon", "State/Fed Agencies"],   color: "#c878ff" },
  { name: "Intelligence", nodes: ["ODNI / CIA / NSA", "FBI / U.S. Marshals", "Oregon State Police"], color: "#00ffe0" },
  { name: "Judicial",     nodes: ["SCOTUS", "9th Circuit Court", "WashCo Circuit Court"],          color: "#e8ddb0" },
  { name: "Extractors",   nodes: ["U.S. Chamber / PACs", "ALEC / NCSL Matrix", "Oregon Biz & Industry"], color: "#ffcc00" },
];
const NMG_INTERCEPTS = [
  ["U.S. Chamber / PACs",  "U.S. Congress"],
  ["DNC / RNC",            "U.S. President"],
  ["ODNI / CIA / NSA",     "FBI / U.S. Marshals"],
  ["FBI / U.S. Marshals",  "SCOTUS"],
  ["Oregon State Comm.",   "Oregon Legislature"],
  ["ALEC / NCSL Matrix",   "Oregon Legislature"],
  ["Oregon State Police",  "WashCo Circuit Court"],
];

// ── Albert Lane Schematic · Jurisdictional Hierarchy Data ─────────────────────
// Source: adJason Python Schematic — Operations Metric Headcount to Jurisdictional Marketing Reach
const AL_JURISDICTIONS = [
  { tier: "Tier 1", label: "Global HQ", apex: "United Kingdom",          lateral: "None",                      headcount: "2,998 total",         reach: "479.00m",   revA: "£1.54/user", revAB: "£1.54/user", color: "#ffcc00" },
  { tier: "Tier 2", label: "Primary Geo",apex: "UK (incl. RoW)",         lateral: "United States",             headcount: "Apex 2,276 · Lat 722", reach: "306.56m / 172.44m", revA: "£1.54/user", revAB: "£0.99/user", color: "#38c8ff" },
  { tier: "Tier 3", label: "Continental", apex: "North America",          lateral: "Europe, APAC",              headcount: "722 (US proxy)",       reach: "172.44m",   revA: "£1.54/user", revAB: "N/A",       color: "#30f090" },
  { tier: "Tier 4", label: "European",   apex: "England & Wales",         lateral: "France, Czech Republic",   headcount: "~2,276 apex",          reach: "~306.56m",  revA: "£1.54/user", revAB: "N/A",       color: "#c878ff" },
  { tier: "Tier 5", label: "N.American", apex: "United States",           lateral: "Canada",                   headcount: "722 apex",             reach: "~172.44m",  revA: "£1.54/user", revAB: "N/A",       color: "#00ffe0" },
  { tier: "Tier 6", label: "APAC",       apex: "Australia",               lateral: "India, Philippines",        headcount: "N/A",                  reach: "N/A",       revA: "N/A",        revAB: "N/A",       color: "#e8ddb0" },
];

// ── Fraud Detection Logic Scoring Weights ──────────────────────────────────────
const FRAUD_WEIGHTS = [
  { id: "W1", label: "Jurisdiction Delta",    desc: "Reach(A) − Reach(B) anomaly vector",    default: 0.35, color: "#f5b800" },
  { id: "W2", label: "Headcount Variance",    desc: "Employee ratio to declared jurisdiction", default: 0.28, color: "#e85010" },
  { id: "W3", label: "Revenue/Reach Ratio",   desc: "Rev-to-user divergence across tiers",    default: 0.22, color: "#30f090" },
  { id: "W4", label: "Lateral Registration",  desc: "Lateral biz reg. vs apex mismatch",      default: 0.15, color: "#38c8ff" },
];

// ── Macroeconomic Anomaly Targets ─────────────────────────────────────────────
const MACRO_TARGETS = [
  { id: "M1", label: "GDP Displacement",     threshold: ">12% gap", active: true  },
  { id: "M2", label: "LFP Suppression",      threshold: "<62.0%",   active: true  },
  { id: "M3", label: "Debt/GDP Inflection",  threshold: ">100%",    active: false },
  { id: "M4", label: "Inflation Divergence", threshold: ">4.5% σ",  active: true  },
  { id: "M5", label: "Wage/Production Gap",  threshold: ">40pt",    active: true  },
];

// ── Albert Lane SEC Financials Schematic — Two-Era Temporal Matrix ─────────────
const AL_SEC_SCHEMATIC = {
  metadata: {
    name: "Albert Lane SEC Financials Schematic",
    framework: "FY 2026–2030 SEC Strategic Plan",
    core_ratio: "Exchange_Listed_Public_Entities : Total_Market_Entities",
    sec_staff: 4000, sec_divisions: 6, sec_offices: 25, regional_offices: 10,
    edgar_storage_tb: 19,
  },
  market_volumes: {
    equity_markets:    { value: 207,  unit: "trillion USD",  hook: "SEC_MARKET_VOL_EQUITY" },
    fixed_income:      { value: 372,  unit: "trillion USD",  hook: "SEC_MARKET_VOL_FIXED_INCOME" },
    etf_options:       { value: 9.3,  unit: "trillion USD",  hook: "SEC_MARKET_VOL_OPTIONS" },
    security_swaps:    { value: null, unit: "trillions USD", hook: "SEC_MARKET_VOL_SWAPS" },
    credit_derivatives:{ value: 693,  unit: "billion USD",   hook: "SEC_MARKET_VOL_CREDIT_DERIV" },
    market_cap_reviewed:{ value: 71,  unit: "trillion USD",  hook: "SEC_MARKET_VOL_MARKET_CAP" },
  },
  oversight_scope: {
    exchange_listed_public: 4700, total_regulated_entities: 33000,
    ratio: parseFloat((4700/33000).toFixed(4)),
    alt_trading_systems: 111, national_exchanges: 29, credit_rating_agencies: 11,
    clearing_agencies: 7, swap_repositories: 3,
  },
  temporal_eras: [
    {
      era: "Pre-Modern Baseline",
      listed: 4100, total: 28000, ratio: parseFloat((4100/28000).toFixed(4)),
      us_pct: 72, uk_pct: 18, intl_pct: 10,
      filing_us:  { Inc: { apex:2100, lateral:4200, defunct:1100 }, LLC:{ apex:1400, lateral:2900, defunct:400  }, NFP:{ apex:100,  lateral:150,  defunct:50   }, DBA:{ apex:500,  lateral:800,  defunct:900  } },
      filing_uk:  { PLC: { apex:350,  lateral:900,  defunct:200  }, Ltd:{ apex:800,  lateral:2100, defunct:450  }, LLP:{ apex:150,  lateral:400,  defunct:80   }, CIC:{ apex:50,   lateral:90,   defunct:15   } },
      filing_int: { Intl:{ apex:650,  lateral:1200, defunct:300  } },
    },
    {
      era: "Active Strategic Horizon (FY 2026–2030)",
      listed: 4700, total: 33000, ratio: parseFloat((4700/33000).toFixed(4)),
      us_pct: 68, uk_pct: 20, intl_pct: 12,
      filing_us:  { Inc: { apex:2400, lateral:5100, defunct:1400 }, LLC:{ apex:1800, lateral:3800, defunct:650  }, NFP:{ apex:120,  lateral:190,  defunct:40   }, DBA:{ apex:380,  lateral:950,  defunct:1100 } },
      filing_uk:  { PLC: { apex:420,  lateral:1150, defunct:180  }, Ltd:{ apex:950,  lateral:2600, defunct:520  }, LLP:{ apex:190,  lateral:550,  defunct:95   }, CIC:{ apex:70,   lateral:110,  defunct:20   } },
      filing_int: { Intl:{ apex:850,  lateral:1600, defunct:410  } },
    },
  ],
};

// ── Business Flavor Coefficients — Anticipatory Earnings Model ────────────────
// Φ_flavor coefficients: high-velocity public variants scale higher risk ceilings;
// private/local fragments resolve to constrained steady-state friction points.
const FLAVOR_COEFFICIENTS = {
  "Inc":  { phi:1.85, ytd:2.60, label:"US Inc.",      region:"US",  velocity:"high",    color:"#38c8ff", phiIndex:0 },
  "LLC":  { phi:1.20, ytd:1.80, label:"US LLC",        region:"US",  velocity:"medium",  color:"#30f090", phiIndex:1 },
  "NFP":  { phi:0.45, ytd:0.30, label:"Non-Profit",    region:"US",  velocity:"low",     color:"#e8ddb0", phiIndex:2 },
  "DBA":  { phi:0.80, ytd:0.70, label:"DBA / FBA",     region:"US",  velocity:"low",     color:"#907840", phiIndex:3 },
  "PLC":  { phi:1.92, ytd:1.10, label:"UK PLC",        region:"UK",  velocity:"high",    color:"#f5b800", phiIndex:4 },
  "Ltd":  { phi:1.15, ytd:0.90, label:"UK Ltd",        region:"UK",  velocity:"medium",  color:"#c878ff", phiIndex:5 },
  "LLP":  { phi:1.30, ytd:0.75, label:"UK LLP",        region:"UK",  velocity:"medium",  color:"#00ffe0", phiIndex:6 },
  "CIC":  { phi:0.55, ytd:0.25, label:"UK CIC",        region:"UK",  velocity:"low",     color:"#52b788", phiIndex:7 },
  "Intl": { phi:1.10, ytd:0.55, label:"Intl (Unknown)",region:"INT", velocity:"unknown", color:"#e85010", phiIndex:8 },
};

// Expected Y-range per velocity class for conflict detection
const FLAVOR_VELOCITY_RANGES = {
  high:    [1.5, 9.0],
  medium:  [0.5, 4.5],
  low:     [0.0, 2.0],
  unknown: [0.2, 5.0],
};

// ── Anticipatory Earnings Evaluator — E_a(t) = Φ_flavor · Ȳ_YTD · (1 + λ·t) ─
function evaluateAnticipatory(ytdOverride, flavorKey, lambda, t) {
  const fc = FLAVOR_COEFFICIENTS[flavorKey];
  if (!fc) return { status:"NULL_OMISSION", equation:"Eₐ(t) = null", result:null };
  const phi  = fc.phi;
  const yBar = parseFloat((ytdOverride ?? fc.ytd).toFixed(4));
  const ea   = parseFloat((phi * yBar * (1 + lambda * t)).toFixed(4));
  // Conflict detection: does the computed Y land within the velocity class envelope?
  const [lo, hi] = FLAVOR_VELOCITY_RANGES[fc.velocity] || [0, 10];
  const conflict = ea > hi * 1.4 || (fc.velocity === "low" && ea > hi * 1.2);
  const status   = conflict                   ? "FLAVOR_CONFLICT"
    : fc.velocity === "high"                  ? "HIGH_VELOCITY"
    : fc.velocity === "medium"                ? "MEDIUM_FRICTION"
    : fc.velocity === "low"                   ? "LOW_FRICTION_STEADY"
    :                                           "UNKNOWN_CLASSIFICATION";
  return {
    status,
    equation: `Eₐ(t) = ${phi} · ${yBar} · (1 + ${lambda}·${t})`,
    result:   `Eₐ(${t}) = ${ea}`,
    ea, phi, ytd: yBar, lambda, t,
    flavor: fc.label, velocity: fc.velocity, conflict,
    flavorKey,
  };
}
const MATHEMATICAL_REGISTRY = {
  FORMULAS: [
    { id:"ABS",     syntax:"=ABS(number)",          desc:"Absolute value of a number" },
    { id:"AVERAGE", syntax:"=AVERAGE(range)",        desc:"Arithmetic mean of a range" },
    { id:"COUNT",   syntax:"=COUNT(range)",          desc:"Count of numeric entries in range" },
    { id:"MAX",     syntax:"=MAX(range)",            desc:"Maximum value in range" },
    { id:"MIN",     syntax:"=MIN(range)",            desc:"Minimum value in range" },
    { id:"ROUND",   syntax:"=ROUND(number,digits)",  desc:"Round number to n decimal places" },
    { id:"SQRT",    syntax:"=SQRT(number)",          desc:"Square root of a positive number" },
    { id:"SUM",     syntax:"=SUM(range)",            desc:"Sum of all values in range" },
  ],
  EQUATIONS: [
    { branch:"Algebra",      id:"Quadratic Formula",  expr:"x = (−b ± √(b²−4ac)) / 2a",              desc:"Roots of ax²+bx+c=0" },
    { branch:"Algebra",      id:"Binomial Expansion", expr:"(a+b)² = a²+2ab+b²",                      desc:"Square of a binomial" },
    { branch:"Algebra",      id:"Difference Squares", expr:"(a−b)(a+b) = a²−b²",                      desc:"Difference of two squares" },
    { branch:"Calculus",     id:"Power Rule",         expr:"d/dx[xⁿ] = n·xⁿ⁻¹",                      desc:"Derivative of power function" },
    { branch:"Calculus",     id:"Chain Rule",         expr:"dy/dx = (dy/du)·(du/dx)",                  desc:"Derivative of composite function" },
    { branch:"Calculus",     id:"Product Rule",       expr:"d/dx[uv] = u·v' + v·u'",                  desc:"Derivative of product" },
    { branch:"Calculus",     id:"Taylor Series",      expr:"f(x) = Σ f⁽ⁿ⁾(a)/n! · (x−a)ⁿ",          desc:"Function expansion around point a" },
    { branch:"Calculus",     id:"Euler Identity",     expr:"e^(iπ) + 1 = 0",                          desc:"Euler's remarkable identity" },
    { branch:"Statistics",   id:"Bayes Theorem",      expr:"P(A|B) = P(B|A)·P(A) / P(B)",             desc:"Conditional probability update" },
    { branch:"Statistics",   id:"Normal PDF",         expr:"f(x) = e^(−(x−μ)²/2σ²) / (σ√2π)",        desc:"Gaussian probability density" },
    { branch:"Differential", id:"Laplace Transform",  expr:"L{f(t)} = ∫₀^∞ e^(−st)·f(t) dt",         desc:"Transform for ODE solving" },
  ],
  OUTPUTS_SAVED: [],  // live session coordinate captures + word problem outputs
  STATISTICS: [
    { id:"Mean",          expr:"μ = Σxᵢ / n",                         desc:"Population mean" },
    { id:"Variance",      expr:"σ² = Σ(xᵢ−μ)² / n",                  desc:"Population variance" },
    { id:"Std Deviation", expr:"σ = √(Σ(xᵢ−μ)² / n)",               desc:"Standard deviation" },
    { id:"Z-Score",       expr:"z = (x − μ) / σ",                    desc:"Standardized score" },
    { id:"Pearson r",     expr:"r = Σ[(xᵢ−x̄)(yᵢ−ȳ)] / (n·σx·σy)",  desc:"Correlation coefficient" },
    { id:"Sample Var",    expr:"s² = Σ(xᵢ−x̄)² / (n−1)",            desc:"Sample variance (Bessel)" },
    { id:"Covariance",    expr:"Cov(X,Y) = E[(X−μx)(Y−μy)]",         desc:"Joint variability measure" },
    { id:"IQR",           expr:"IQR = Q3 − Q1",                       desc:"Interquartile range" },
  ],
  FRAUD: [
    { id:"Accountability Score", expr:"Aₛ = 100 − (ωᵤ·Ψᵤ + ωg·(H_apex/R_norm))", desc:"Primary fraud audit metric — Albert Lane methodology" },
    { id:"Business Flavor Mapping", expr:"Eₐ(t) = Φ_flavor · Ȳ_YTD · (1 + λ·t)", desc:"Anticipatory Earnings Baseline — AL SEC Schematic · select to activate Flavor Mode", action:"FLAVOR_MODE" },
    { id:"Uniformity Penalty",   expr:"Ψᵤ = 1 if ∀ cross-jurisdictional metrics identical, else 0→1", desc:"Flags copy-pasted operational uniformity" },
    { id:"Ghost Ratio",          expr:"GR = H_apex / R_norm",                      desc:"Headcount vs normalized marketing reach" },
    { id:"Rev-to-Reach (H)",     expr:"RR = Revenue / Jurisdictional_Reach",       desc:"Column H metric per AL schematic" },
    { id:"Reach Delta (F)",      expr:"ΔR = Reach_A − Reach_B",                   desc:"Normalized reach differential — Column F" },
    { id:"Tier Deviation",       expr:"σ_tier = √(Σ(RRᵢ − μ_RR)² / n)",         desc:"Cross-tier revenue uniformity deviation" },
    { id:"N/A Omission Ratio",   expr:"NAR = |N/A cells| / |total cells|",         desc:"Ghost operation indicator — data omission" },
    { id:"Gap Index",            expr:"GI = (Prod_Index − Comp_Index) / Comp_Index × 100", desc:"Wage-production gap percentage" },
  ],
  GEOMETRY_TRIG: [
    { id:"Circle Area",    expr:"A = πr²",                                        desc:"Area of a circle" },
    { id:"Sphere Volume",  expr:"V = (4/3)πr³",                                   desc:"Volume of a sphere" },
    { id:"Pythagorean",    expr:"c² = a² + b²",                                   desc:"Right triangle identity" },
    { id:"Sine Rule",      expr:"a/sin(A) = b/sin(B) = c/sin(C)",                desc:"Law of sines" },
    { id:"Cosine Rule",    expr:"c² = a²+b²−2ab·cos(C)",                         desc:"Law of cosines" },
    { id:"Euler Formula",  expr:"e^(iθ) = cos(θ) + i·sin(θ)",                   desc:"Complex rotation identity" },
    { id:"sin(A+B)",       expr:"sin(A+B) = sin(A)cos(B) + cos(A)sin(B)",        desc:"Sine angle sum identity" },
    { id:"cos(A+B)",       expr:"cos(A+B) = cos(A)cos(B) − sin(A)sin(B)",        desc:"Cosine angle sum identity" },
    { id:"Arc Length",     expr:"s = rθ",                                         desc:"Arc length from central angle (rad)" },
    { id:"Haversine",      expr:"d = 2r·arcsin(√(sin²(Δφ/2)+cos(φ₁)cos(φ₂)sin²(Δλ/2)))", desc:"Great-circle distance formula" },
  ],
  VECTOR_MATHS: [
    { id:"Dot Product",   expr:"a·b = |a||b|cos(θ) = Σaᵢbᵢ",          desc:"Scalar projection",        incomplete:false },
    { id:"Cross Product", expr:"a×b = |a||b|sin(θ)·n̂",                desc:"Orthogonal vector",         incomplete:false },
    { id:"Magnitude",     expr:"|v| = √(x²+y²+z²)",                   desc:"3D vector length",          incomplete:false },
    { id:"Unit Vector",   expr:"v̂ = v / |v|",                          desc:"Normalized direction",      incomplete:false },
    { id:"Projection",    expr:"proj_v u = (u·v / |v|²)·v",           desc:"Vector projection onto v",  incomplete:false },
    { id:"Gradient",      expr:"∇f = (∂f/∂x, ∂f/∂y, ∂f/∂z)",        desc:"Directional derivative",    incomplete:true  },
    { id:"Curl",          expr:"∇×F = det([î ĵ k̂; ∂/∂x ∂/∂y ∂/∂z; Fx Fy Fz])", desc:"Rotation of vector field", incomplete:true },
    { id:"Divergence",    expr:"∇·F = ∂Fx/∂x + ∂Fy/∂y + ∂Fz/∂z",   desc:"Source density of field",   incomplete:true  },
  ],
  _meta: { version:"1.0", incomplete_categories:["VECTOR_MATHS"], externalBridgeRef:"marcohard_3d_outputs_bridge", author:"Albert Lane · albertlane.net" },
};

// ── Accountability Score Evaluator ────────────────────────────────────────────
function evaluateAccountabilityScore(rowData, headers, fraudScores) {
  if (!rowData || !headers?.length) return { status:"NULL_OMISSION", equation:"Aₛ = null", score:null };
  const prodIdx = headers.findIndex(h => /prod/i.test(h));
  const compIdx = headers.findIndex(h => /comp/i.test(h));
  const gapIdx  = headers.findIndex(h => /gap/i.test(h));
  const debtIdx = headers.findIndex(h => /debt/i.test(h));
  const prod = parseFloat(rowData[prodIdx]);
  const comp = parseFloat(rowData[compIdx]);
  if (isNaN(prod) || isNaN(comp)) return { status:"NULL_OMISSION", equation:"Aₛ = null", score:null };
  const wu = fraudScores?.W1 ?? 0.35;
  const wg = fraudScores?.W2 ?? 0.28;
  // Uniformity penalty: detect suspiciously flat ratio (proxy for £1.54/user copy-paste pattern)
  const ratio = prod / Math.max(comp, 1);
  const psi_u = Math.abs(ratio - 1.0) < 0.08 ? 1 : parseFloat(Math.max(0, 1 - Math.abs(ratio - 1.0)).toFixed(2));
  // Ghost ratio: gap (production-comp differential) relative to debt load
  const gap    = parseFloat(rowData[gapIdx])  || 0;
  const debt   = parseFloat(rowData[debtIdx]) || 100;
  const ghost  = parseFloat((gap / Math.max(debt, 1)).toFixed(3));
  const score  = parseFloat(Math.max(0, 100 - (wu * 100 * psi_u + wg * 100 * ghost)).toFixed(1));
  const status = psi_u > 0.8 ? "CONFIRMABLE_RISK" : ghost > 0.4 ? "ELEVATED_ANOMALY" : "NORMAL";
  return {
    status,
    equation: `Aₛ = 100 − (${(wu*100).toFixed(0)}%·${psi_u.toFixed(2)} + ${(wg*100).toFixed(0)}%·${ghost.toFixed(3)})`,
    result:   `Aₛ = ${score}`,
    score,
    psi_u,
    ghost,
  };
}

// ── safeEval3D — formula evaluation for 3D planner ───────────────────────────
function safeEval3D(expr, x, y, z) {
  const clean = expr
    .replace(/[^0-9xyz +\-*/^.()]/gi, '')
    .replace(/\^/g,'**')
    .replace(/\bsin\b/g,'Math.sin')
    .replace(/\bcos\b/g,'Math.cos')
    .replace(/\bexp\b/g,'Math.exp')
    .replace(/\bsqrt\b/g,'Math.sqrt');
  try { return new Function('x','y','z',`"use strict";return(${clean})`)(x,y,z); }
  catch { return NaN; }
}
function parse3DFormula(f) {
  const m = f.match(/^\s*([xyz])\s*=\s*(.+)$/i);
  return m ? { dep: m[1].toLowerCase(), expr: m[2].trim() } : null;
}
function FraudPlannerPane({ scores, setScores, activeTargets, setActiveTargets }) {
  const [expanded, setExpanded] = useState({ params: true, weights: true, targets: true });
  const toggle = k => setExpanded(p => ({ ...p, [k]: !p[k] }));

  const panelSec = (key, label, icon, children) => (
    <div style={{ borderBottom: `1px solid ${C.borderHdr}` }}>
      <div onClick={() => toggle(key)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
          cursor: "pointer", background: expanded[key] ? "rgba(245,184,0,.05)" : "transparent",
          transition: "background .15s" }}>
        <span style={{ fontSize: 9, color: C.accent, fontWeight: 700 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 9, color: C.hdrFg, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 8, color: C.muted, transform: expanded[key] ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
      </div>
      {expanded[key] && (
        <div style={{ padding: "4px 12px 10px" }}>{children}</div>
      )}
    </div>
  );

  return (
    <div style={{
      width: 320, flexShrink: 0, height: "100%",
      background: C.bgTitle,
      borderRight: `1px solid ${C.borderHdr}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
    }}>
      {/* Pane header */}
      <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${C.borderHdr}`,
        background: `linear-gradient(180deg, #0f1020 0%, ${C.bgTitle} 100%)`, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          ⚠ Fraud Planner
        </div>
        <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1.5, marginTop: 2 }}>
          Detection Map &amp; Scoring Engine
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          {["LIVE","TIER·6","v1.0"].map(tag => (
            <span key={tag} style={{ fontSize: 7, color: C.muted, background: "#0e0f1a",
              border: `1px solid ${C.borderHdr}`, borderRadius: 2, padding: "1px 5px", letterSpacing: 1 }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Scrollable sections */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        {/* ── Section 1: Accountability Query Parameters ── */}
        {panelSec("params", "Accountability Query Parameters", "⊕",
          <div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1, marginBottom: 6 }}>
              AL SCHEMATIC · JURISDICTIONAL TIER MAP
            </div>
            {AL_JURISDICTIONS.map((j, i) => (
              <div key={j.tier} style={{
                marginBottom: 5, padding: "5px 8px", borderRadius: 3,
                background: "rgba(255,255,255,.02)", border: `1px solid rgba(255,255,255,.04)`,
                borderLeft: `2px solid ${j.color}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 8, color: j.color, fontWeight: 700, letterSpacing: 1 }}>{j.tier} · {j.label}</span>
                  <span style={{ fontSize: 7, color: C.muted, letterSpacing: .5 }}>{j.reach}</span>
                </div>
                <div style={{ fontSize: 7.5, color: C.dataFg, letterSpacing: .3, lineHeight: 1.6 }}>
                  <span style={{ color: C.hdrFg }}>Apex:</span> {j.apex}
                </div>
                {j.lateral !== "None" && (
                  <div style={{ fontSize: 7.5, color: C.dataFg, letterSpacing: .3, lineHeight: 1.6 }}>
                    <span style={{ color: "#60a880" }}>Lateral:</span> {j.lateral}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 7, color: C.muted }}>HC: <span style={{ color: C.dataFg }}>{j.headcount}</span></span>
                  <span style={{ fontSize: 7, color: C.muted }}>Rev/A: <span style={{ color: C.formulaFg }}>{j.revA}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Section 2: Logic Scoring Weights ── */}
        {panelSec("weights", "Logic Scoring Weights", "⚖",
          <div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1, marginBottom: 6 }}>
              ANOMALY DETECTION COEFFICIENTS
            </div>
            {FRAUD_WEIGHTS.map(w => {
              const val = scores?.[w.id] ?? w.default;
              const pct = Math.round(val * 100);
              return (
                <div key={w.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 8, color: w.color, fontWeight: 700, letterSpacing: .8 }}>{w.id} · {w.label}</span>
                    <span style={{ fontSize: 8, color: C.accent, fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div style={{ fontSize: 7, color: C.muted, marginBottom: 4, letterSpacing: .3 }}>{w.desc}</div>
                  <div style={{ position: "relative", height: 4, background: "#1a1b28", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: w.color,
                      boxShadow: `0 0 6px ${w.color}88`, borderRadius: 2, transition: "width .3s" }}/>
                  </div>
                  <input type="range" min={0} max={100} value={pct}
                    onChange={e => setScores && setScores(p => ({ ...p, [w.id]: parseFloat(e.target.value) / 100 }))}
                    style={{ width: "100%", margin: "4px 0 0", accentColor: w.color, cursor: "pointer", height: 12 }}
                  />
                </div>
              );
            })}
            <div style={{ marginTop: 6, padding: "4px 8px", background: "rgba(245,184,0,.06)",
              border: `1px solid rgba(245,184,0,.15)`, borderRadius: 3 }}>
              <div style={{ fontSize: 7.5, color: C.accent, fontWeight: 700, letterSpacing: 1 }}>
                COMPOSITE SCORE: {Math.round((Object.values(scores || {}).reduce((a,b)=>a+b, FRAUD_WEIGHTS.reduce((s,w)=>s+w.default,0) - Object.keys(scores||{}).length)) * 10) / 10}
              </div>
              <div style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>Based on active weight configuration</div>
            </div>
          </div>
        )}

        {/* ── Section 3: Macroeconomic Anomaly Targets ── */}
        {panelSec("targets", "Macroeconomic Anomaly Targets", "◈",
          <div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1, marginBottom: 6 }}>
              THRESHOLD BREACH INDICATORS
            </div>
            {MACRO_TARGETS.map(t => {
              const isActive = activeTargets ? activeTargets[t.id] !== undefined ? activeTargets[t.id] : t.active : t.active;
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
                  padding: "4px 8px", borderRadius: 3,
                  background: isActive ? "rgba(245,184,0,.04)" : "transparent",
                  border: `1px solid ${isActive ? "rgba(245,184,0,.12)" : C.borderHdr}`,
                  cursor: "pointer", transition: "all .15s" }}
                  onClick={() => setActiveTargets && setActiveTargets(p => ({ ...p, [t.id]: !isActive }))}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%",
                    background: isActive ? C.accent : "#2a2418",
                    border: `1px solid ${isActive ? C.accent : "#3a3020"}`,
                    boxShadow: isActive ? `0 0 5px ${C.accent}88` : "none",
                    flexShrink: 0, transition: "all .15s" }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 8, color: isActive ? C.hdrFg : C.muted, fontWeight: 700, letterSpacing: .5 }}>{t.label}</div>
                    <div style={{ fontSize: 7, color: isActive ? C.rustAccent : "#4a3e20", letterSpacing: .3 }}>Threshold: {t.threshold}</div>
                  </div>
                  <span style={{ fontSize: 7, color: isActive ? C.accent : "#3a2e18", fontWeight: 700 }}>{isActive ? "ON" : "OFF"}</span>
                </div>
              );
            })}
            <div style={{ marginTop: 8, fontSize: 7, color: C.muted, letterSpacing: .5, lineHeight: 1.8,
              borderTop: `1px solid ${C.borderHdr}`, paddingTop: 6 }}>
              <div style={{ color: "#5a9060" }}>SEC Ref: No. 17684-273-411-436</div>
              <div>Albert Lane · albertlane.net</div>
            </div>
          </div>
        )}
      </div>

      {/* Pane footer */}
      <div style={{ borderTop: `1px solid ${C.borderHdr}`, padding: "5px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        background: "#070809" }}>
        <span style={{ fontSize: 7, color: C.muted, letterSpacing: 1 }}>FRAUD PLANNER · OPEN</span>
        <div style={{ display: "flex", gap: 3 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: i === 0 ? C.accent : C.borderHdr }}/>)}
        </div>
      </div>
    </div>
  );
}

// ── Formulas Panel ────────────────────────────────────────────────────────────
const FP_TABS = ["FORMULAS","EQUATIONS","OUTPUTS","STATISTICS","FRAUD","GEO+TRIG","VECTOR"];
const FP_KEYS = ["FORMULAS","EQUATIONS","OUTPUTS_SAVED","STATISTICS","FRAUD","GEOMETRY_TRIG","VECTOR_MATHS"];
const FP_COLORS = { FORMULAS:"#38c8ff", EQUATIONS:"#30f090", OUTPUTS_SAVED:"#c878ff",
  STATISTICS:"#00ffe0", FRAUD:"#f5b800", GEOMETRY_TRIG:"#e8ddb0", VECTOR_MATHS:"#e85010" };

function FormulasPanel({ open, onClose, onInjectFormula, outputsSaved }) {
  const [tab, setTab] = useState("FORMULAS");
  if (!open) return null;
  const key   = FP_KEYS[FP_TABS.indexOf(tab)];
  const color = FP_COLORS[key] || C.accent;
  const rows  = key === "OUTPUTS_SAVED" ? outputsSaved : (MATHEMATICAL_REGISTRY[key] || []);
  const isIncomplete = MATHEMATICAL_REGISTRY._meta.incomplete_categories.includes(key);

  const grouped = key === "EQUATIONS"
    ? Object.entries(rows.reduce((acc, r) => { (acc[r.branch] = acc[r.branch]||[]).push(r); return acc; }, {})).sort((a,b)=>a[0].localeCompare(b[0]))
    : null;

  return (
    <div style={{ position:"fixed", top:86, left:14, zIndex:8000, width:440,
      background:C.bgTitle, border:`1px solid ${C.borderHdr}`,
      borderRadius:5, boxShadow:"0 16px 48px rgba(0,0,0,.92)",
      fontFamily:"'IBM Plex Mono',monospace", display:"flex", flexDirection:"column", maxHeight:"72vh" }}>
      {/* Panel header */}
      <div style={{ padding:"7px 12px 0", borderBottom:`1px solid ${C.borderHdr}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:10, color:C.accent, fontWeight:700, letterSpacing:3, textTransform:"uppercase" }}>▤ Formulas Registry</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16, lineHeight:1 }}>×</button>
        </div>
        {/* Tabs */}
        <div style={{ display:"flex", gap:2, flexWrap:"wrap" }}>
          {FP_TABS.map((t, i) => {
            const k = FP_KEYS[i];
            const col = FP_COLORS[k];
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                background: active ? "rgba(255,255,255,.06)" : "transparent",
                border:`1px solid ${active ? col : C.borderHdr}`,
                color: active ? col : C.muted,
                borderRadius:"3px 3px 0 0", borderBottom: active ? `1px solid ${C.bgTitle}` : undefined,
                padding:"3px 8px", fontSize:8, cursor:"pointer",
                fontFamily:"inherit", letterSpacing:1.2, textTransform:"uppercase",
                marginBottom:-1, transition:"all .12s",
              }}>{t}</button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"10px 12px" }}>
        {isIncomplete && (
          <div style={{ fontSize:8, color:C.rustAccent, background:"rgba(232,80,16,.08)", border:`1px solid rgba(232,80,16,.2)`,
            borderRadius:3, padding:"3px 8px", marginBottom:8, letterSpacing:.8 }}>
            ⚠ INCOMPLETE CATEGORY — vector maths stub · validation bypass active
          </div>
        )}

        {key === "OUTPUTS_SAVED" ? (
          rows.length === 0 ? (
            <div style={{ fontSize:9, color:C.muted, textAlign:"center", padding:"20px 0", letterSpacing:.5 }}>
              No outputs saved yet · Drag spheres in 3D Planner to generate P(x,y,z) coordinates
            </div>
          ) : (
            rows.map((o, i) => (
              <div key={i} style={{ marginBottom:5, padding:"5px 8px", borderRadius:3,
                background:"rgba(200,120,255,.05)", border:`1px solid rgba(200,120,255,.12)`, borderLeft:`2px solid #c878ff` }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:9, color:"#c878ff", fontWeight:700 }}>P{i+1} · {o.label || "Unlabeled"}</span>
                  <span style={{ fontSize:7, color:C.muted }}>{o.time ? new Date(o.time).toLocaleTimeString() : ""}</span>
                </div>
                <div style={{ fontSize:8, color:C.dataFg, marginTop:2 }}>
                  X_relo: <span style={{ color:"#e85010" }}>{o.x?.toFixed(3)}</span> · Y_cap: <span style={{ color:"#30f090" }}>{o.y?.toFixed(3)}</span> · Z_time: <span style={{ color:"#00ffe0" }}>{o.z?.toFixed(3)}</span>
                </div>
                {o.formula && <div style={{ fontSize:7.5, color:C.formulaFg, marginTop:2 }}>ƒ: {o.formula}</div>}
              </div>
            ))
          )
        ) : grouped ? (
          grouped.map(([branch, items]) => (
            <div key={branch} style={{ marginBottom:10 }}>
              <div style={{ fontSize:8, color:color, fontWeight:700, letterSpacing:2, textTransform:"uppercase",
                borderBottom:`1px solid ${C.borderHdr}`, paddingBottom:3, marginBottom:5 }}>{branch}</div>
              {[...items].sort((a,b)=>a.id.localeCompare(b.id)).map(r => (
                <EqRow key={r.id} row={r} color={color} onInject={onInjectFormula} />
              ))}
            </div>
          ))
        ) : (
          [...rows].sort((a,b)=>(a.id||"").localeCompare(b.id||"")).map(r => (
            <EqRow key={r.id} row={r} color={color} onInject={onInjectFormula} />
          ))
        )}
      </div>
    </div>
  );
}

function EqRow({ row, color, onInject }) {
  const [hov, setHov] = useState(false);
  const text = row.syntax || row.expr || "";
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      onClick={() => onInject && onInject(row.syntax || row.expr || "", row)}
      style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"4px 6px",
        borderRadius:3, marginBottom:2, cursor:onInject?"pointer":"default",
        background: hov ? "rgba(255,255,255,.04)" : "transparent",
        border:`1px solid ${hov ? C.borderHdr : "transparent"}`, transition:"all .1s" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", gap:6, alignItems:"baseline" }}>
          <span style={{ fontSize:9, color:color, fontWeight:700, letterSpacing:.5, flexShrink:0 }}>{row.id}</span>
          {row.incomplete && <span style={{ fontSize:7, color:C.rustAccent, letterSpacing:1 }}>STUB</span>}
        </div>
        <div style={{ fontSize:9, color:C.formulaFg, fontFamily:"inherit", letterSpacing:.3, marginTop:1 }}>{text}</div>
        {row.desc && <div style={{ fontSize:7.5, color:C.muted, marginTop:1, letterSpacing:.3 }}>{row.desc}</div>}
      </div>
      {onInject && hov && <span style={{ fontSize:8, color:C.accent, flexShrink:0, marginTop:2 }}>↑ inject</span>}
    </div>
  );
}

// ── MacroHard 3D Planner — React Canvas Component ─────────────────────────────
const PLANNER_INIT_SPHERES = [
  {id:1,x:10,y:1,z:6.25,label:"Base Case",  color:"#f5b800",size:20,isF:false},
  {id:2,x:10,y:4,z:1.56,label:"Accelerated",color:"#30f090",size:20,isF:false},
  {id:3,x:5, y:1,z:3.13,label:"Phase 1",    color:"#38c8ff",size:16,isF:false},
  {id:4,x:10,y:1,z:2.0, label:"Risky ⚠",   color:"#e85010",size:14,isF:false},
];

function MacroHard3DPlanner({ onCoordOutput, fraudScores, flavorMode, flavorParams }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const G_MIN = 0, G_MAX = 10, G_DIV = 10, WS = 38;

  // All mutable canvas state in a single ref — avoids stale-closure animation loop
  const S = useRef({
    spheres: PLANNER_INIT_SPHERES.map(s=>({...s})),
    nid: 5, selId: null,
    showGrid:true, showAxes:true, showLbls:true, showDrop:true, showConn:true,
    showCoords:false, showVPlane:false, vPlaneX:5,
    graphType:"sphere",
    cam:{az:0.55,el:0.40,dist:260,tx:5,ty:2,tz:5},
    axisLabels:{x:"X_relo",y:"Y_cap",z:"Z_time"},
    formulaText:"z = x / (y * 8000)",
    mdown:false, mx:0, my:0, moved:false, orbiting:false, dragging:false, dragId:null,
  });

  // UI-visible state (controls + readout)
  const [ui, setUi] = useState({
    sphereCount:4, graphType:"sphere", selCoords:null, formulaEval:null,
    formulaEdit:false, formulaText:"z = x / (y * 8000)",
    addLabel:"", addColor:"#4EA8DE", addSize:18,
    showGrid:true, showAxes:true, showLbls:true,
  });

  // ── projection ──
  const project = (wx,wy,wz) => {
    const cvs = canvasRef.current; if(!cvs) return{sx:0,sy:0,scale:1,depth:0};
    const {cam} = S.current, dpr = window.devicePixelRatio||1;
    const tx=wx-cam.tx, ty2=wy-cam.ty, tz2=wz-cam.tz;
    const ca=Math.cos(-cam.az), sa=Math.sin(-cam.az);
    const rx=tx*ca+tz2*sa, ry=ty2, rz=-tx*sa+tz2*ca;
    const ce=Math.cos(-cam.el), se=Math.sin(-cam.el);
    const fy=ry*ce-rz*se, fz=ry*se+rz*ce;
    const fov=480, sc=fov/(fov+fz+cam.dist);
    return{sx:cvs.width/dpr/2+rx*sc*WS, sy:cvs.height/dpr/2-fy*sc*WS, scale:sc, depth:fz};
  };

  // ── formula eval ──
  const evalFormulaAtSphere = (sp) => {
    if(!sp) return null;
    const pf = parse3DFormula(S.current.formulaText);
    if(!pf) return "Invalid formula";
    const result = safeEval3D(pf.expr,sp.x,sp.y,sp.z);
    if(isNaN(result)) return "Eval error";
    const actual = pf.dep==="z"?sp.z:pf.dep==="y"?sp.y:sp.x;
    const delta = actual-result, ad = Math.abs(delta);
    const status = ad<0.05?"✓ On surface":delta>0?`▲ +${ad.toFixed(3)} above`:`▼ ${ad.toFixed(3)} below`;
    return { pf, result, actual, status, ok:ad<0.05 };
  };

  useEffect(() => {
    const cvs = canvasRef.current; if(!cvs) return;
    const ctx = cvs.getContext("2d");
    let dpr = window.devicePixelRatio||1;

    const resize = () => {
      const w = cvs.parentElement; if(!w) return;
      dpr = window.devicePixelRatio||1;
      cvs.width = w.clientWidth*dpr;
      cvs.height = w.clientHeight*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── color helpers ──
    const hexRgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
    const lighten=(h,a)=>{const[r,g,b]=hexRgb(h);return`rgb(${Math.min(255,r+a)},${Math.min(255,g+a)},${Math.min(255,b+a)})`};
    const darken=(h,a)=>{const[r,g,b]=hexRgb(h);return`rgb(${Math.max(0,r-a)},${Math.max(0,g-a)},${Math.max(0,b-a)})`};
    const ha=(h,a)=>{const[r,g,b]=hexRgb(h);return`rgba(${r},${g},${b},${a})`};

    // ── draw functions ──
    const drawGroundGrid=()=>{
      if(!S.current.showGrid) return;
      const step=(G_MAX-G_MIN)/G_DIV;
      for(let i=0;i<=G_DIV;i++){
        const v=G_MIN+i*step,edge=(i===0||i===G_DIV);
        ctx.lineWidth=edge?1.2:0.5; ctx.strokeStyle=edge?"#343020":"#1a1a22";
        const a=project(G_MIN,0,v),b=project(G_MAX,0,v);
        ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
        const c=project(v,0,G_MIN),d=project(v,0,G_MAX);
        ctx.beginPath();ctx.moveTo(c.sx,c.sy);ctx.lineTo(d.sx,d.sy);ctx.stroke();
      }
    };

    const drawMainAxes=()=>{
      if(!S.current.showAxes) return;
      const L=G_MAX,O=project(0,0,0),{x:xl,y:yl,z:zl}=S.current.axisLabels;
      const ax=(to,col,lbl,ta,tb,dx,dy)=>{
        ctx.beginPath();ctx.moveTo(O.sx,O.sy);ctx.lineTo(to.sx,to.sy);
        ctx.strokeStyle=col;ctx.lineWidth=1.8;ctx.stroke();
        if(S.current.showLbls){ctx.fillStyle=col;ctx.font="bold 10px IBM Plex Mono,monospace";
          ctx.textAlign=ta;ctx.textBaseline=tb;ctx.fillText(lbl,to.sx+dx,to.sy+dy);}
      };
      ax(project(L,0,0),"#e85010",xl,"left","middle",5,0);
      ax(project(0,L,0),"#30f090",yl,"center","bottom",0,-6);
      ax(project(0,0,L),"#00ffe0",zl,"left","middle",5,0);
      // tick labels
      if(S.current.showLbls){
        ctx.font="8px IBM Plex Mono,monospace";
        for(let i=0;i<=G_DIV;i+=2){
          const v=i*(G_MAX-G_MIN)/G_DIV;
          const xt=project(v,0,0);ctx.fillStyle="rgba(232,80,16,0.5)";ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(v,xt.sx,xt.sy+4);
          const zt=project(0,0,v);ctx.fillStyle="rgba(0,255,224,0.5)";ctx.textAlign="right";ctx.textBaseline="middle";ctx.fillText(v,zt.sx-4,zt.sy);
        }
      }
    };

    const drawConnections=()=>{
      if(!S.current.showConn||S.current.spheres.length<2) return;
      for(let i=0;i<S.current.spheres.length-1;i++){
        const a=S.current.spheres[i],b=S.current.spheres[i+1];
        const pa=project(a.x,a.y,a.z),pb=project(b.x,b.y,b.z);
        ctx.save();ctx.globalAlpha=0.25;ctx.setLineDash([3,5]);
        ctx.beginPath();ctx.moveTo(pa.sx,pa.sy);ctx.lineTo(pb.sx,pb.sy);
        ctx.strokeStyle=C.borderHdr;ctx.lineWidth=0.8;ctx.stroke();
        ctx.setLineDash([]);ctx.restore();
      }
    };

    const drawSpheres=()=>{
      const mapped=S.current.spheres.map(sp=>({sp,p:project(sp.x,sp.y,sp.z)}));
      mapped.sort((a,b)=>b.p.depth-a.p.depth);
      mapped.forEach(({sp,p})=>{
        const r=sp.size*p.scale,isSel=sp.id===S.current.selId;
        // Drop shadow to floor
        if(S.current.showDrop&&sp.y>0.05){
          const gp=project(sp.x,0,sp.z);
          ctx.beginPath();ctx.setLineDash([2,4]);
          ctx.moveTo(p.sx,p.sy+r);ctx.lineTo(gp.sx,gp.sy);
          ctx.strokeStyle=`${sp.color}33`;ctx.lineWidth=0.8;ctx.stroke();ctx.setLineDash([]);
          ctx.beginPath();ctx.arc(gp.sx,gp.sy,3*gp.scale,0,Math.PI*2);
          ctx.fillStyle=`${sp.color}22`;ctx.fill();
        }
        // Selection glow
        if(isSel){
          const gd=ctx.createRadialGradient(p.sx,p.sy,r,p.sx,p.sy,r+14);
          gd.addColorStop(0,sp.color+"44");gd.addColorStop(1,"transparent");
          ctx.beginPath();ctx.arc(p.sx,p.sy,r+14,0,Math.PI*2);ctx.fillStyle=gd;ctx.fill();
          ctx.beginPath();ctx.arc(p.sx,p.sy,r+2,0,Math.PI*2);ctx.strokeStyle="rgba(255,255,255,0.4)";ctx.lineWidth=1.5;ctx.stroke();
        }
        // Sphere body
        const g=ctx.createRadialGradient(p.sx-r*.28,p.sy-r*.28,r*.04,p.sx,p.sy,r);
        g.addColorStop(0,lighten(sp.color,55));g.addColorStop(0.55,sp.color);g.addColorStop(1,darken(sp.color,45));
        ctx.beginPath();ctx.arc(p.sx,p.sy,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
        ctx.strokeStyle=isSel?"rgba(255,255,255,0.7)":`${sp.color}55`;ctx.lineWidth=isSel?1.8:0.9;ctx.stroke();
        // Label
        if(S.current.showLbls&&sp.label){
          ctx.fillStyle=C.dataFg;ctx.font=`bold ${Math.max(7,Math.round(8.5*p.scale))}px IBM Plex Mono,monospace`;
          ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(sp.label,p.sx,p.sy);
        }
        // Formula-plotted ring
        if(sp.isF&&!sp.isFlavor){
          ctx.beginPath();ctx.arc(p.sx,p.sy,r,0,Math.PI*2);
          ctx.strokeStyle="rgba(0,255,224,0.45)";ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.stroke();ctx.setLineDash([]);
        }
        // Flavor conflict alert ring — flags nodes that breach velocity envelope
        if(sp.isFlavor&&sp.flavorFlagged){
          ctx.beginPath();ctx.arc(p.sx,p.sy,r+4,0,Math.PI*2);
          ctx.strokeStyle=C.rustAccent;ctx.lineWidth=2;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
          // Alert crosshair
          ctx.save();ctx.strokeStyle=C.rustAccent;ctx.lineWidth=1;ctx.globalAlpha=0.6;
          const cr=r+8;
          ctx.beginPath();ctx.moveTo(p.sx-cr,p.sy);ctx.lineTo(p.sx+cr,p.sy);ctx.stroke();
          ctx.beginPath();ctx.moveTo(p.sx,p.sy-cr);ctx.lineTo(p.sx,p.sy+cr);ctx.stroke();
          ctx.restore();
        }
        // Flavor velocity tag
        if(sp.isFlavor&&sp.label&&r>4){
          const fc=FLAVOR_COEFFICIENTS[sp.flavorKey];
          if(fc){
            ctx.save();ctx.font=`bold ${Math.max(7,Math.round(7*p.scale))}px IBM Plex Mono,monospace`;
            ctx.fillStyle=sp.flavorFlagged?C.rustAccent:fc.color;ctx.textAlign="center";ctx.textBaseline="top";
            ctx.fillText(fc.label,p.sx,p.sy+r*p.scale+3);ctx.restore();
          }
        }
        // XYZ coords overlay
        if(S.current.showCoords&&r>5){
          const ls=`${sp.z.toFixed(1)}·${sp.y.toFixed(1)}·${sp.x.toFixed(1)}`;
          const fs=Math.max(7,Math.floor(7.5*p.scale));
          ctx.save();ctx.font=`${fs}px IBM Plex Mono,monospace`;ctx.textAlign="left";ctx.textBaseline="top";
          const tw=ctx.measureText(ls).width;
          ctx.fillStyle="rgba(0,0,0,0.6)";ctx.fillRect(p.sx+r*.5,p.sy+r*.3,tw+3,fs+2);
          ctx.fillStyle=ha(sp.color,0.9);ctx.fillText(ls,p.sx+r*.52,p.sy+r*.32);ctx.restore();
        }
      });
    };

    const draw=()=>{
      ctx.clearRect(0,0,cvs.width/dpr,cvs.height/dpr);
      // Background gradient
      const bg=ctx.createRadialGradient(cvs.width/dpr/2,cvs.height/dpr/2,0,cvs.width/dpr/2,cvs.height/dpr/2,cvs.width/dpr*.7);
      bg.addColorStop(0,"#0e0f1c");bg.addColorStop(1,"#080910");
      ctx.fillStyle=bg;ctx.fillRect(0,0,cvs.width/dpr,cvs.height/dpr);
      drawGroundGrid();drawMainAxes();drawConnections();drawSpheres();
    };

    // ── animation loop ──
    const loop=()=>{ draw(); animRef.current=requestAnimationFrame(loop); };
    animRef.current=requestAnimationFrame(loop);

    // ── hit test ──
    const hitTest=(px,py)=>{
      const mapped=S.current.spheres.map(sp=>({sp,p:project(sp.x,sp.y,sp.z)})).sort((a,b)=>a.p.depth-b.p.depth);
      for(const{sp,p}of mapped){if(Math.hypot(px-p.sx,py-p.sy)<=sp.size*p.scale+2)return sp;}
      return null;
    };
    const moveSphere=(id,dx,dy,shift)=>{
      const sp=S.current.spheres.find(s=>s.id===id); if(!sp)return;
      const p=project(sp.x,sp.y,sp.z),ms=1/(p.scale*WS);
      if(shift){sp.y=Math.max(0,sp.y-dy*ms);}
      else{const ca=Math.cos(S.current.cam.az),sa=Math.sin(S.current.cam.az);sp.x+=(dx*ca+dy*sa)*ms;sp.z+=(-dx*sa+dy*ca)*ms;}
    };

    const onDown=e=>{
      cvs.setPointerCapture(e.pointerId);
      const r=cvs.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
      S.current.mdown=true;S.current.mx=px;S.current.my=py;S.current.moved=false;
      const hit=hitTest(px,py);
      if(hit){S.current.dragId=hit.id;S.current.dragging=true;S.current.orbiting=false;
        S.current.selId=hit.id;cvs.style.cursor="grabbing";
        const ev=evalFormulaAtSphere(hit);
        setUi(u=>({...u,selCoords:{x:hit.x,y:hit.y,z:hit.z,label:hit.label},formulaEval:ev,sphereCount:S.current.spheres.length}));
      }else{S.current.dragId=null;S.current.dragging=false;S.current.orbiting=true;cvs.style.cursor="grabbing";}
      e.preventDefault();
    };
    const onMove=e=>{
      const r=cvs.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
      const dx=px-S.current.mx,dy=py-S.current.my;S.current.mx=px;S.current.my=py;
      if(Math.abs(dx)+Math.abs(dy)>1)S.current.moved=true;
      if(!S.current.mdown)return;
      if(S.current.dragging&&S.current.dragId!=null){
        moveSphere(S.current.dragId,dx,dy,e.shiftKey);
        const sp=S.current.spheres.find(s=>s.id===S.current.dragId);
        if(sp){
          const ev=evalFormulaAtSphere(sp);
          setUi(u=>({...u,selCoords:{x:sp.x,y:sp.y,z:sp.z,label:sp.label},formulaEval:ev}));
          // ── bidirectional bridge: pipe to OUTPUTS_SAVED ──
          onCoordOutput&&onCoordOutput({x:sp.x,y:sp.y,z:sp.z,label:sp.label,formula:S.current.formulaText,time:Date.now()});
        }
      }else if(S.current.orbiting){
        S.current.cam.az+=dx*.007;
        S.current.cam.el=Math.max(.04,Math.min(Math.PI/2-.04,S.current.cam.el-dy*.006));
      }
    };
    const onUp=()=>{
      if(S.current.mdown&&!S.current.moved&&!S.current.dragging){S.current.selId=null;setUi(u=>({...u,selCoords:null,formulaEval:null}));}
      S.current.mdown=false;S.current.dragging=false;S.current.orbiting=false;cvs.style.cursor="crosshair";
    };
    const onWheel=e=>{S.current.cam.dist=Math.max(60,Math.min(900,S.current.cam.dist+e.deltaY*.4));e.preventDefault();};

    cvs.addEventListener("pointerdown",onDown);
    window.addEventListener("pointermove",onMove);
    window.addEventListener("pointerup",onUp);
    cvs.addEventListener("wheel",onWheel,{passive:false});

    return ()=>{
      window.removeEventListener("resize",resize);
      cancelAnimationFrame(animRef.current);
      cvs.removeEventListener("pointerdown",onDown);
      window.removeEventListener("pointermove",onMove);
      window.removeEventListener("pointerup",onUp);
      cvs.removeEventListener("wheel",onWheel);
    };
  }, []); // setup once

  const addSphere=()=>{
    const {addLabel,addColor,addSize}=ui;
    const lbl=addLabel.trim()||`S${S.current.nid}`;
    S.current.spheres.push({id:S.current.nid++,x:5,y:2,z:5,label:lbl,color:addColor,size:addSize,isF:false});
    setUi(u=>({...u,sphereCount:S.current.spheres.length,addLabel:""}));
  };

  const plotFormula=()=>{
    S.current.spheres=S.current.spheres.filter(sp=>!sp.isF);
    const pf=parse3DFormula(ui.formulaText);
    if(!pf){return;}
    const vals=[1,3,5,7,9],cols=["#00ffe0","#38c8ff","#c878ff","#f5b800","#30f090"];
    vals.forEach((a,ai)=>vals.forEach(b=>{
      let x,y,z;
      if(pf.dep==="z"){x=a;y=b;z=safeEval3D(pf.expr,x,y,0);}
      else if(pf.dep==="y"){x=a;z=b;y=safeEval3D(pf.expr,x,0,z);}
      else{y=a;z=b;x=safeEval3D(pf.expr,0,y,z);}
      if(!isFinite(z)||!isFinite(y)||!isFinite(x))return;
      if(x<0||x>20||y<0||y>20||z<0||z>20)return;
      S.current.spheres.push({id:S.current.nid++,x,y,z,label:"",color:cols[ai],size:7,isF:true});
    }));
    setUi(u=>({...u,sphereCount:S.current.spheres.length}));
  };

  // ── Business Flavor Mapping plot: X=ΦIndex, Y=Eₐ(t), Z=t ──────────────────
  const plotFlavorMapping = (fp) => {
    const { lambda=0.12, selectedFlavor=null } = fp || flavorParams || {};
    // Clear existing flavor-plotted spheres
    S.current.spheres = S.current.spheres.filter(sp => !sp.isFlavor);
    const flavorsToPlot = selectedFlavor
      ? [[selectedFlavor, FLAVOR_COEFFICIENTS[selectedFlavor]]]
      : Object.entries(FLAVOR_COEFFICIENTS);
    flavorsToPlot.forEach(([key, fc]) => {
      for (let t = 0; t <= G_MAX; t += 1) {
        const ea = parseFloat((fc.phi * fc.ytd * (1 + lambda * t)).toFixed(4));
        const x  = parseFloat(fc.phiIndex.toFixed(1));           // X = Φ classification index
        const y  = parseFloat(Math.min(ea, G_MAX).toFixed(3));   // Y = Eₐ(t) clamped
        const z  = t;                                             // Z = temporal epoch
        if (!isFinite(y)) continue;
        // Conflict check: flag if Y is inconsistent with velocity envelope
        const [lo, hi] = FLAVOR_VELOCITY_RANGES[fc.velocity] || [0, 10];
        const flagged = ea > hi * 1.4;
        S.current.spheres.push({
          id: S.current.nid++, x, y, z,
          label: t === 0 ? fc.label : "",
          color: flagged ? C.rustAccent : fc.color,
          size: t === 0 ? 14 : 8,
          isF: true, isFlavor: true,
          flavorKey: key, flavorFlagged: flagged,
        });
      }
    });
    setUi(u=>({...u, sphereCount: S.current.spheres.length}));
    onCoordOutput && onCoordOutput({
      x: 0, y: 0, z: 0, label: `Flavor Map λ=${lambda}`,
      formula: `Eₐ(t)=Φ·Ȳ·(1+${lambda}·t)`, time: Date.now(),
    });
  };

  // Expose plotFlavorMapping to parent via effect when flavorMode activates
  useEffect(() => {
    if (flavorMode && flavorParams) { plotFlavorMapping(flavorParams); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flavorMode, flavorParams?.lambda, flavorParams?.selectedFlavor]);
  };

  const {selCoords,formulaEval}=ui;
  const GRAPH_MODES=[["sphere","◎ Sphere"],["parallel","⊟ Parallel"],["manifold","⊞ Manifold"],["zplane","⟁ Z-Plane"]];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#080910", fontFamily:"'IBM Plex Mono',monospace" }}>
      {/* 3D Sub-Ribbon */}
      <div style={{ background:C.bgTitle, borderBottom:`1px solid ${C.borderHdr}`, padding:"0 10px",
        display:"flex", alignItems:"center", gap:8, height:30, flexShrink:0, overflowX:"auto" }}>
        <span style={{ fontSize:8, color:C.muted, letterSpacing:2, textTransform:"uppercase", flexShrink:0 }}>Graph</span>
        {GRAPH_MODES.map(([val,lbl])=>(
          <button key={val} onClick={()=>{S.current.graphType=val;setUi(u=>({...u,graphType:val}));}}
            style={{ background:ui.graphType===val?C.accentLo:"transparent", border:`1px solid ${ui.graphType===val?C.accent:C.borderHdr}`,
              color:ui.graphType===val?C.accent:C.muted, fontSize:8, padding:"2px 7px", borderRadius:2, cursor:"pointer",
              fontFamily:"inherit", letterSpacing:.8, flexShrink:0, transition:"all .12s" }}>{lbl}</button>
        ))}
        <div style={{ width:1, height:14, background:C.borderHdr, flexShrink:0 }}/>
        <span style={{ fontSize:8, color:C.muted, letterSpacing:1, flexShrink:0 }}>New</span>
        <input type="color" value={ui.addColor} onChange={e=>setUi(u=>({...u,addColor:e.target.value}))}
          style={{ width:20, height:18, padding:1, border:`1px solid ${C.borderHdr}`, borderRadius:2, background:C.bgHdr, cursor:"pointer", flexShrink:0 }}/>
        <input type="text" value={ui.addLabel} onChange={e=>setUi(u=>({...u,addLabel:e.target.value}))}
          placeholder="Label…" style={{ width:70, background:C.bgHdr, border:`1px solid ${C.borderHdr}`, color:C.dataFg,
            fontSize:9, padding:"1px 5px", borderRadius:2, fontFamily:"inherit", outline:"none", flexShrink:0 }}/>
        <button onClick={addSphere} style={{ background:"#160f04", border:`1px solid ${C.borderHdr}`, color:C.hdrFg,
          fontSize:8, padding:"2px 8px", borderRadius:2, cursor:"pointer", fontFamily:"inherit", letterSpacing:1, flexShrink:0 }}>＋ Add</button>
        <div style={{ width:1, height:14, background:C.borderHdr, flexShrink:0 }}/>
        {[["showGrid","⊞"],["showAxes","⊹"],["showLbls","Ａ"],["showConn","⊟"]].map(([k,ic])=>(
          <button key={k} onClick={()=>{S.current[k]=!S.current[k];setUi(u=>({...u,[k]:S.current[k]}));}}
            style={{ background:S.current[k]?C.accentLo:"transparent", border:`1px solid ${S.current[k]?C.accent:C.borderHdr}`,
              color:S.current[k]?C.accent:C.muted, fontSize:9, padding:"2px 5px", borderRadius:2, cursor:"pointer",
              fontFamily:"inherit", flexShrink:0, transition:"all .12s" }}>{ic}</button>
        ))}
        <div style={{ width:1, height:14, background:C.borderHdr, flexShrink:0 }}/>
        {[["↺",()=>{S.current.cam={az:0.55,el:0.40,dist:260,tx:5,ty:2,tz:5};}],
          ["⊤",()=>{S.current.cam.az=0;S.current.cam.el=Math.PI/2-.05;S.current.cam.dist=240;}],
          ["◈",()=>{S.current.cam.az=0.785;S.current.cam.el=0.615;S.current.cam.dist=260;}]
        ].map(([ic,fn])=>(
          <button key={ic} onClick={fn} style={{ background:"transparent", border:`1px solid ${C.borderHdr}`,
            color:C.muted, fontSize:8, padding:"2px 7px", borderRadius:2, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>{ic}</button>
        ))}
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:7, color:C.muted, letterSpacing:.5 }}>SPHERES <span style={{ color:C.hdrFg }}>{ui.sphereCount}</span></span>
        {flavorMode && (
          <>
            <div style={{ width:1, height:14, background:C.borderHdr, flexShrink:0 }}/>
            <span style={{ fontSize:7.5, color:C.accent, letterSpacing:1, textTransform:"uppercase", flexShrink:0 }}>⚠ Flavor Mode</span>
            <button onClick={() => plotFlavorMapping(flavorParams)}
              style={{ background:C.accentLo, border:`1px solid ${C.accent}`, color:C.accent,
                fontSize:8, padding:"2px 9px", borderRadius:2, cursor:"pointer", fontFamily:"inherit",
                letterSpacing:1, textTransform:"uppercase", flexShrink:0 }}>⊕ Plot Flavors</button>
            <button onClick={()=>{S.current.spheres=S.current.spheres.filter(s=>!s.isFlavor);setUi(u=>({...u,sphereCount:S.current.spheres.length}));}}
              style={{ background:"transparent", border:`1px solid ${C.borderHdr}`, color:"#805040",
                fontSize:8, padding:"2px 7px", borderRadius:2, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>✕ Clear</button>
          </>
        )}
      </div>

      {/* Canvas + Right Panel */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
          <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", cursor:"crosshair", touchAction:"none" }}/>
        </div>

        {/* Right coord + formula panel */}
        <div style={{ width:190, flexShrink:0, background:C.bgTitle, borderLeft:`1px solid ${C.borderHdr}`,
          display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Coords */}
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${C.borderHdr}` }}>
            <div style={{ fontSize:8, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Coordinates</div>
            {[["Z","z","#00ffe0"],["Y","y","#30f090"],["X","x","#e85010"]].map(([lbl,k,col])=>(
              <div key={k} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:700, color:col, width:12 }}>{lbl}</span>
                <span style={{ fontSize:9, color:C.muted }}>=</span>
                <span style={{ fontSize:11, color:selCoords?C.dataFg:C.muted, flex:1, letterSpacing:.3 }}>
                  {selCoords?selCoords[k].toFixed(3):"—"}
                </span>
              </div>
            ))}
            {selCoords&&<div style={{ fontSize:8, color:C.hdrFg, marginTop:3, letterSpacing:.3 }}>{selCoords.label}</div>}
          </div>

          {/* Formula */}
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${C.borderHdr}`, flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:8, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:5 }}>Formula</div>
            {ui.formulaEdit ? (
              <textarea value={ui.formulaText} onChange={e=>setUi(u=>({...u,formulaText:e.target.value}))}
                style={{ background:C.bgHdr, border:`1px solid ${C.accent}`, color:C.dataFg, fontSize:9,
                  padding:"4px 6px", borderRadius:2, fontFamily:"inherit", outline:"none", resize:"none", height:42, letterSpacing:.3 }}/>
            ):(
              <div style={{ background:C.bgHdr, border:`1px solid ${C.borderHdr}`, borderRadius:2, padding:"4px 6px",
                fontSize:9, color:C.formulaFg, letterSpacing:.3, wordBreak:"break-all", lineHeight:1.6 }}>
                {ui.formulaText}
              </div>
            )}
            <button onClick={()=>{if(ui.formulaEdit)S.current.formulaText=ui.formulaText;setUi(u=>({...u,formulaEdit:!u.formulaEdit}));}}
              style={{ marginTop:5, background:"transparent", border:`1px solid ${C.borderHdr}`, color:C.muted,
                fontSize:8, padding:"3px 6px", borderRadius:2, cursor:"pointer", fontFamily:"inherit", textTransform:"uppercase", letterSpacing:1 }}>
              {ui.formulaEdit?"✓ Save":"⇄ Edit"}
            </button>
            {formulaEval&&typeof formulaEval==="object"&&(
              <div style={{ marginTop:5, padding:"4px 6px", background:C.bgHdr, borderRadius:2,
                borderLeft:`2px solid ${formulaEval.ok?"#30f090":"#e85010"}`,
                fontSize:8, color:formulaEval.ok?"#30f090":"#e85010", lineHeight:1.7 }}>
                <div>{formulaEval.pf?.dep?.toUpperCase()} expected: {formulaEval.result?.toFixed(3)}</div>
                <div>Actual: {formulaEval.actual?.toFixed(3)}</div>
                <div style={{ fontWeight:700 }}>{formulaEval.status}</div>
              </div>
            )}
            <button onClick={plotFormula} style={{ marginTop:6, background:"#160f04", border:`1px solid ${C.borderHdr}`,
              color:C.hdrFg, fontSize:8, padding:"3px 6px", borderRadius:2, cursor:"pointer", fontFamily:"inherit",
              textTransform:"uppercase", letterSpacing:1 }}>⊹ Plot Surface</button>
            <button onClick={()=>{S.current.spheres=S.current.spheres.filter(s=>!s.isF);setUi(u=>({...u,sphereCount:S.current.spheres.length}));}}
              style={{ marginTop:3, background:"transparent", border:`1px solid ${C.borderHdr}`, color:"#805040",
                fontSize:8, padding:"3px 6px", borderRadius:2, cursor:"pointer", fontFamily:"inherit",
                textTransform:"uppercase", letterSpacing:1 }}>✕ Clear Surface</button>
          </div>

          {/* Axis labels */}
          <div style={{ padding:"6px 10px" }}>
            <div style={{ fontSize:8, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Axis Labels</div>
            {[["X","x","#e85010"],["Y","y","#30f090"],["Z","z","#00ffe0"]].map(([lbl,k,col])=>(
              <div key={k} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                <span style={{ fontSize:9, fontWeight:700, color:col, width:10 }}>{lbl}</span>
                <input value={S.current.axisLabels[k]} onChange={e=>{S.current.axisLabels[k]=e.target.value;setUi(u=>({...u}));}}
                  style={{ flex:1, background:C.bgHdr, border:`1px solid ${C.borderHdr}`, color:C.dataFg,
                    fontSize:8, padding:"1px 4px", borderRadius:2, fontFamily:"inherit", outline:"none" }}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ background:"#060708", borderTop:`1px solid ${C.borderHdr}`, padding:"2px 12px",
        display:"flex", alignItems:"center", gap:14, flexShrink:0, fontSize:8, color:C.muted, letterSpacing:.6 }}>
        <span>DRAG BG to orbit · SCROLL to zoom · CLICK sphere · SHIFT+DRAG = Y-axis</span>
        <span style={{ marginLeft:"auto", color:C.muted }}>
          {selCoords?`X:${selCoords.x.toFixed(2)} · Y:${selCoords.y.toFixed(2)} · Z:${selCoords.z.toFixed(2)}`:"—"}
        </span>
        <span style={{ color:"#2a4020", letterSpacing:1 }}>LOCAL ENCLAVE SAFE</span>
      </div>
    </div>
  );
}

// ── NMG Rust HUD Graph ────────────────────────────────────────────────────────
function NMGGraph() {
  const W = 820, H = 420;
  // 6 trunks × 3 nodes each — horizontal layout matching nmg.py
  // X = hierarchy depth (0,1,2), Y = trunk lane
  const xPos = [80, 380, 680];
  const yPos = [48, 108, 168, 228, 288, 348];

  const nodePos = {};
  const nodeColor = {};
  const nodeTrunk = {};
  NMG_TRUNKS.forEach(({ name, nodes, color }, ti) => {
    nodes.forEach((node, ni) => {
      nodePos[node]  = [xPos[ni], yPos[ti]];
      nodeColor[node] = color;
      nodeTrunk[node] = name;
    });
  });

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.rustBg, display: "flex", flexDirection: "column" }}>

      {/* HUD header */}
      <div style={{ padding: "10px 20px 8px", borderBottom: `1px solid ${C.rustBorder}`,
        display: "flex", alignItems: "center", gap: 24, flexShrink: 0,
        background: `linear-gradient(180deg, #1c0e06 0%, ${C.rustBg} 100%)` }}>
        <div>
          <div style={{ fontSize: 11, color: C.rustAccent, fontWeight: 700, letterSpacing: 4, fontFamily: "'IBM Plex Mono',monospace" }}>
            NMG — SIX-TRUNK MATRIX
          </div>
          <div style={{ fontSize: 9, color: "#d08050", letterSpacing: 2, fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 }}>
            HORIZONTAL POSITIONING MAP · INTERCEPT VECTORS
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        {/* Trunk legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", justifyContent: "flex-end" }}>
          {NMG_TRUNKS.map(({ name, color }) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}88` }}/>
              <span style={{ fontSize: 9, color: "#e8b870", fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.8 }}>{name}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={18} height={6}><line x1={0} y1={3} x2={18} y2={3} stroke="#ff6820" strokeWidth={1.5} strokeDasharray="4,3"/></svg>
            <span style={{ fontSize: 9, color: "#e8b870", fontFamily: "'IBM Plex Sans',sans-serif", letterSpacing: 0.8 }}>Intercept</span>
          </div>
        </div>
      </div>

      {/* SVG graph area */}
      <div style={{ flex: 1, padding: "12px 20px", minHeight: 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", maxHeight: 420 }}>
          <defs>
            <marker id="arr-trunk" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
              <path d="M1,1.5 L7,4 L1,6.5 Z" fill="#504030"/>
            </marker>
            <marker id="arr-int" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
              <path d="M1,1.5 L7,4 L1,6.5 Z" fill="#ff6820"/>
            </marker>
            {/* Rust noise background */}
            <filter id="rust-glow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <radialGradient id="rustBg" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#1c0e06"/>
              <stop offset="100%" stopColor="#100a04"/>
            </radialGradient>
          </defs>

          {/* Background plate */}
          <rect x={0} y={0} width={W} height={H} fill="url(#rustBg)"/>

          {/* Grid lines — horizontal lane separators */}
          {yPos.map((y, i) => (
            <line key={i} x1={20} y1={y} x2={W - 20} y2={y} stroke="#5a3820" strokeWidth={1} strokeDasharray="2,8"/>
          ))}

          {/* Trunk spine connectors */}
          {NMG_TRUNKS.map(({ nodes, color }) =>
            nodes.slice(0, -1).map((node, i) => {
              const a = nodePos[node], b = nodePos[nodes[i + 1]];
              return (
                <line key={node} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                  stroke={color} strokeWidth={2} strokeOpacity={0.85}
                  markerEnd="url(#arr-trunk)" filter="url(#rust-glow)"/>
              );
            })
          )}

          {/* Intercept vectors */}
          {NMG_INTERCEPTS.map(([from, to], i) => {
            const a = nodePos[from], b = nodePos[to];
            if (!a || !b) return null;
            return (
              <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                stroke="#ff6820" strokeWidth={1.8} strokeDasharray="7,5"
                markerEnd="url(#arr-int)" opacity={0.9} filter="url(#rust-glow)"/>
            );
          })}

          {/* Nodes + labels */}
          {Object.entries(nodePos).map(([node, [x, y]]) => {
            const col = nodeColor[node];
            // Wrap long labels at " / " or "/ "
            const parts = node.split(" / ");
            return (
              <g key={node} filter="url(#rust-glow)">
                {/* Outer glow ring */}
                <circle cx={x} cy={y} r={28} fill="none" stroke={col} strokeWidth={1} strokeOpacity={0.2}/>
                {/* Node circle */}
                <circle cx={x} cy={y} r={20} fill={C.rustBg} stroke={col} strokeWidth={1.8} strokeOpacity={0.85}/>
                {/* Center dot */}
                <circle cx={x} cy={y} r={4} fill={col} opacity={0.9}/>
                {/* Label — split into lines, rendered BELOW node */}
                {parts.map((part, pi) => (
                  <text key={pi} x={x} y={y + 34 + pi * 13}
                    textAnchor="middle" fill={col} fillOpacity={1}
                    fontSize={9.5} fontFamily="'IBM Plex Mono',monospace" fontWeight="600" letterSpacing={0.3}>
                    {part.trim()}
                  </text>
                ))}
              </g>
            );
          })}

          {/* Depth axis labels at top */}
          {["Federal", "State", "County"].map((lbl, i) => (
            <text key={lbl} x={xPos[i]} y={14} textAnchor="middle"
              fill="#c87840" fontSize={8} fontFamily="'IBM Plex Mono',monospace"
              fontWeight="700" letterSpacing={2}>
              {lbl.toUpperCase()}
            </text>
          ))}

          {/* Trunk labels on left rail */}
          {NMG_TRUNKS.map(({ name, color }, ti) => (
            <text key={name} x={14} y={yPos[ti] + 4} textAnchor="middle"
              fill={color} fillOpacity={1} fontSize={7} fontFamily="'IBM Plex Mono',monospace"
              fontWeight="700" letterSpacing={1.2}
              transform={`rotate(-90, 14, ${yPos[ti] + 4})`}>
              {name.toUpperCase()}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Sample CSV ────────────────────────────────────────────────────────────────
const SAMPLE_CSV = `Year,Historical_Event,Production_Index,Compensation_Index,Gap_PC,Debt_Pct_GDP,LFP_Pct,Inflation_Pct
1980,Reagan Election,100,100,0.0,32.5,63.8,13.5
1985,Plaza Accord,112,108,3.7,43.8,64.7,3.5
1990,Gulf War,124,114,8.6,55.9,66.4,5.4
1995,NAFTA Active,138,119,15.9,67.1,66.6,2.8
2000,Dot-com Peak,158,126,25.4,57.4,67.1,3.4
2005,Housing Boom,172,131,31.3,63.5,66.0,3.4
2008,Financial Crisis,168,129,30.2,73.2,65.7,3.8
2010,QE Expansion,174,131,32.8,94.2,64.7,1.6
2015,Gig Economy,191,136,40.4,100.8,62.7,0.1
2020,COVID Shock,185,138,34.1,127.9,61.5,1.2
2024,AI Surge,210,142,47.9,122.3,62.5,3.1`;

// ── Shared button styles ──────────────────────────────────────────────────────
const BTN = {
  background: "#160f04", border: "1px solid #3a2e18", color: "#d4a84a",
  padding: "3px 10px", borderRadius: 3, cursor: "pointer",
  fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1.5,
  textTransform: "uppercase", transition: "background .12s",
};
const BTN_GHOST = {
  background: "transparent", border: "1px solid #242018", color: "#6a5a30",
  padding: "3px 10px", borderRadius: 3, cursor: "pointer",
  fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1.5,
  textTransform: "uppercase",
};

// ── Triangle handle (unchanged logic, updated colors) ─────────────────────────
const TRI_CLIP = { br:"polygon(100% 0%,100% 100%,0% 100%)", bl:"polygon(0% 0%,100% 100%,0% 100%)", tr:"polygon(100% 0%,100% 100%,0% 0%)", tl:"polygon(0% 0%,100% 0%,0% 100%)" };
const TRI_POS  = { br:{bottom:1,right:1}, bl:{bottom:1,left:1}, tr:{top:1,right:1}, tl:{top:1,left:1} };

function Triangle({ corner, active, onOpen }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onOpen(e);}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ position:"absolute", ...TRI_POS[corner], width:9, height:9,
        clipPath:TRI_CLIP[corner], background:active?"#ffc820":hov?"#9a7030":"#3a2e18",
        cursor:"pointer", zIndex:10, transition:"background .1s", pointerEvents:"all" }}
    />
  );
}

const AlignIcon = ({ type, sz = 14 }) => {
  const bars = { left:[[1,0,10,2],[1,4,7,2],[1,8,9,2]], center:[[1,0,10,2],[2.5,4,7,2],[2,8,8,2]], right:[[1,0,10,2],[4,4,7,2],[2.5,8,8,2]] }[type];
  return <svg width={sz} height={sz*.85} viewBox="0 0 13 11" fill="currentColor">{bars.map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} rx={.5}/>)}</svg>;
};

// ── Format Panel ──────────────────────────────────────────────────────────────
const DFMT = { align:"left", wrap:false, fit:false };

function FormatPanel({ type, index, label, fmt, onUpdate, onClose, ax, ay }) {
  const left = Math.min(ax, window.innerWidth - 240);
  const top  = Math.min(ay + 4, window.innerHeight - 180);
  return (
    <div onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}
      style={{ position:"fixed", left, top, width:230, background:"#0d0e10",
        border:"1px solid #3a2e18", borderRadius:7, zIndex:9999,
        boxShadow:"0 12px 48px rgba(0,0,0,.95), 0 0 0 1px rgba(245,184,0,.07)",
        fontFamily:"'IBM Plex Mono',monospace", overflow:"hidden" }}>
      <div style={{ background:"#111008", borderBottom:"1px solid #3a2e18", padding:"6px 10px",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:9, color:C.accent, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>{label}</span>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#806040", cursor:"pointer", fontSize:16 }}>×</button>
      </div>
      <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:10 }}>
        <div>
          <div style={{ fontSize:9, color:"#7a6030", letterSpacing:1.8, textTransform:"uppercase", marginBottom:5, fontFamily:"'IBM Plex Sans',sans-serif" }}>Alignment</div>
          <div style={{ display:"flex", gap:4 }}>
            {["left","center","right"].map(a=>(
              <button key={a} onClick={()=>onUpdate({align:a})} style={{
                flex:1, padding:"5px 0", background:fmt.align===a?"#201800":"#0e0c06",
                border:`1px solid ${fmt.align===a?C.accent:"#2a2010"}`,
                borderRadius:3, cursor:"pointer", color:fmt.align===a?C.accent:"#6a5030",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}><AlignIcon type={a}/></button>
            ))}
          </div>
        </div>
        <div style={{ borderTop:"1px solid #242018", paddingTop:8, display:"flex", flexDirection:"column", gap:7 }}>
          {[["wrap","Word Wrap"],["fit","Fit Width"]].map(([k,lbl])=>(
            <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#b09060", fontFamily:"'IBM Plex Sans',sans-serif" }}>{lbl}</span>
              <button onClick={()=>onUpdate({[k]:!fmt[k]})} style={{
                width:34, height:17, borderRadius:9, border:"none",
                background:fmt[k]?"#2d1f00":"#141008", cursor:"pointer", position:"relative",
                outline:`1px solid ${fmt[k]?C.accent:"#302a18"}`,
              }}>
                <div style={{ position:"absolute", top:2, left:fmt[k]?17:2, width:13, height:13,
                  borderRadius:"50%", background:fmt[k]?C.accent:"#504030", transition:"left .18s",
                  boxShadow:fmt[k]?"0 0 5px rgba(245,184,0,.7)":"none" }}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MarcoHardExcel() {
  const [parsed,      setParsed    ] = useState(() => parseCSV(SAMPLE_CSV));
  const [formulas,    setFormulas  ] = useState({});
  const [colWidths,   setColWidths ] = useState({});
  const [selCell,     setSelCell   ] = useState(null);
  const [selRow,      setSelRow    ] = useState(null);
  const [selCol,      setSelCol    ] = useState(null);
  const [editCell,    setEditCell  ] = useState(null);
  const [editVal,     setEditVal   ] = useState("");
  const [sortCol,     setSortCol   ] = useState(null);
  const [groups,      setGroups    ] = useState({});
  const [colFmt,      setColFmt    ] = useState({});
  const [rowFmt,      setRowFmt    ] = useState({});
  const [popover,     setPopover   ] = useState(null);
  const [activeSheet, setActiveSheet] = useState(0);   // 0 = NMG Graph, 1 = Sheet
  const [filterText,  setFilterText ] = useState("");
  const [fraudPaneOpen,     setFraudPaneOpen    ] = useState(false);
  const [fraudScores,       setFraudScores      ] = useState({});
  const [fraudTargets,      setFraudTargets     ] = useState({});
  const [formulasPanelOpen, setFormulasPanelOpen] = useState(false);
  const [outputsSaved,      setOutputsSaved     ] = useState([]);
  const [rightBarOutput,    setRightBarOutput   ] = useState(null); // {equation, result, status}
  const [flavorMode,        setFlavorMode       ] = useState(false);
  const [selectedFlavor,    setSelectedFlavor   ] = useState("Inc");
  const [lambdaParam,       setLambdaParam      ] = useState(0.12);
  const [tParam,            setTParam           ] = useState(5);
  const [ytdOverride,       setYtdOverride      ] = useState("");

  const fileRef  = useRef(null);
  const inputRef = useRef(null);
  const gridRef  = useRef(null);
  const resizing = useRef(null);

  const { headers, rows: rawRows } = parsed;
  const nC = headers.length;

  const sortedRows = useMemo(() => {
    if (!sortCol) return rawRows;
    const { c, dir } = sortCol;
    return [...rawRows].sort((a, b) => {
      const av = a[c] ?? "", bv = b[c] ?? "";
      const an = parseFloat(av), bn = parseFloat(bv);
      const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rawRows, sortCol]);

  const displayRows = useMemo(() => {
    if (!filterText) return sortedRows;
    const ft = filterText.toLowerCase();
    return sortedRows.filter(row => row.some(c => String(c ?? "").toLowerCase().includes(ft)));
  }, [sortedRows, filterText]);

  const nR = displayRows.length;

  const dispVal = (r, c) => {
    const key = `${r}_${c}`;
    const f = formulas[key];
    if (f) return String(evalFormula(f, displayRows));
    return displayRows[r]?.[c] ?? "";
  };

  const fbarVal  = selCell ? (formulas[`${selCell.r}_${selCell.c}`] ?? displayRows[selCell.r]?.[selCell.c] ?? "") : "";
  const cellAddr = selCell ? `${colLetter(selCell.c)}${selCell.r + 1}` : "";
  const cw       = c => colWidths[c] ?? 130;
  const getCF    = c => ({ ...DFMT, ...colFmt[c] });
  const getRF    = r => ({ ...DFMT, ...rowFmt[r] });

  // Column resize
  const startResize = (c, e) => {
    e.stopPropagation(); e.preventDefault();
    resizing.current = { c, startX: e.clientX, startW: cw(c) };
    const onMove = ev => setColWidths(p => ({ ...p, [resizing.current.c]: Math.max(40, resizing.current.startW + ev.clientX - resizing.current.startX) }));
    const onUp   = () => { resizing.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Edit
  const startEdit = (r, c) => {
    setEditCell({ r, c });
    setEditVal(formulas[`${r}_${c}`] ?? displayRows[r]?.[c] ?? "");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = useCallback(() => {
    if (!editCell) return;
    const { r, c } = editCell;
    const key = `${r}_${c}`;
    if (editVal.startsWith("=")) {
      setFormulas(p => ({ ...p, [key]: editVal }));
    } else {
      setFormulas(p => { const n = { ...p }; delete n[key]; return n; });
      setParsed(p => ({ ...p, rows: p.rows.map((row, ri) => ri === r ? row.map((v, ci) => ci === c ? editVal : v) : row) }));
    }
    setEditCell(null);
  }, [editCell, editVal]);

  const onEditKey = e => {
    if (e.key === "Enter")  { commitEdit(); setSelCell(s => s && s.r + 1 < nR ? { r: s.r + 1, c: s.c } : s); }
    else if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSelCell(s => s && s.c + 1 < nC ? { r: s.r, c: s.c + 1 } : s); }
    else if (e.key === "Escape") setEditCell(null);
  };

  const onGridKey = e => {
    if (!selCell || editCell) return;
    if (e.key === "Enter" || e.key === "F2") { startEdit(selCell.r, selCell.c); return; }
    if (e.key === "Delete" || e.key === "Backspace") {
      const { r, c } = selCell;
      setFormulas(p => { const n = { ...p }; delete n[`${r}_${c}`]; return n; });
      setParsed(p => ({ ...p, rows: p.rows.map((row, ri) => ri === r ? row.map((v, ci) => ci === c ? "" : v) : row) }));
      return;
    }
    const mv = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] }[e.key];
    if (mv) { e.preventDefault(); setSelCell(s => ({ r: Math.max(0, Math.min(nR-1, s.r+mv[0])), c: Math.max(0, Math.min(nC-1, s.c+mv[1])) })); }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setEditCell(selCell);
      setEditVal(e.key === "=" ? "=" : e.key);
      setTimeout(() => { if (inputRef.current) { inputRef.current.focus(); inputRef.current.setSelectionRange(999,999); } }, 0);
    }
  };

  const groupSelectedRows = () => {
    if (selRow === null) return;
    const end = Math.min(selRow + 2, nR - 1);
    setGroups(p => ({ ...p, [selRow]: { endR: end, collapsed: false } }));
  };
  const toggleGroup = r => setGroups(p => ({ ...p, [r]: { ...p[r], collapsed: !p[r]?.collapsed } }));
  const isHiddenRow = r => Object.entries(groups).some(([s, g]) => g.collapsed && r > parseInt(s) && r <= (g.endR ?? parseInt(s)));

  const handleSort = c => setSortCol(p => p?.c === c ? (p.dir === "asc" ? { c, dir: "desc" } : null) : { c, dir: "asc" });

  const exportCSV = () => {
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob([[headers.join(","), ...displayRows.map(r => r.map(esc).join(","))].join("\n")], { type: "text/csv" });
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "marcohard_export.csv" }).click();
  };

  const onFile = e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = ev => { setParsed(parseCSV(ev.target.result)); setFormulas({}); setColWidths({}); setSortCol(null); setFilterText(""); setGroups({}); };
    rd.readAsText(f); e.target.value = "";
  };

  useEffect(() => {
    const h = () => setPopover(null);
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  const openTri = (type, index, e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setPopover(p => p?.type === type && p.index === index ? null : { type, index, ax: r.left, ay: r.bottom });
  };

  const triFor = (r, c, isHdr) => {
    const top = isHdr, bot = !isHdr && r === nR - 1, lft = c === 0, rgt = c === nC - 1;
    if (!top && !bot && !lft && !rgt) return null;
    if (top && lft) return { corner:"br", type:"col", index:c };
    if (top && rgt) return { corner:"bl", type:"col", index:c };
    if (bot && lft) return { corner:"tr", type:"row", index:r };
    if (bot && rgt) return { corner:"tl", type:"row", index:r };
    if (top) return { corner:"bl", type:"col", index:c };
    if (bot) return { corner:"tl", type:"row", index:r };
    if (lft) return { corner:"tr", type:"row", index:r };
    if (rgt) return { corner:"tl", type:"row", index:r };
  };

  const statusStats = useMemo(() => {
    if (!selCell) return null;
    const v = parseFloat(dispVal(selCell.r, selCell.c));
    if (!isNaN(v)) return { sum: v, avg: v, count: 1 };
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selCell, displayRows, formulas]);

  // ── Selection → right-bar forensic evaluation ──────────────────────────────
  useEffect(() => {
    if (!selCell) { setRightBarOutput(null); return; }
    const row = displayRows[selCell.r];
    if (!row) { setRightBarOutput(null); return; }
    const fKey = `${selCell.r}_${selCell.c}`;
    if (formulas[fKey]) {
      const val = dispVal(selCell.r, selCell.c);
      setRightBarOutput({ equation: formulas[fKey], result: `= ${val}`, status: "FORMULA" });
      return;
    }
    const result = evaluateAccountabilityScore(row, headers, fraudScores);
    setRightBarOutput(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selCell]);

  // ── 3D coordinate output → OUTPUTS_SAVED pipeline ─────────────────────────
  const handleCoordOutput = useCallback((coord) => {
    setOutputsSaved(prev => {
      const next = [{ ...coord, id: Date.now() }, ...prev].slice(0, 50);
      MATHEMATICAL_REGISTRY.OUTPUTS_SAVED = next;   // sync static registry
      return next;
    });
  }, []);

  // ── Sheet render ────────────────────────────────────────────────────────────
  const renderSheet = () => {
    const flavorEval = flavorMode
      ? evaluateAnticipatory(ytdOverride !== "" ? parseFloat(ytdOverride) : undefined, selectedFlavor, lambdaParam, tParam)
      : null;
    const barOutput = flavorMode ? flavorEval : rightBarOutput;
    return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Bisectional Formula Watermark Bar ── 50/50 split */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", background:"#090b10",
        borderBottom:`1px solid ${C.borderHdr}`, flexShrink:0, height:34 }}>

        {/* LEFT: Input Channel — cell edit OR flavor parameter tuner */}
        <div style={{ display:"flex", alignItems:"center", borderRight:`1px solid ${C.borderHdr}` }}>
          {flavorMode ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:5, padding:"0 8px", overflow:"hidden" }}>
              <span style={{ fontSize:8, color:C.accent, fontWeight:700, letterSpacing:1.5, flexShrink:0 }}>Φ</span>
              <select value={selectedFlavor} onChange={e=>setSelectedFlavor(e.target.value)}
                style={{ background:C.bgHdr, border:`1px solid ${C.borderHdr}`, color:C.dataFg,
                  fontSize:9, padding:"1px 4px", borderRadius:2, fontFamily:"inherit", outline:"none", flexShrink:0 }}>
                {Object.entries(FLAVOR_COEFFICIENTS).map(([k,fc])=>(
                  <option key={k} value={k}>{fc.label} Φ={fc.phi}</option>
                ))}
              </select>
              <span style={{ fontSize:8, color:C.muted, letterSpacing:1, flexShrink:0 }}>λ</span>
              <input type="number" value={lambdaParam} step={0.01} min={0} max={2}
                onChange={e=>setLambdaParam(parseFloat(e.target.value)||0)}
                style={{ width:46, background:C.bgHdr, border:`1px solid ${C.borderHdr}`, color:C.formulaFg,
                  fontSize:9, padding:"1px 5px", borderRadius:2, fontFamily:"inherit", outline:"none", flexShrink:0 }}/>
              <span style={{ fontSize:8, color:C.muted, letterSpacing:1, flexShrink:0 }}>t</span>
              <input type="number" value={tParam} step={1} min={0} max={10}
                onChange={e=>setTParam(parseFloat(e.target.value)||0)}
                style={{ width:36, background:C.bgHdr, border:`1px solid ${C.borderHdr}`, color:C.formulaFg,
                  fontSize:9, padding:"1px 5px", borderRadius:2, fontFamily:"inherit", outline:"none", flexShrink:0 }}/>
              <input value={ytdOverride} onChange={e=>setYtdOverride(e.target.value)}
                placeholder={`Ȳ default ${FLAVOR_COEFFICIENTS[selectedFlavor]?.ytd}`}
                style={{ flex:1, minWidth:0, background:"transparent", border:"none", outline:"none",
                  color:C.dataFg, fontSize:9, padding:"0 4px", fontFamily:"inherit" }}/>
              <button onClick={()=>{setFlavorMode(false);setRightBarOutput(null);}}
                style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:12, lineHeight:1, flexShrink:0 }}>×</button>
            </div>
          ) : (
            <>
              <div style={{ width:60, padding:"0 8px", fontSize:10, color:C.accent, fontWeight:700,
                borderRight:`1px solid ${C.borderHdr}`, lineHeight:"34px", letterSpacing:1,
                flexShrink:0, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>
                {cellAddr || "—"}
              </div>
              <div style={{ width:26, display:"flex", alignItems:"center", justifyContent:"center",
                borderRight:`1px solid ${C.borderHdr}`, flexShrink:0, height:"100%" }}>
                <span style={{ fontSize:13, color:"#50c880", fontWeight:700 }}>ƒ</span>
              </div>
              <input value={editCell ? editVal : (selCell ? fbarVal : "")}
                onChange={e => editCell && setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditCell(null); }}
                placeholder="Select cell · = formula"
                style={{ flex:1, background:"transparent", border:"none", outline:"none",
                  color:editCell?C.accentHi:C.dataFg, fontSize:10, padding:"0 10px",
                  fontFamily:"'IBM Plex Mono',monospace" }}
              />
            </>
          )}
        </div>

        {/* RIGHT: Mathematical Output Readout — flavor Eₐ(t) or cell forensic eval */}
        <div style={{ display:"flex", alignItems:"center", padding:"0 10px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
            fontSize:16, color:flavorMode?"rgba(245,184,0,.07)":"rgba(245,184,0,.04)", fontWeight:900,
            letterSpacing:5, pointerEvents:"none", textTransform:"uppercase", userSelect:"none" }}>
            {flavorMode ? "Eₐ(t)" : "AUDIT"}
          </div>
          {barOutput ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                background: barOutput.status==="FLAVOR_CONFLICT"  ? C.rustAccent
                  : barOutput.status==="HIGH_VELOCITY"            ? "#f5b800"
                  : barOutput.status==="CONFIRMABLE_RISK"         ? C.rustAccent
                  : barOutput.status==="ELEVATED_ANOMALY"         ? "#f5b800"
                  : barOutput.status==="FORMULA"                  ? "#30f090"
                  : C.muted,
                boxShadow: (barOutput.status==="CONFIRMABLE_RISK"||barOutput.status==="FLAVOR_CONFLICT")
                  ? `0 0 7px ${C.rustAccent}99`
                  : barOutput.status==="HIGH_VELOCITY" ? `0 0 7px #f5b80088` : "none" }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:8.5, color:
                  barOutput.status==="FLAVOR_CONFLICT"?"#e85010":
                  barOutput.status==="HIGH_VELOCITY"?C.accent:
                  barOutput.status==="CONFIRMABLE_RISK"?"#e85010":
                  barOutput.status==="FORMULA"?"#30f090":C.formulaFg,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:.4 }}>
                  {barOutput.equation}
                </div>
                <div style={{ fontSize:9, color:C.hdrFg, fontWeight:700, letterSpacing:.8, marginTop:1,
                  display:"flex", gap:7, alignItems:"center" }}>
                  <span>{barOutput.result}</span>
                  {barOutput.status && <span style={{ fontSize:7,
                    color:barOutput.status==="FLAVOR_CONFLICT"?"#e85010":barOutput.status==="HIGH_VELOCITY"?"#f5b800":C.muted,
                    letterSpacing:1.5, fontWeight:700 }}>{barOutput.status}</span>}
                  {flavorMode && barOutput.flavor && <span style={{ fontSize:7,
                    color:FLAVOR_COEFFICIENTS[selectedFlavor]?.color||C.muted, letterSpacing:1 }}>[{barOutput.flavor}]</span>}
                </div>
              </div>
            </div>
          ) : (
            <span style={{ fontSize:9, color:C.muted, letterSpacing:.5, fontStyle:"italic" }}>
              {flavorMode ? "Configure Φ · λ · t above" : selCell ? "Evaluating…" : "Select cell · or activate Flavor Mode"}
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey}
        style={{ flex: 1, overflow: "auto", outline: "none", position: "relative" }}>
        <table style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: "100%" }}>
          <colgroup>
            <col style={{ width: 42 }}/>
            {headers.map((_, c) => <col key={c} style={{ width: cw(c) }}/>)}
          </colgroup>
          <thead>
            <tr>
              <th style={{ width: 42, background: C.bgHdr, borderRight: `1px solid ${C.borderHdr}`, borderBottom: `2px solid ${C.borderHdr}`, position: "sticky", top: 0, left: 0, zIndex: 30 }}>
                <span style={{ fontSize: 7, color: "#3a3020", letterSpacing: 1 }}>MH</span>
              </th>
              {headers.map((h, c) => {
                const sel = selCol === c;
                const cf  = getCF(c);
                const sortDir = sortCol?.c === c ? sortCol.dir : null;
                const ti = triFor(-1, c, true);
                const active = popover?.type === "col" && popover.index === c;
                return (
                  <th key={c} onMouseDown={() => { setSelCol(c); setSelRow(null); setSelCell(null); setEditCell(null); }}
                    style={{ background: sel ? "#160f02" : C.bgHdr,
                      borderRight: `1px solid ${C.borderHdr}`, borderBottom: `2px solid ${sel ? C.accent : C.borderHdr}`,
                      padding: "2px 8px 6px", position: "sticky", top: 0, zIndex: 20,
                      cursor: "pointer", userSelect: "none", verticalAlign: "bottom", transition: "background .12s" }}>
                    <div style={{ position: "relative", minHeight: 38 }}>
                      <div style={{ fontSize: 8, color: C.colLetter, letterSpacing: 2, marginBottom: 2, fontWeight: 600 }}>{colLetter(c)}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: sel ? C.accent : C.hdrFg,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: cw(c) - 14,
                        display: "flex", alignItems: "center", gap: 4 }}>
                        <span onClick={e => { e.stopPropagation(); handleSort(c); }}>{h}</span>
                        {sortDir && <span style={{ color: C.accent, fontSize: 8 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </div>
                      {cf.align !== "left" && (
                        <div style={{ position: "absolute", bottom: 0, left: cf.align === "center" ? "50%" : "auto", right: cf.align === "right" ? 0 : "auto",
                          transform: cf.align === "center" ? "translateX(-50%)" : "none",
                          width: 14, height: 1.5, background: C.accent, borderRadius: 1, opacity: .6 }}/>
                      )}
                      <div onMouseDown={e => startResize(c, e)}
                        style={{ position: "absolute", right: -14, top: 0, bottom: 0, width: 12, cursor: "col-resize", zIndex: 10 }}/>
                      {ti && <Triangle corner={ti.corner} active={active} onOpen={e => openTri("col", c, e)}/>}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, r) => {
              if (isHiddenRow(r)) return null;
              const rSel = selRow === r;
              const grp  = groups[r];
              return (
                <tr key={r}>
                  <td onMouseDown={() => { setSelRow(r); setSelCol(null); setSelCell(null); setEditCell(null); }}
                    style={{ width: 42, background: rSel ? "#130f00" : C.bgHdr,
                      borderRight: `1px solid ${rSel ? C.accent : C.borderHdr}`, borderBottom: `1px solid ${C.border}`,
                      padding: "0 4px", fontSize: 9, color: rSel ? C.accent : C.rowNumFg,
                      cursor: "pointer", position: "sticky", left: 0, zIndex: 12, userSelect: "none", height: 26 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, height: "100%" }}>
                      {grp && (
                        <span onClick={e => { e.stopPropagation(); toggleGroup(r); }}
                          style={{ fontSize: 8, color: grp.collapsed ? C.accent : "#5a4820", cursor: "pointer",
                            display: "inline-flex", transform: grp.collapsed ? "rotate(0deg)" : "rotate(90deg)",
                            transition: "transform .15s, color .15s", lineHeight: 1 }}>▶</span>
                      )}
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{r + 1}</span>
                    </div>
                  </td>
                  {row.map((_, c) => {
                    const isSel  = selCell?.r === r && selCell?.c === c;
                    const cSel   = selCol === c;
                    const isEdit = editCell?.r === r && editCell?.c === c;
                    const val    = dispVal(r, c);
                    const isForm = !!(formulas[`${r}_${c}`]?.startsWith("="));
                    const cf     = getCF(c), rf = getRF(r);
                    const align  = cf.align !== "left" ? cf.align : rf.align;
                    const ti     = triFor(r, c, false);
                    const triAct = popover?.type === ti?.type && popover?.index === ti?.index;
                    return (
                      <td key={c}
                        onMouseDown={() => { setSelCell({ r, c }); setSelRow(null); setSelCol(null); if (editCell && !(editCell.r === r && editCell.c === c)) commitEdit(); }}
                        onDoubleClick={() => startEdit(r, c)}
                        style={{ position: "relative",
                          background: isSel ? "#1a1500" : (rSel || cSel) ? "#100e06" : "transparent",
                          border: isSel ? `1px solid ${C.accent}` : "none",
                          borderRight: isSel ? undefined : `1px solid ${C.border}`,
                          borderBottom: isSel ? undefined : `1px solid ${C.border}`,
                          padding: 0, height: 26, fontSize: 11, lineHeight: "26px",
                          color: isForm ? C.formulaFg : (isSel || rSel || cSel) ? C.selData : C.dataFg,
                          textAlign: align, overflow: "hidden", cursor: "cell", userSelect: "none" }}>
                        {isEdit ? (
                          <input ref={inputRef} value={editVal} onChange={e => setEditVal(e.target.value)}
                            onKeyDown={onEditKey} onBlur={commitEdit}
                            style={{ width: "100%", height: "100%", background: C.bgEdit,
                              border: `1px solid ${C.accent}`, color: C.accentHi, fontSize: 11,
                              padding: "0 6px", fontFamily: "'IBM Plex Mono',monospace", outline: "none" }}/>
                        ) : (
                          <div style={{ padding: "0 6px", overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: cf.wrap || rf.wrap ? "pre-wrap" : "nowrap" }}>
                            {val !== "" ? val : <span style={{ color: C.muted, fontStyle: "italic" }}>—</span>}
                          </div>
                        )}
                        {ti && <Triangle corner={ti.corner} active={triAct} onOpen={e => openTri(ti.type, ti.index, e)}/>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
  };

  // ── Full render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'IBM Plex Mono','Courier New',monospace", background: C.bg, color: C.dataFg, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Title bar */}
      <div style={{ background: C.bgTitle, borderBottom: `1px solid ${C.borderHdr}`, padding: "5px 14px",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0, userSelect: "none",
        opacity: fraudPaneOpen ? 0.88 : 1, transition: "opacity .2s" }}>

        {/* ── INDEX 0: Primary Fraud System Control ── */}
        <button
          onClick={() => setFraudPaneOpen(p => !p)}
          style={{
            background: fraudPaneOpen ? C.accentLo : "#0d0e1a",
            border: `1px solid ${fraudPaneOpen ? C.accent : "#3a2e18"}`,
            color: C.accent,
            fontWeight: 700,
            padding: "3px 11px",
            borderRadius: 3,
            cursor: "pointer",
            fontSize: 9,
            fontFamily: "'IBM Plex Mono',monospace",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            boxShadow: fraudPaneOpen ? `0 0 10px ${C.accentLo}, inset 0 0 6px rgba(245,184,0,.08)` : "none",
            transition: "all .15s",
            flexShrink: 0,
          }}>
          ⚠ FRAUD
        </button>
        <button
          onClick={() => setFormulasPanelOpen(p => !p)}
          style={{
            background: formulasPanelOpen ? "rgba(48,240,144,.1)" : "#0d0e1a",
            border: `1px solid ${formulasPanelOpen ? "#30f090" : "#3a2e18"}`,
            color: formulasPanelOpen ? "#30f090" : C.muted,
            fontWeight: 600, padding: "3px 11px", borderRadius: 3, cursor: "pointer",
            fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1.5,
            textTransform: "uppercase", transition: "all .15s", flexShrink: 0,
          }}>
          ▤ Formulas
        </button>
        <button
          style={{
            background: "#0d0e1a", border: `1px solid #3a2e18`,
            color: C.muted, fontWeight: 600, padding: "3px 11px", borderRadius: 3, cursor: "pointer",
            fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: 1.5,
            textTransform: "uppercase", transition: "all .15s", flexShrink: 0,
          }}>
          📊 Charts
        </button>
        <div style={{ width: 1, height: 14, background: "#3a2e18" }}/>

        <span style={{ fontSize: 12, color: C.accent, fontWeight: 700, letterSpacing: 4 }}>▤ MARCOHARD</span>
        <span style={{ fontSize: 9, color: "#7a6030", letterSpacing: 2 }}>EXCEL</span>
        <div style={{ width: 1, height: 14, background: "#3a2e18" }}/>
        <button style={BTN} onClick={() => fileRef.current?.click()}>↑ Load CSV</button>
        <button style={BTN} onClick={exportCSV}>↓ Export</button>
        <button style={BTN} onClick={groupSelectedRows}>⊞ Group Row</button>
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onFile} style={{ display: "none" }}/>
        <div style={{ flex: 1 }}/>
        <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="⌕ filter rows…"
          style={{ background: "#0e0e16", border: `1px solid ${C.borderHdr}`, color: C.dataFg, fontSize: 9,
            padding: "3px 8px", borderRadius: 3, fontFamily: "inherit", outline: "none", width: 140 }}/>
        <button style={BTN_GHOST} onClick={() => { setParsed(parseCSV(SAMPLE_CSV)); setFormulas({}); setColWidths({}); setSortCol(null); setFilterText(""); setGroups({}); }}>↺ Reset</button>
      </div>

      {/* ── WATERMARK RIBBON — mode-adaptive command surface ── */}
      <div style={{ background: "#090b0f", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        display: "flex", alignItems: "center", height: 30, overflowX: "auto", userSelect: "none" }}>

        {activeSheet === 1 && (
          /* Sheet mode ribbon */
          <>
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"0 10px", borderRight:`1px solid ${C.border}` }}>
              <span style={{ fontSize:7.5, color:C.muted, letterSpacing:1.2, textTransform:"uppercase" }}>Edit</span>
              <span style={{ fontSize:8, color:"#5a4820", letterSpacing:.5 }}>Dbl-click cell · <span style={{ color:C.accent }}>=</span> formula</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, padding:"0 8px", borderRight:`1px solid ${C.border}` }}>
              <span style={{ fontSize:7.5, color:C.muted, letterSpacing:1 }}>Sort</span>
              <span style={{ fontSize:8, color:"#5a4820" }}>Click header</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, padding:"0 8px", borderRight:`1px solid ${C.border}` }}>
              <span style={{ fontSize:7.5, color:C.muted, letterSpacing:1 }}>Resize</span>
              <span style={{ fontSize:8, color:"#5a4820" }}>Drag header edge</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, padding:"0 8px" }}>
              <span style={{ fontSize:8, color:"#5a4820" }}>▲ border triangles = format</span>
            </div>
          </>
        )}

        {activeSheet === 0 && (
          /* NMG Graph mode ribbon */
          <>
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"0 10px", borderRight:`1px solid ${C.border}` }}>
              <span style={{ fontSize:7.5, color:C.muted, letterSpacing:1.5, textTransform:"uppercase" }}>Trunks</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 8px" }}>
              {NMG_TRUNKS.map(({name,color})=>(
                <div key={name} style={{ display:"flex", alignItems:"center", gap:3 }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:color,boxShadow:`0 0 4px ${color}88` }}/>
                  <span style={{ fontSize:7.5, color:C.muted, letterSpacing:.5 }}>{name}</span>
                </div>
              ))}
            </div>
            <div style={{ width:1, height:14, background:C.border, margin:"0 6px", flexShrink:0 }}/>
            <div style={{ display:"flex", alignItems:"center", gap:3 }}>
              <div style={{ width:16, height:4 }}><svg width={16} height={4}><line x1={0} y1={2} x2={16} y2={2} stroke="#e85010" strokeWidth={1.5} strokeDasharray="4,3"/></svg></div>
              <span style={{ fontSize:7.5, color:C.muted }}>Intercept</span>
            </div>
          </>
        )}

        {activeSheet === 2 && (
          /* 3D Planner mode ribbon — context indicator */
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0 10px" }}>
            <span style={{ fontSize:7.5, color:C.muted, letterSpacing:1.5, textTransform:"uppercase" }}>3D Planner</span>
            <div style={{ width:1, height:14, background:C.border }}/>
            <span style={{ fontSize:8, color:"#5a4820" }}>Drag canvas to orbit · Scroll to zoom · Click sphere to select · Shift+Drag = Y axis</span>
          </div>
        )}

        <div style={{ flex:1 }}/>

        {/* Mode selector chips — always visible */}
        <div style={{ display:"flex", alignItems:"center", gap:2, padding:"0 8px", borderLeft:`1px solid ${C.border}` }}>
          {[["NMG",0,"#e85010"],["Sheet",1,C.accent],["3D",2,"#00ffe0"]].map(([lbl,idx,col])=>(
            <button key={idx} onClick={()=>setActiveSheet(idx)} style={{
              background: activeSheet===idx?"rgba(255,255,255,.05)":"transparent",
              border:`1px solid ${activeSheet===idx?col:C.border}`,
              color:activeSheet===idx?col:C.muted, fontSize:8, padding:"2px 8px", borderRadius:2,
              cursor:"pointer", fontFamily:"inherit", letterSpacing:1, textTransform:"uppercase",
              transition:"all .12s",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* ── Macro-Canvas Row: Fraud Pane + Central Content Area ── */}
      <div style={{ display: "flex", flexDirection: "row", width: "100%", flex: 1, overflow: "hidden" }}>

        {/* Collapsible Fraud Detection Map & Scoring Planner Pane */}
        {fraudPaneOpen && (
          <FraudPlannerPane
            scores={fraudScores}
            setScores={setFraudScores}
            activeTargets={fraudTargets}
            setActiveTargets={setFraudTargets}
          />
        )}

        {/* Central Macro-Backdrop Canvas Area */}
        <div style={{
          flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
          opacity: fraudPaneOpen ? 0.82 : 1,
          filter: fraudPaneOpen ? "brightness(0.92)" : "none",
          transition: "opacity .25s, filter .25s",
          position: "relative",
        }}>
          {/* Watermark canvas backdrop depth layer — visible when fraud pane open */}
          {fraudPaneOpen && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
              background: "repeating-linear-gradient(0deg, transparent, transparent 25px, rgba(245,184,0,.018) 26px)",
              mixBlendMode: "overlay",
            }}/>
          )}
          {/* Sheet content — NMG=0, Sheet=1, 3D Planner=2 */}
          {activeSheet === 0 ? <NMGGraph />
            : activeSheet === 2 ? <MacroHard3DPlanner
                onCoordOutput={handleCoordOutput}
                fraudScores={fraudScores}
                flavorMode={flavorMode}
                flavorParams={{ lambda: lambdaParam, selectedFlavor, tParam }}
              />
            : renderSheet()}
        </div>
      </div>

      {/* Sheet tabs — NMG · Sheet 1 · 3D Planner */}
      <div style={{ background: "#090a12", borderTop: `1px solid ${C.borderHdr}`, display: "flex", alignItems: "stretch", flexShrink: 0, height: 26 }}>
        {[["NMG Graph",0,"#e85010"],["Sheet 1",1,C.accent],["3D Planner",2,"#00ffe0"]].map(([name,i,col]) => (
          <button key={name} onClick={() => setActiveSheet(i)} style={{
            background: activeSheet === i ? C.bgHdr : "transparent",
            border: "none", borderRight: `1px solid ${C.borderHdr}`,
            borderTop: `2px solid ${activeSheet === i ? col : "transparent"}`,
            color: activeSheet === i ? col : "#7a6030",
            fontSize: 9, padding: "0 16px", cursor: "pointer", fontFamily: "inherit",
            letterSpacing: 1.5, textTransform: "uppercase", transition: "all .12s",
          }}>{name}</button>
        ))}
        <div style={{ flex: 1 }}/>
      </div>

      {/* Status bar — LEGIBLE */}
      <div style={{ background: "#070809", borderTop: `1px solid ${C.border}`, padding: "2px 14px",
        display: "flex", alignItems: "center", gap: 20, fontSize: 9, color: C.muted, flexShrink: 0, letterSpacing: .5 }}>
        <span>{nC} cols · {nR} rows{filterText ? " · filtered" : ""}</span>
        {sortCol && <span style={{ color: C.hdrFg }}>Sort: {headers[sortCol.c]} {sortCol.dir === "asc" ? "▲" : "▼"}</span>}
        {statusStats && <>
          <span>SUM: <span style={{ color: C.hdrFg }}>{statusStats.sum}</span></span>
          <span>AVG: <span style={{ color: C.hdrFg }}>{statusStats.avg}</span></span>
        </>}
        <div style={{ flex: 1 }}/>
        <span style={{ color: "#4a3e20", letterSpacing: 2 }}>MARCOHARD v1.0 · NOT MICROSOFT</span>
      </div>

      {/* Formulas Registry Panel — floating overlay */}
      <FormulasPanel
        open={formulasPanelOpen}
        onClose={() => setFormulasPanelOpen(false)}
        outputsSaved={outputsSaved}
        onInjectFormula={(syntax, row) => {
          if (row?.action === "FLAVOR_MODE") {
            setFlavorMode(true);
            setFormulasPanelOpen(false);
            setActiveSheet(1);  // ensure Sheet tab is active to see formula bar
            return;
          }
          if (selCell && syntax) {
            setEditCell(selCell);
            setEditVal(syntax.startsWith("=") ? syntax : `=${syntax}`);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      />

      {/* Format popover */}
      {popover && (
        <FormatPanel type={popover.type} index={popover.index}
          label={popover.type === "col" ? `COL ${colLetter(popover.index)} — ${headers[popover.index] || ""}` : `ROW ${popover.index + 1}`}
          fmt={popover.type === "col" ? getCF(popover.index) : getRF(popover.index)}
          onUpdate={u => popover.type === "col"
            ? setColFmt(p => ({ ...p, [popover.index]: { ...DFMT, ...p[popover.index], ...u } }))
            : setRowFmt(p => ({ ...p, [popover.index]: { ...DFMT, ...p[popover.index], ...u } }))}
          onClose={() => setPopover(null)}
          ax={popover.ax} ay={popover.ay}
        />
      )}
    </div>
  );
}
