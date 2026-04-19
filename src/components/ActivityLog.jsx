import { useState } from 'react';
import { usePolling } from '../hooks/usePolling.js';
import { ACTIVITY_AGENT_COLORS } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';

const ALL_AGENTS = Object.keys(ACTIVITY_AGENT_COLORS);

function monogramOf(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export default function ActivityLog({ projectId }) {
  const { data, error, loading } = usePolling(`/api/projects/${projectId}/activity`, 5000);
  const [activeFilter, setActiveFilter] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const entries = Array.isArray(data) ? data : [];
  const counts = entries.reduce((acc, e) => { acc[e.agent] = (acc[e.agent] || 0) + 1; return acc; }, {});
  const presentAgents = ALL_AGENTS.filter((a) => counts[a]);
  const filtered = activeFilter ? entries.filter((e) => e.agent === activeFilter) : entries;
  const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  function toggle(id) {
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
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Activity</div>
          <div className="view-subtitle">
            {entries.length} events · live stream
          </div>
        </div>
      </div>

      <div className="activity-wrap">
        <div>
          <div className="filter-group-label">Agents</div>
          <button
            className={`filter-chip${!activeFilter ? ' is-active' : ''}`}
            onClick={() => setActiveFilter(null)}
          >
            <span className="filter-chip-dot" style={{ background: 'var(--fg-3)' }} />
            All activity
            <span className="count">{entries.length}</span>
          </button>
          {presentAgents.map((agent) => {
            const color = ACTIVITY_AGENT_COLORS[agent];
            const isActive = activeFilter === agent;
            return (
              <button
                key={agent}
                className={`filter-chip${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveFilter(isActive ? null : agent)}
              >
                <span className="filter-chip-dot" style={{ background: color }} />
                {agent}
                <span className="count">{counts[agent]}</span>
              </button>
            );
          })}
        </div>

        <div className="activity-card">
          {sorted.length === 0 ? (
            <div style={{ padding: '32px', color: 'var(--fg-4)', textAlign: 'center' }}>
              No events match this filter.
            </div>
          ) : (
            sorted.map((entry) => {
              const color = ACTIVITY_AGENT_COLORS[entry.agent] ?? 'var(--fg-3)';
              const isExpanded = expandedIds.has(entry.id);
              const hasDetail = !!entry.detail;
              const type = entry.type || 'info';
              return (
                <div key={entry.id} className="activity-entry">
                  <div className="activity-ts" title={new Date(entry.timestamp).toLocaleString()}>
                    {formatRelativeTime(entry.timestamp)}
                  </div>
                  <div
                    className="activity-av"
                    style={{
                      background: `color-mix(in oklch, ${color} 16%, var(--bg-inset))`,
                      color,
                    }}
                  >
                    {monogramOf(entry.agent)}
                  </div>
                  <div className="activity-body">
                    <div className="activity-meta">
                      <span className="activity-agent-name">{entry.agent}</span>
                      <span className={`type-badge type-${type}`}>{type}</span>
                    </div>
                    <div className="activity-action">{entry.action}</div>
                    {hasDetail && !isExpanded && (
                      <button className="activity-toggle" onClick={() => toggle(entry.id)}>
                        Show details
                      </button>
                    )}
                    {hasDetail && isExpanded && (
                      <>
                        <div className="activity-detail">{entry.detail}</div>
                        <button className="activity-toggle" onClick={() => toggle(entry.id)}>
                          Hide
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
