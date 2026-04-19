import { agentColorById, agentMono, AGENT_DISPLAY_NAMES } from '../utils/agentColors.js';

export default function TaskCard({ task, isSelected, onTaskClick }) {
  const { title, description, assignedAgent, priority } = task;
  const moscowKey = priority === "Won't" ? 'Wont' : priority;
  const agentColor = assignedAgent ? agentColorById(assignedAgent) : 'var(--fg-3)';
  const mono = assignedAgent ? agentMono(assignedAgent) : '—';
  const agentName = assignedAgent ? (AGENT_DISPLAY_NAMES[assignedAgent] || assignedAgent) : '';
  const desc = description ? description.replace(/[#*`_~>\[\]]/g, '').slice(0, 120).trim() : '';

  return (
    <button
      type="button"
      className="task-card"
      onClick={(e) => { e.stopPropagation(); onTaskClick?.(); }}
      aria-pressed={isSelected || undefined}
    >
      <div className="task-title">{title}</div>
      {desc && <div className="task-desc">{desc}{description.length > 120 ? '…' : ''}</div>}
      <div className="task-foot">
        {assignedAgent && (
          <span className="task-agent">
            <span
              className="task-agent-av"
              style={{
                background: `color-mix(in oklch, ${agentColor} 18%, var(--bg-inset))`,
                color: agentColor,
              }}
            >
              {mono}
            </span>
            {agentName}
          </span>
        )}
        {priority && <span className={`moscow ${moscowKey}`}>{priority}</span>}
      </div>
    </button>
  );
}
