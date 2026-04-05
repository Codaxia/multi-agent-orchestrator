import { useState } from 'react';
import { usePolling } from '../hooks/usePolling.js';
import { ACTIVITY_AGENT_COLORS } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';

const ALL_AGENTS = Object.keys(ACTIVITY_AGENT_COLORS);

const TYPE_CONFIG = {
  command:  { label: 'CMD',      icon: '$',  cls: 'type-command'  },
  test:     { label: 'TEST',     icon: '✓',  cls: 'type-test'     },
  file:     { label: 'FILE',     icon: '▤',  cls: 'type-file'     },
  error:    { label: 'ERROR',    icon: '✗',  cls: 'type-error'    },
  decision: { label: 'DECISION', icon: '◆',  cls: 'type-decision' },
  info:     { label: 'INFO',     icon: 'i',  cls: 'type-info'     },
};

export default function ActivityLog({ projectId }) {
  const { data, error, loading } = usePolling(`/api/projects/${projectId}/activity`, 5000);
  const [activeFilter, setActiveFilter] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const entries = Array.isArray(data) ? data : [];
  const presentAgents = ALL_AGENTS.filter((agent) => entries.some((e) => e.agent === agent));
  const filtered = activeFilter ? entries.filter((e) => e.agent === activeFilter) : entries;
  const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  function toggleExpand(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading && entries.length === 0) {
    return (
      <div className="state-container">
        <div className="state-spinner" role="status" aria-label="Loading activity" />
        <span>Loading activity…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-container">
        <span className="state-error" role="alert">Failed to load activity: {error}</span>
      </div>
    );
  }

  return (
    <section aria-label="Pipeline Activity Log">
      <div className="activity-log-header-row">
        <div>
          <h2 className="activity-log-title">Activity Log</h2>
          <p className="activity-log-subtitle">
            {entries.length} événements · Historique complet de la pipeline
          </p>
        </div>
      </div>

      <div className="activity-filter-chips" role="group" aria-label="Filtrer par agent">
        <button
          className={`filter-chip${!activeFilter ? ' active' : ''}`}
          onClick={() => setActiveFilter(null)}
        >
          Tous
        </button>
        {presentAgents.map((agent) => {
          const color = ACTIVITY_AGENT_COLORS[agent];
          const isActive = activeFilter === agent;
          return (
            <button
              key={agent}
              className={`filter-chip${isActive ? ' active' : ''}`}
              style={isActive ? { background: color, borderColor: color, color: 'white' } : { borderColor: color, color: color }}
              onClick={() => setActiveFilter(isActive ? null : agent)}
            >
              {agent}
            </button>
          );
        })}
      </div>

      <div className="activity-log-timeline">
        {sorted.length === 0 ? (
          <p className="activity-log-empty">Aucun événement pour ce filtre.</p>
        ) : (
          sorted.map((entry) => {
            const color = ACTIVITY_AGENT_COLORS[entry.agent] ?? '#6c63ff';
            const typeConfig = entry.type ? TYPE_CONFIG[entry.type] : null;
            const isExpanded = expandedIds.has(entry.id);
            const hasDetail = !!entry.detail;

            return (
              <div key={entry.id} className="activity-log-entry">
                <div className="activity-log-avatar" style={{ background: color }}>
                  {entry.agent.charAt(0)}
                </div>
                <div className="activity-log-content">
                  <div className="activity-log-meta">
                    <span className="activity-log-agent" style={{ color }}>{entry.agent}</span>
                    {typeConfig && (
                      <span className={`activity-type-badge ${typeConfig.cls}`}>
                        <span className="activity-type-icon">{typeConfig.icon}</span>
                        {typeConfig.label}
                      </span>
                    )}
                    <span
                      className="activity-log-time"
                      title={new Date(entry.timestamp).toLocaleString()}
                    >
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>

                  <span className="activity-log-action">{entry.action}</span>

                  {hasDetail && (
                    <button
                      className="activity-toggle-btn"
                      onClick={() => toggleExpand(entry.id)}
                      aria-expanded={isExpanded}
                    >
                      <span className="activity-toggle-chevron">{isExpanded ? '▲' : '▼'}</span>
                      {isExpanded ? 'Réduire' : 'Voir détails'}
                    </button>
                  )}

                  {hasDetail && isExpanded && (
                    <pre className={`activity-detail${entry.type === 'command' || entry.type === 'test' ? ' is-code' : ''}`}>
                      {entry.detail}
                    </pre>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
