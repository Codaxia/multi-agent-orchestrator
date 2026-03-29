import { useState } from 'react';
import AgentCard from './AgentCard.jsx';
import AgentDetailPanel from './AgentDetailPanel.jsx';
import { usePolling } from '../hooks/usePolling.js';

export default function AgentBoard({ apiBase = '' }) {
  const { data, error, loading } = usePolling(`/api${apiBase}/agents`, 2500);
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-spinner" role="status" aria-label="Loading agents" />
        <span>Loading agents…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-container">
        <span className="state-error" role="alert">
          Failed to load agents: {error}
        </span>
      </div>
    );
  }

  const agents = data?.agents ?? [];
  const activeCount = agents.filter((a) => a.status === 'active').length;
  const doneCount = agents.filter((a) => a.status === 'done').length;
  const blockedCount = agents.filter((a) => a.status === 'blocked').length;
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  return (
    <div className="agent-board-wrapper">
      <section className="workspace-panel" aria-label="Agent Pipeline Monitor">
        <div className="workspace-panel-head">
          <div>
            <p className="workspace-panel-eyebrow">Live orchestration view</p>
            <h2 className="agent-board-title">Agent Pipeline Monitor</h2>
            <p className="agent-board-subtitle">
              Surveille la pipeline en temps reel et ouvre un drawer sans casser la grille.
            </p>
          </div>
          <div className="workspace-stats">
            <span className="workspace-stat-pill is-done">{doneCount}/{agents.length} done</span>
            <span className="workspace-stat-pill is-active">{activeCount} active</span>
            <span className="workspace-stat-pill is-blocked">{blockedCount} blocked</span>
            <span className="workspace-stat-pill">Polling 2.5s</span>
          </div>
        </div>

        <div className="agent-grid">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgentId}
              onAgentClick={() => setSelectedAgentId(agent.id)}
            />
          ))}
        </div>
      </section>

      {selectedAgent && (
        <div className="detail-overlay" onClick={() => setSelectedAgentId(null)} role="presentation">
          <div className="detail-overlay-backdrop" />
          <AgentDetailPanel
            agent={selectedAgent}
            onClose={() => setSelectedAgentId(null)}
          />
        </div>
      )}
    </div>
  );
}
