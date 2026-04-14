const MISSION_LINKS = [
  { id: 'agents', label: 'Agent Pipeline', icon: '🤖' },
  { id: 'kanban', label: 'Task Kanban', icon: '📋' },
  { id: 'activity', label: 'Activity Log', icon: '📊' },
  { id: 'recap', label: 'Recap', icon: '📝' },
];

export default function MissionTabs({ currentView, onViewChange }) {
  return (
    <nav className="mission-tabs" aria-label="Mission views">
      <div className="mission-tabs-track">
        {MISSION_LINKS.map((link) => {
          const isActive = currentView === link.id;
          return (
            <button
              key={link.id}
              type="button"
              className={`mission-tab${isActive ? ' active' : ''}`}
              onClick={() => onViewChange(link.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="mission-tab-icon" aria-hidden="true">{link.icon}</span>
              <span className="mission-tab-label">{link.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
