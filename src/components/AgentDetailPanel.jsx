import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { AGENT_COLORS } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';

const STATUS_LABELS = {
  active: 'Active',
  done: 'Done',
  idle: 'Idle',
  blocked: 'Blocked',
};

// Configure marked for safe rendering
marked.setOptions({ breaks: true });

export default function AgentDetailPanel({ agent, onClose }) {
  const [markdownContent, setMarkdownContent] = useState(null);
  const [mdLoading, setMdLoading] = useState(true);
  const [mdError, setMdError] = useState(null);

  const agentColor = AGENT_COLORS[agent.id] ?? '#6c63ff';

  // ESC key closes the panel
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Fetch the agent definition markdown
  useEffect(() => {
    setMdLoading(true);
    setMdError(null);
    setMarkdownContent(null);

    fetch(`/api/agents/${encodeURIComponent(agent.id)}/definition`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMarkdownContent(marked.parse(data.content));
        setMdLoading(false);
      })
      .catch((err) => {
        setMdError(err.message);
        setMdLoading(false);
      });
  }, [agent.id]);

  return (
    <aside
      className="agent-detail-panel"
      role="complementary"
      aria-label={`Agent detail: ${agent.name}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Colored header */}
      <div className="agent-detail-header" style={{ background: agentColor }}>
        <div className="agent-detail-header-main">
          <h2 className="agent-detail-name">{agent.name}</h2>
          {agent.role && <p className="agent-detail-role">{agent.role}</p>}
          <span className="agent-detail-status-badge">
            {STATUS_LABELS[agent.status] ?? agent.status}
          </span>
        </div>
        <button
          className="panel-close-btn agent-detail-close-btn"
          onClick={onClose}
          aria-label="Fermer le panneau"
        >
          ×
        </button>
      </div>

      {/* Scrollable markdown body */}
      <div className="panel-body agent-detail-body">
        {mdLoading && (
          <div className="agent-detail-loading">
            <div className="state-spinner" role="status" aria-label="Loading definition" />
            <span>Chargement de la définition…</span>
          </div>
        )}
        {mdError && (
          <div className="agent-detail-error" role="alert">
            <p>Impossible de charger la définition de l'agent.</p>
            <p className="agent-detail-error-detail">{mdError}</p>
          </div>
        )}
        {markdownContent && (
          <div
            className="agent-detail-markdown"
            // Content comes exclusively from whitelisted .md files on the user's machine
            dangerouslySetInnerHTML={{ __html: markdownContent }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="panel-footer">
        <div className="agent-detail-last-action">
          <span className="agent-detail-last-action-label">Dernière action</span>
          <span>{agent.lastMessage}</span>
          {agent.updatedAt && (
            <span className="panel-activity-time" style={{ marginLeft: 6 }}>
              · {formatRelativeTime(agent.updatedAt)}
            </span>
          )}
        </div>
        <button className="panel-btn-close" onClick={onClose}>Fermer</button>
      </div>
    </aside>
  );
}
