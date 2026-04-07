import { useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { AGENT_COLORS, AGENT_DISPLAY_NAMES, ACTIVITY_AGENT_COLORS } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';
import { sanitizeMarkedHtml } from '../utils/sanitize.js';


const MOSCOW_CLASSES = {
  Must: 'moscow-must',
  Should: 'moscow-should',
  Could: 'moscow-could',
  "Won't": 'moscow-wont',
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="panel-close-icon">
      <path
        d="M5 5L15 15M15 5L5 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function TaskDetailPanel({ task, onClose }) {
  const agentColor = AGENT_COLORS[task.assignedAgent] ?? '#6c63ff';
  const agentLabel = AGENT_DISPLAY_NAMES[task.assignedAgent] ?? task.assignedAgent;
  const moscowClass = MOSCOW_CLASSES[task.priority] ?? 'moscow-wont';

  // ESC key closes the panel
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    // Stop propagation so clicks inside don't bubble to the kanban's "close" handler
    <aside
      className="task-detail-panel"
      role="complementary"
      aria-label={`Task detail: ${task.title}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="panel-accent-bar" style={{ background: agentColor }} />

      <div className="panel-header">
        <div className="panel-header-main">
          <span className="detail-kicker">Task detail</span>
          <span className={`moscow-badge ${moscowClass}`}>{task.priority}</span>
          <h2 className="panel-title">{task.title}</h2>
        </div>
        <button className="panel-close-btn" onClick={onClose} aria-label="Close details">
          <CloseIcon />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="panel-breadcrumb">
        <span>{task.column}</span>
        <span className="panel-breadcrumb-sep">›</span>
        <span className="panel-breadcrumb-id">{task.id}</span>
      </div>

      {/* Scrollable body */}
      <div className="panel-body">

        {/* Assigned agent */}
        <div className="panel-section">
          <div className="panel-section-label">Assigned agent</div>
          <div className="panel-agent">
            <div className="panel-agent-avatar" style={{ background: agentColor }}>
              {agentLabel.charAt(0)}
            </div>
            <span className="panel-agent-name">{agentLabel}</span>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="panel-section">
            <div className="panel-section-label">Description</div>
            <div className="panel-description" dangerouslySetInnerHTML={{ __html: sanitizeMarkedHtml(marked.parse(task.description)) }} />
          </div>
        )}

        {/* Acceptance Criteria */}
        {task.acceptanceCriteria?.length > 0 && (
          <div className="panel-section">
            <div className="panel-section-label">
              Acceptance Criteria
              <span className="panel-criteria-count">
                {task.acceptanceCriteria.filter((ac) => ac.done).length}/{task.acceptanceCriteria.length}
              </span>
            </div>
            <ul className="panel-criteria-list">
              {task.acceptanceCriteria.map((ac) => (
                <li key={ac.id} className={`panel-criteria-item${ac.done ? ' done' : ''}`}>
                  <input
                    type="checkbox"
                    id={ac.id}
                    checked={ac.done}
                    onChange={() => {}}
                    className="panel-criteria-checkbox"
                    readOnly
                  />
                  <label htmlFor={ac.id} className="panel-criteria-text">{ac.text}</label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sub-tasks */}
        {task.subTasks?.length > 0 && (
          <div className="panel-section">
            <div className="panel-section-label">Sub-tasks</div>
            <ul className="panel-subtask-list">
              {task.subTasks.map((st) => (
                <li key={st.id} className={`panel-subtask-item${st.status === 'done' ? ' done' : ''}`}>
                  <span className="panel-subtask-icon">{st.status === 'done' ? '✓' : '○'}</span>
                  <span className="panel-subtask-text">{st.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Activity */}
        {task.activity?.length > 0 && (
          <div className="panel-section">
            <div className="panel-section-label">Activity</div>
            <div className="panel-activity-timeline">
              {task.activity.map((entry, i) => {
                const color = ACTIVITY_AGENT_COLORS[entry.agent] ?? '#6c63ff';
                return (
                  <div key={i} className="panel-activity-entry">
                    <div className="panel-activity-avatar" style={{ background: color }}>
                      {entry.agent.charAt(0)}
                    </div>
                    <div className="panel-activity-content">
                      <span className="panel-activity-agent" style={{ color }}>{entry.agent}</span>
                      <span className="panel-activity-action">{entry.action}</span>
                      <span className="panel-activity-time" title={new Date(entry.timestamp).toLocaleString()}>
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="panel-footer">
        <button className="panel-btn-close" onClick={onClose}>Close</button>
      </div>
    </aside>
  );
}
