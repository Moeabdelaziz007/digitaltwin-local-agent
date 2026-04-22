// src/lib/consensus/prompts/rules-engine.ts
export const RULE_ENGINE = {
  version: '1.0.0',
  branding: 'Digital Twin Venture Lab',
  protocols: {
    CODE_INTEGRITY: [
      'ALL async functions MUST have explicit return types.',
      'Strictly NO use of "any". Use "unknown" with type guards.',
      'Every route MUST validate session/auth before processing.'
    ],
    VENTURE_LOGIC: [
      'Every stage transition MUST pass through the Venture Sentinel.',
      'Revenue impact MUST be calculated at every synthesis step.',
      'Strategic retreats (rollbacks) are mandatory if score < 40.'
    ],
    SOVEREIGN_PRIVACY: [
      'NEVER log secrets, tokens, or PII.',
      'Local-first persistence via PocketBase is the primary data source.',
      'External API calls must be proxied through adapters.'
    ]
  }
} as const;

export function getSystemRules(category: keyof typeof RULE_ENGINE.protocols): string {
  return RULE_ENGINE.protocols[category]
    .map((rule, index) => `[RULE-${category}-${index + 1}]: ${rule}`)
    .join('\n');
}
