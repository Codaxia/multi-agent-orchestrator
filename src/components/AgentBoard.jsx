import { useState } from 'react';
import AgentCard from './AgentCard.jsx';
import AgentDetailPanel from './AgentDetailPanel.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { AGENT_ORDER, AGENT_DISPLAY_NAMES, agentMono } from '../utils/agentColors.js';

export default function AgentBoard({ project }) {
  const { data, error, loading } = usePolling(`/api/projects/${project.id}/agents`, 2500);
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
        <span className="state-error" role="alert">Failed to load agents: {error}</span>
      </div>
    );
  }

  const allAgents = data?.agents ?? [];
  const activeIds = new Set(AGENT_ORDER);
  const agents = allAgents.filter((a) => activeIds.has(a.id));
  const agentById = Object.fromEntries(agents.map((a) => [a.id, a]));
  const activeCount = agents.filter((a) => a.status === 'active').length;
  const doneCount = agents.filter((a) => a.status === 'done').length;
  const blockedCount = agents.filter((a) => a.status === 'blocked').length;
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  const pipelineAgents = AGENT_ORDER.map((id) => {
    const a = agentById[id];
    return {
      id,
      name: a?.name || AGENT_DISPLAY_NAMES[id] || id,
      status: a?.status || 'idle',
      mono: agentMono(id),
    };
  });

  const connectors = pipelineAgents.map((a, i) => {
    const next = pipelineAgents[i + 1];
    if (!next) return null;
    if (a.status === 'done' && next.status === 'active') return 'flowing';
    if (a.status === 'done' && next.status === 'done') return 'done';
    return 'idle';
  });

  return (
    <>
      <div className="view-head">
        <div>
          <div className="view-title">Pipeline</div>
          <div className="view-subtitle">
            {agents.length} agents · {doneCount} done · {activeCount} active{blockedCount > 0 ? ` · ${blockedCount} blocked` : ''}
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-tile">
            <div className="stat-value active">{activeCount}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value done">{doneCount}</div>
            <div className="stat-label">Done</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value blocked">{blockedCount}</div>
            <div className="stat-label">Blocked</div>
          </div>
        </div>
      </div>

      <div className="pipeline-card">
        <div className="pipeline-head">
          <div>
            <div className="pipeline-head-title">Current flow</div>
            <div className="pipeline-head-sub">Live pipeline state · synced from chat</div>
          </div>
        </div>
        <div className="pipeline-track">
          {pipelineAgents.map((a, i) => (
            <button
              key={a.id}
              type="button"
              className={`pipe-node ${a.status}`}
              onClick={() => agentById[a.id] && setSelectedAgentId(a.id)}
              disabled={!agentById[a.id]}
            >
              {connectors[i] && <span className={`pipe-connector ${connectors[i]}`} />}
              <div className="pipe-avatar">{a.mono}</div>
              <div className="pipe-name">{a.name}</div>
              <div className="pipe-status">{a.status}</div>
            </button>
          ))}
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

      {selectedAgent && (
        <div className="detail-overlay" onClick={() => setSelectedAgentId(null)} role="presentation">
          <AgentDetailPanel
            projectId={project.id}
            agent={selectedAgent}
            onClose={() => setSelectedAgentId(null)}
          />
        </div>
      )}
    </>
  );
}
