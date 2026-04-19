import { SCENARIO_MONOS, agentColorById, agentMono, AGENT_DISPLAY_NAMES } from '../utils/agentColors.js';

export default function SquadOverview({ squad }) {
  return (
    <div className="squad-overview">
      <div className="squad-overview-header">
        <div className="squad-mono">{SCENARIO_MONOS[squad.id] || (squad.label || '').slice(0, 2).toUpperCase()}</div>
        <div>
          <h2 className="squad-overview-title">{squad.label}</h2>
          {squad.description && <p className="squad-overview-description">{squad.description}</p>}
        </div>
      </div>

      {squad.agents?.length > 0 ? (
        <section>
          <h3 className="squad-overview-section-title">
            Scenario agents · {squad.agents.length}
          </h3>
          <div className="squad-agents-grid">
            {squad.agents.map((agent) => {
              const id = agent.id || agent.name;
              const color = agentColorById(id);
              const mono = agentMono(id);
              const name = agent.name || AGENT_DISPLAY_NAMES[id] || id;
              return (
                <div key={id} className="squad-agent-card">
                  <span
                    className="squad-agent-mono"
                    style={{
                      background: `color-mix(in oklch, ${color} 16%, var(--bg-inset))`,
                      color,
                    }}
                  >
                    {mono}
                  </span>
                  <div>
                    <div className="squad-agent-name">{name}</div>
                    {agent.role && <div className="squad-agent-role">{agent.role}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <p style={{ color: 'var(--fg-3)' }}>No agents configured for this scenario.</p>
      )}
    </div>
  );
}
