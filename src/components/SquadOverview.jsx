const AGENT_ICONS = ['🎯', '📋', '🏗️', '💻', '🔍', '✅', '🔒', '🚀', '📊', '🧠'];

export default function SquadOverview({ squad, onCreateProjectClick }) {
  return (
    <div className="squad-overview">
      <div className="squad-overview-header">
        <div className="squad-overview-icon">{squad.icon}</div>
        <div className="squad-overview-header-text">
          <h2 className="squad-overview-title">{squad.label}</h2>
          <p className="squad-overview-description">{squad.description}</p>
        </div>
      </div>

      {squad.agents.length > 0 ? (
        <section className="squad-overview-section">
          <h3 className="squad-overview-section-title">
            Agents de la squad
            <span className="squad-overview-count">{squad.agents.length} agents</span>
          </h3>
          <div className="squad-agents-grid">
            {squad.agents.map((agent, index) => (
              <div key={agent.name} className="squad-agent-card">
                <span className="squad-agent-icon">{AGENT_ICONS[index] ?? '🤖'}</span>
                <div>
                  <div className="squad-agent-name">{agent.name}</div>
                  <div className="squad-agent-role">{agent.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="squad-overview-section">
          <p className="squad-overview-empty">Aucun agent configuré pour cette squad.</p>
        </section>
      )}

      <button className="squad-new-project-btn" onClick={onCreateProjectClick}>＋ Nouveau projet</button>
    </div>
  );
}
