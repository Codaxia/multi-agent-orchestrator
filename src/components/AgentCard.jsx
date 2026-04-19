import { agentColorById, agentMono, AGENT_DISPLAY_NAMES } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';

export default function AgentCard({ agent, isSelected, onAgentClick }) {
  const { id, name, status, lastMessage, role, duration, updatedAt } = agent;
  const color = agentColorById(id);
  const mono = agentMono(id);
  const displayName = name || AGENT_DISPLAY_NAMES[id] || id;
  const footer = updatedAt ? formatRelativeTime(updatedAt) : duration;
  return (
    <button
      type="button"
      className="agent-card"
      onClick={(e) => { e.stopPropagation(); onAgentClick?.(); }}
      aria-pressed={isSelected || undefined}
    >
      <div className="ac-row">
        <div
          className="ac-avatar"
          style={{
            background: `color-mix(in oklch, ${color} 16%, var(--bg-inset))`,
            color,
          }}
        >
          {mono}
        </div>
        <div className="ac-info">
          <div className="ac-name">{displayName}</div>
          {role && <div className="ac-role">{role}</div>}
        </div>
        <span className={`status-chip ${status || 'idle'}`}>{status === 'idle' || !status ? 'Pending' : status}</span>
      </div>
      {lastMessage && <div className="ac-message">{lastMessage}</div>}
      {footer && (
        <div className="ac-foot">
          <span>Last action</span>
          <span className="ac-dur">{footer}</span>
        </div>
      )}
    </button>
  );
}
