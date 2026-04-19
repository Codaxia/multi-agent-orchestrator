import Icon from './Icon.jsx';

const MISSION_LINKS = [
  { id: 'agents', label: 'Agents', icon: 'cpu' },
  { id: 'kanban', label: 'Tasks', icon: 'kanban' },
  { id: 'activity', label: 'Activity', icon: 'activity' },
  { id: 'recap', label: 'Recap', icon: 'file' },
];

export default function MissionTabs({ currentView, onViewChange }) {
  return (
    <div className="tabs-bar" aria-label="Mission views">
      <div className="segmented" role="tablist">
        {MISSION_LINKS.map((link) => {
          const isActive = currentView === link.id;
          return (
            <button
              key={link.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`seg-tab${isActive ? ' is-active' : ''}`}
              onClick={() => onViewChange(link.id)}
            >
              <Icon name={link.icon} size={13} />
              {link.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
