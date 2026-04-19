import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { agentColorById, agentMono } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';
import { sanitizeMarkedHtml } from '../utils/sanitize.js';
import Icon from './Icon.jsx';

const STATUS_LABELS = {
  active: 'Active',
  done: 'Done',
  idle: 'Pending',
  blocked: 'Blocked',
  skipped: 'Skipped',
};

marked.setOptions({ breaks: true });

export default function AgentDetailPanel({ projectId, agent, onClose }) {
  const [markdownContent, setMarkdownContent] = useState(null);
  const [mdLoading, setMdLoading] = useState(true);
  const [mdError, setMdError] = useState(null);

  const color = agentColorById(agent.id);
  const mono = agentMono(agent.id);
  const status = agent.status || 'idle';

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setMdLoading(true);
    setMdError(null);
    setMarkdownContent(null);

    fetch(`/api/projects/${encodeURIComponent(projectId)}/agents/${encodeURIComponent(agent.id)}/definition`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('API returned a non-JSON response');
        }
        return res.json();
      })
      .then((data) => {
        const rendered = marked.parse(data.content);
        setMarkdownContent(sanitizeMarkedHtml(rendered));
        setMdLoading(false);
      })
      .catch((err) => {
        setMdError(err.message);
        setMdLoading(false);
      });
  }, [agent.id, projectId]);

  return (
    <aside
      className="agent-detail-panel"
      role="complementary"
      aria-label={`Agent detail: ${agent.name}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="panel-header panel-header-tinted"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklch, ${color} 14%, var(--bg-panel)) 0%, var(--bg-panel) 70%)`,
          borderBottomColor: `color-mix(in oklch, ${color} 18%, var(--border-soft))`,
        }}
      >
        <div
          className="panel-avatar"
          style={{
            background: `color-mix(in oklch, ${color} 22%, var(--bg-panel))`,
            color,
            boxShadow: `0 1px 0 color-mix(in oklch, ${color} 30%, transparent) inset`,
          }}
        >
          {mono}
        </div>
        <div className="panel-header-main">
          <span className="panel-kicker" style={{ color }}>Agent</span>
          <h2 className="panel-title">{agent.name}</h2>
          {agent.role && <p className="panel-subtitle">{agent.role}</p>}
        </div>
        <span className={`status-chip ${status}`} style={{ marginRight: 8 }}>
          {STATUS_LABELS[status] ?? status}
        </span>
        <button
          className="panel-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="panel-body">
        {mdLoading && (
          <div className="state-container" style={{ padding: '32px 0' }}>
            <div className="state-spinner" role="status" aria-label="Loading definition" />
            <span>Chargement de la définition…</span>
          </div>
        )}
        {mdError && (
          <div className="state-container" role="alert" style={{ padding: '24px 0' }}>
            <span className="state-error">Impossible de charger la définition de l'agent.</span>
            <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>{mdError}</span>
          </div>
        )}
        {markdownContent && (
          <div
            className="agent-detail-markdown"
            dangerouslySetInnerHTML={{ __html: markdownContent }}
          />
        )}
      </div>

      {agent.lastMessage && (
        <div className="panel-footer panel-footer-message">
          <div className="panel-footer-label">Dernière action</div>
          <div className="panel-footer-text">
            {agent.lastMessage}
            {agent.updatedAt && (
              <span className="panel-footer-time">
                · {formatRelativeTime(agent.updatedAt)}
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
