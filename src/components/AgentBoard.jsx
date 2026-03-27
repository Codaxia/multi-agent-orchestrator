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
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  return (
    // Clicking outside the panel closes it
    <div
      className="agent-board-wrapper"
      onClick={() => setSelectedAgentId(null)}
    >
      <div className="agent-board-main">
        <section aria-label="Agent Pipeline Monitor">
          <h2 className="agent-board-title">Agent Pipeline Monitor</h2>
          <p className="agent-board-subtitle">
            {doneCount}/{agents.length} agents done
            {activeCount > 0 && ` · ${activeCount} active`}
            {' '}· Polling every 2.5s · Cliquer pour les détails
          </p>

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
      </div>

      {/* Slide-in agent detail panel */}
      {selectedAgent && (
        <AgentDetailPanel
          agent={selectedAgent}
          onClose={() => setSelectedAgentId(null)}
        />
      )}
    </div>
  );
}
