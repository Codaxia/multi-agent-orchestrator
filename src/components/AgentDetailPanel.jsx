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
const ALLOWED_HTML_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'ul',
]);

function isSafeHref(value) {
  return (
    value.startsWith('http://')
    || value.startsWith('https://')
    || value.startsWith('mailto:')
    || value.startsWith('#')
    || value.startsWith('/')
    || value.startsWith('./')
    || value.startsWith('../')
  );
}

function sanitizeNode(node, documentRef) {
  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return documentRef.createDocumentFragment();
  }

  const tagName = node.tagName.toLowerCase();
  if (!ALLOWED_HTML_TAGS.has(tagName)) {
    const fragment = documentRef.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      fragment.appendChild(sanitizeNode(child, documentRef));
    });
    return fragment;
  }

  const safeElement = documentRef.createElement(tagName);

  if (tagName === 'a') {
    const href = node.getAttribute('href') || '';
    if (href && isSafeHref(href)) {
      safeElement.setAttribute('href', href);
      safeElement.setAttribute('rel', 'noopener noreferrer');
      safeElement.setAttribute('target', '_blank');
    }
  }

  Array.from(node.childNodes).forEach((child) => {
    safeElement.appendChild(sanitizeNode(child, documentRef));
  });

  return safeElement;
}

function sanitizeMarkedHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;

  const safeRoot = document.createElement('div');
  Array.from(template.content.childNodes).forEach((child) => {
    safeRoot.appendChild(sanitizeNode(child, document));
  });

  return safeRoot.innerHTML;
}

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

// Configure marked for safe rendering
marked.setOptions({ breaks: true });

export default function AgentDetailPanel({ projectId, agent, onClose }) {
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
      <div className="agent-detail-header" style={{ background: agentColor }}>
        <div className="agent-detail-header-main">
          <span className="detail-kicker">Agent profile</span>
          <h2 className="agent-detail-name">{agent.name}</h2>
          {agent.role && <p className="agent-detail-role">{agent.role}</p>}
          <span className="agent-detail-status-badge">
            {STATUS_LABELS[agent.status] ?? agent.status}
          </span>
        </div>
        <button
          className="panel-close-btn agent-detail-close-btn"
          onClick={onClose}
          aria-label="Close details"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Scrollable markdown body */}
      <div className="panel-body agent-detail-body">
        {mdLoading && (
          <div className="agent-detail-loading">
            <div className="state-spinner" role="status" aria-label="Loading definition" />
            <span>Chargement de la definition...</span>
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
