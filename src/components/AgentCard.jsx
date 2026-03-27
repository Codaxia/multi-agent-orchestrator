const AGENT_ICONS = {
  orchestrator: '🎯',
  'pm-discovery': '📋',
  architect: '🏗️',
  developer: '💻',
  'cto-reviewer': '🔍',
  qa: '🧪',
  security: '🔒',
  deploy: '🚀',
  estimation: '⏱️',
};

const STATUS_LABELS = {
  active: 'Active',
  done: 'Done',
  idle: 'Idle',
  blocked: 'Blocked',
};

export default function AgentCard({ agent, isSelected, onAgentClick }) {
  const { id, name, status, lastMessage } = agent;
  const icon = AGENT_ICONS[id] ?? '🤖';
  const statusClass = `status-${status}`;
  const badgeClass = `agent-status-badge badge-${status}`;

  return (
    <article
      className={`agent-card ${statusClass}${isSelected ? ' agent-card-selected' : ''}`}
      aria-label={`${name} — ${status}`}
      onClick={(e) => { e.stopPropagation(); onAgentClick?.(); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onAgentClick?.(); } }}
      style={{ cursor: 'pointer' }}
    >
      <div className="agent-card-header">
        <span className="agent-card-icon" aria-hidden="true">{icon}</span>
        <span className="agent-name">{name}</span>
        <span className={badgeClass}>{STATUS_LABELS[status] ?? status}</span>
      </div>

      <div className="agent-last-message">
        <div className="agent-last-message-label">Last action</div>
        {lastMessage}
      </div>
    </article>
  );
}
