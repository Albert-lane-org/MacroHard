// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-09 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P9-02: Token-driven chrome. index.html previously hardcoded the
// --bg/--surface/--accent/etc. CSS custom properties as literal hex values,
// duplicating design-tokens.json with no way for those values to drift back
// into sync. This module makes the chrome read the tokens at runtime instead
// — "every single UI detail user-configurable" starts with the chrome not
// being hardcoded.

export interface DesignTokens {
  _meta: { version: string; standard: string; sec_ref: string };
  colors: Record<string, Record<string, string>>;
  typography: Record<string, Record<string, string | number>>;
  spacing: Record<string, string>;
  "border-radius"?: Record<string, string>;
  shadows: Record<string, string>;
  "3d-standard": Record<string, number>;
}

/// Maps a chrome CSS custom property to its dotted path in design-tokens.json.
const CHROME_VAR_MAP: Record<string, string> = {
  "--bg": "colors.sovereign.primary",
  "--surface": "colors.sovereign.surface",
  "--border": "colors.sovereign.border",
  "--text": "colors.sovereign.text",
  "--dim": "colors.sovereign.text-dim",
  "--accent": "colors.sovereign.accent",
  "--success": "colors.sovereign.success",
  "--warn": "colors.sovereign.warning",
  "--danger": "colors.sovereign.danger",
};

function getPath(obj: unknown, path: string): string | number | undefined {
  return path.split(".").reduce<unknown>((node, key) => {
    if (node == null || typeof node !== "object") return undefined;
    return (node as Record<string, unknown>)[key];
  }, obj) as string | number | undefined;
}

/**
 * Apply design-tokens.json onto CSS custom properties on `root`.
 * Returns the list of CSS variables that were actually set, so callers
 * (e.g. a token-editing UI) can tell what took effect.
 */
export function applyChromeTokens(
  tokens: DesignTokens,
  root: HTMLElement = document.documentElement
): string[] {
  const applied: string[] = [];

  for (const [cssVar, tokenPath] of Object.entries(CHROME_VAR_MAP)) {
    const value = getPath(tokens, tokenPath);
    if (typeof value === "string" && value.length > 0) {
      root.style.setProperty(cssVar, value);
      applied.push(cssVar);
    }
  }

  for (const [key, value] of Object.entries(tokens.spacing ?? {})) {
    root.style.setProperty(`--space-${key}`, String(value));
    applied.push(`--space-${key}`);
  }

  const fontSizes = tokens.typography?.["font-size"] ?? {};
  for (const [key, value] of Object.entries(fontSizes)) {
    root.style.setProperty(`--font-size-${key}`, String(value));
    applied.push(`--font-size-${key}`);
  }

  return applied;
}

/**
 * Override a single chrome variable at runtime (e.g. from a live token
 * editor) without waiting for a full tokens reload.
 */
export function setChromeVar(
  cssVar: string,
  value: string,
  root: HTMLElement = document.documentElement
): void {
  root.style.setProperty(cssVar, value);
}

/** The full set of chrome variable names this module knows how to drive. */
export function chromeVarNames(): string[] {
  return Object.keys(CHROME_VAR_MAP);
}
