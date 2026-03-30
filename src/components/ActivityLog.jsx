import { useState } from 'react';
import { usePolling } from '../hooks/usePolling.js';
import { ACTIVITY_AGENT_COLORS } from '../utils/agentColors.js';
import { formatRelativeTime } from '../utils/time.js';

const ALL_AGENTS = Object.keys(ACTIVITY_AGENT_COLORS);

export default function ActivityLog({ projectId }) {
  const { data, error, loading } = usePolling(`/api/projects/${projectId}/activity`, 5000);
  const [activeFilter, setActiveFilter] = useState(null);

  const entries = Array.isArray(data) ? data : [];

  // Only show filter chips for agents that have entries
  const presentAgents = ALL_AGENTS.filter((agent) => entries.some((e) => e.agent === agent));

  const filtered = activeFilter
    ? entries.filter((e) => e.agent === activeFilter)
    : entries;

  // Newest first
  const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (loading) {
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
      <h2 className="activity-log-title">Activity Log</h2>
      <p className="activity-log-subtitle">
        {entries.length} événements · Historique complet de la pipeline
      </p>

      {/* Filter chips by agent */}
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
              style={
                isActive
                  ? { background: color, borderColor: color, color: 'white' }
                  : { borderColor: color, color: color }
              }
              onClick={() => setActiveFilter(isActive ? null : agent)}
            >
              {agent}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="activity-log-timeline">
        {sorted.length === 0 ? (
          <p className="activity-log-empty">Aucun événement pour ce filtre.</p>
        ) : (
          sorted.map((entry) => {
            const color = ACTIVITY_AGENT_COLORS[entry.agent] ?? '#6c63ff';
            return (
              <div key={entry.id} className="activity-log-entry">
                <div className="activity-log-avatar" style={{ background: color }}>
                  {entry.agent.charAt(0)}
                </div>
                <div className="activity-log-content">
                  <span className="activity-log-agent" style={{ color }}>{entry.agent}</span>
                  <span className="activity-log-action">{entry.action}</span>
                  <span
                    className="activity-log-time"
                    title={new Date(entry.timestamp).toLocaleString()}
                  >
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
