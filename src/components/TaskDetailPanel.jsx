import { useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { agentColorById, agentMono, AGENT_DISPLAY_NAMES, ACTIVITY_AGENT_COLORS } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';
import { sanitizeMarkedHtml } from '../utils/sanitize.js';
import Icon from './Icon.jsx';

function activityMono(name) {
  return String(name || '')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TaskDetailPanel({ task, onClose }) {
  const color = task.assignedAgent ? agentColorById(task.assignedAgent) : 'var(--fg-3)';
  const mono = task.assignedAgent ? agentMono(task.assignedAgent) : '—';
  const agentLabel = task.assignedAgent
    ? (AGENT_DISPLAY_NAMES[task.assignedAgent] ?? task.assignedAgent)
    : 'Unassigned';
  const moscowKey = task.priority === "Won't" ? 'Wont' : task.priority;

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <aside
      className="task-detail-panel"
      role="complementary"
      aria-label={`Task detail: ${task.title}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="panel-header">
        <div className="panel-header-main">
          <div className="panel-kicker-row">
            <span className="panel-kicker">Task · {task.id}</span>
            {task.priority && <span className={`moscow ${moscowKey}`}>{task.priority}</span>}
          </div>
          <h2 className="panel-title">{task.title}</h2>
          <p className="panel-subtitle">In <strong>{task.column}</strong></p>
        </div>
        <button className="panel-close" onClick={onClose} aria-label="Close details">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="panel-body">
        {task.assignedAgent && (
          <div className="panel-section">
            <div className="panel-section-title">Assigned agent</div>
            <div className="panel-agent-row">
              <div
                className="panel-avatar panel-avatar-sm"
                style={{
                  background: `color-mix(in oklch, ${color} 16%, var(--bg-inset))`,
                  color,
                }}
              >
                {mono}
              </div>
              <span className="panel-agent-name">{agentLabel}</span>
            </div>
          </div>
        )}

        {task.description && (
          <div className="panel-section">
            <div className="panel-section-title">Description</div>
            <div
              className="panel-markdown"
              dangerouslySetInnerHTML={{ __html: sanitizeMarkedHtml(marked.parse(task.description)) }}
            />
          </div>
        )}

        {task.acceptanceCriteria?.length > 0 && (
          <div className="panel-section">
            <div className="panel-section-title">
              Acceptance criteria
              <span className="panel-section-count">
                {task.acceptanceCriteria.filter((ac) => ac.done).length}/{task.acceptanceCriteria.length}
              </span>
            </div>
            <ul className="panel-criteria-list">
              {task.acceptanceCriteria.map((ac) => (
                <li key={ac.id} className={ac.done ? 'is-done' : ''}>
                  <span className="panel-check" aria-hidden="true">
                    {ac.done ? <Icon name="check" size={12} /> : null}
                  </span>
                  <span>{ac.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.subTasks?.length > 0 && (
          <div className="panel-section">
            <div className="panel-section-title">Sub-tasks</div>
            <ul className="panel-criteria-list">
              {task.subTasks.map((st) => (
                <li key={st.id} className={st.status === 'done' ? 'is-done' : ''}>
                  <span className="panel-check" aria-hidden="true">
                    {st.status === 'done' ? <Icon name="check" size={12} /> : null}
                  </span>
                  <span>{st.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.activity?.length > 0 && (
          <div className="panel-section">
            <div className="panel-section-title">Activity</div>
            <div className="panel-activity-timeline">
              {task.activity.map((entry, i) => {
                const c = ACTIVITY_AGENT_COLORS[entry.agent] ?? 'var(--fg-3)';
                return (
                  <div key={i} className="panel-activity-timeline-entry">
                    <div className="panel-activity-timeline-entry-meta">
                      <div
                        className="panel-avatar panel-avatar-xs"
                        style={{
                          background: `color-mix(in oklch, ${c} 16%, var(--bg-inset))`,
                          color: c,
                        }}
                      >
                        {activityMono(entry.agent)}
                      </div>
                      <span style={{ color: c, fontWeight: 600 }}>{entry.agent}</span>
                      <span style={{ marginLeft: 'auto' }}>
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </div>
                    <div>{entry.action}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
