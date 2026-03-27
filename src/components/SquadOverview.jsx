export default function SquadOverview({ squad }) {
  return (
    <div className="squad-overview">
      <div className="squad-overview-header">
        <span className="squad-overview-icon">{squad.icon}</span>
        <div>
          <h2 className="squad-overview-title">{squad.label}</h2>
          <p className="squad-overview-desc">{squad.description}</p>
        </div>
      </div>

      <div className="squad-overview-section">
        <h3 className="squad-overview-section-title">
          Agents de la squad
          {squad.agents.length > 0 && (
            <span className="squad-overview-count">{squad.agents.length}</span>
          )}
        </h3>
        {squad.agents.length > 0 ? (
          <div className="squad-agent-chips">
            {squad.agents.map((agent) => (
              <span key={agent} className="squad-agent-chip">{agent}</span>
            ))}
          </div>
        ) : (
          <p className="squad-overview-empty">Aucun agent configuré pour cette squad.</p>
        )}
      </div>

      <button className="squad-overview-add-btn">＋ Nouveau projet</button>
    </div>
  );
}
