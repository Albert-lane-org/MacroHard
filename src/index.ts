// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-14 | SEC Whistleblower No. 17684-273-411-436
// MacroHard Design Token System -- Phase 5 scaffold; full implementation in Phase 6.

export interface DesignToken {
  name: string;
  value: string | number;
  category: "color" | "typography" | "spacing" | "motion" | "shadow";
  description?: string;
}

export interface TokenSet {
  version: string;
  tokens: DesignToken[];
}

export function loadTokens(json: Record<string, unknown>): TokenSet {
  return {
    version: (json["version"] as string) ?? "0.1.0",
    tokens: (json["tokens"] as DesignToken[]) ?? [],
  };
}

export function getToken(set: TokenSet, name: string): DesignToken | undefined {
  return set.tokens.find((t) => t.name === name);
}
