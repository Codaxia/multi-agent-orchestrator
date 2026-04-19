// Hue-based agent palette: shared chroma + lightness, only hue varies.
// All UI colors derive from AGENT_HUES via agentColor(hue).
export const AGENT_HUES = {
  'orchestrator': 172,
  'pm-discovery': 268,
  'architect': 220,
  'developer': 145,
  'cto-reviewer': 28,
  'qa': 0,
  'security': 340,
  'deploy': 240,
  'estimation': 38,
};

export const AGENT_MONOS = {
  'orchestrator': 'OR',
  'pm-discovery': 'PM',
  'architect': 'AR',
  'developer': 'DV',
  'cto-reviewer': 'CR',
  'qa': 'QA',
  'security': 'SE',
  'deploy': 'DP',
  'estimation': 'ES',
};

// Canonical pipeline order (left-to-right in the pipeline flow visualization).
// Note: 'estimation' is defined above (color/mono/name) so the todo-list-app
// historical project still renders its card correctly, but it's excluded from
// the active pipeline since estimation is skipped in the current workflow.
export const AGENT_ORDER = [
  'orchestrator',
  'pm-discovery',
  'architect',
  'developer',
  'cto-reviewer',
  'qa',
  'security',
  'deploy',
];

export const SCENARIO_MONOS = {
  'full-build': 'FB',
  'feature-ops': 'FO',
  'code-review': 'CR',
  'rework': 'RW',
};

export function agentColor(hue) {
  return `oklch(72% 0.13 ${hue})`;
}

export function agentColorById(id) {
  const hue = AGENT_HUES[id];
  return hue != null ? agentColor(hue) : 'var(--fg-3)';
}

export function agentMono(id) {
  if (AGENT_MONOS[id]) return AGENT_MONOS[id];
  // Fallback: first two letters of id, uppercased.
  return String(id || '').slice(0, 2).toUpperCase();
}

// ---- Back-compat exports (consumed by AgentDetailPanel, TaskDetailPanel, RecapView) ----
// These fall back to the oklch hue system internally so visuals stay consistent.

export const AGENT_COLORS = Object.fromEntries(
  Object.entries(AGENT_HUES).map(([id, hue]) => [id, agentColor(hue)])
);

export const AGENT_GRADIENTS = Object.fromEntries(
  Object.entries(AGENT_HUES).map(([id, hue]) => [
    id,
    `linear-gradient(150deg, oklch(70% 0.14 ${hue}) 0%, oklch(32% 0.08 ${hue}) 100%)`,
  ])
);

export const AGENT_DISPLAY_NAMES = {
  'orchestrator': 'Orchestrator',
  'pm-discovery': 'PM Discovery',
  'architect': 'Architect',
  'developer': 'Developer',
  'cto-reviewer': 'CTO Reviewer',
  'qa': 'QA',
  'security': 'Security',
  'deploy': 'Deploy',
  'estimation': 'Estimation',
};

// Keyed by display name (used in activity logs where the server sends the human name).
export const ACTIVITY_AGENT_COLORS = Object.fromEntries(
  Object.entries(AGENT_DISPLAY_NAMES).map(([id, name]) => [name, agentColor(AGENT_HUES[id])])
);

// A few legacy aliases that appeared in historical activity payloads.
ACTIVITY_AGENT_COLORS['Security Reviewer'] = agentColor(AGENT_HUES.security);
