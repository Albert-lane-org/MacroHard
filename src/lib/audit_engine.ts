// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-27
// TypeScript port of scripts/audit_score.py — MacroHard 3D Standard audit engine

const WEIGHTS = {
  colors: 0.30,
  typography: 0.25,
  spacing: 0.20,
  '3d-standard': 0.25,
} as const;

type TokenSet = Record<string, unknown>;

function scoreColors(tokens: TokenSet): number {
  const colors = (tokens['colors'] ?? {}) as Record<string, unknown>;
  const sovereign = (colors['sovereign'] ?? {}) as Record<string, unknown>;
  const std3d = (colors['3d-standard'] ?? {}) as Record<string, unknown>;
  const reqSov = ['primary', 'secondary', 'accent', 'text', 'surface'];
  const req3d = ['depth-0', 'depth-1', 'light-top', 'shadow'];
  const s = reqSov.filter(k => k in sovereign).length / reqSov.length;
  const d = req3d.filter(k => k in std3d).length / req3d.length;
  return (s + d) / 2;
}

function scoreTypography(tokens: TokenSet): number {
  const typo = (tokens['typography'] ?? {}) as Record<string, unknown>;
  const required = ['font-family', 'font-size', 'font-weight', 'line-height'];
  return required.filter(k => k in typo).length / required.length;
}

function scoreSpacing(tokens: TokenSet): number {
  const spacing = (tokens['spacing'] ?? {}) as Record<string, unknown>;
  return ['1', '2', '4', '8', '16'].filter(k => k in spacing).length / 5;
}

function score3d(tokens: TokenSet): number {
  const std = (tokens['3d-standard'] ?? {}) as Record<string, unknown>;
  const required = ['isometric-angle-x', 'isometric-angle-y', 'elevation-scale', 'shadow-offset-x'];
  return required.filter(k => k in std).length / required.length;
}

export interface AuditScores {
  colors: number;
  typography: number;
  spacing: number;
  '3d-standard': number;
}

export interface AuditResult {
  total: number;
  percent: number;
  scores: AuditScores;
  weights: typeof WEIGHTS;
  status: 'PASS' | 'WARN' | 'FAIL';
}

export function computeScore(tokens: TokenSet): AuditResult {
  const scores: AuditScores = {
    colors: scoreColors(tokens),
    typography: scoreTypography(tokens),
    spacing: scoreSpacing(tokens),
    '3d-standard': score3d(tokens),
  };
  const total =
    scores.colors * WEIGHTS.colors +
    scores.typography * WEIGHTS.typography +
    scores.spacing * WEIGHTS.spacing +
    scores['3d-standard'] * WEIGHTS['3d-standard'];
  const rounded = Math.round(total * 10000) / 10000;
  return {
    total: rounded,
    percent: Math.round(rounded * 1000) / 10,
    scores,
    weights: WEIGHTS,
    status: rounded >= 0.8 ? 'PASS' : rounded >= 0.6 ? 'WARN' : 'FAIL',
  };
}
