import { useState } from 'react';

const NAV_LINKS = [
  { id: 'agents', label: 'Agent Pipeline', icon: '🤖' },
  { id: 'kanban', label: 'Task Kanban', icon: '📋' },
  { id: 'activity', label: 'Activity Log', icon: '📊' },
  { id: 'recap', label: 'Recap', icon: '📝' },
];

export default function Sidebar({
  squads,
  selectedSquadId,
  selectedProject,
  currentView,
  onSquadClick,
  onProjectClick,
  onViewChange,
  onCreateProjectClick,
  isOpen,
  onClose,
}) {
  const [collapsedSquads, setCollapsedSquads] = useState({});

  function toggleSquad(event, squadId) {
    event.stopPropagation();
    setCollapsedSquads((prev) => ({ ...prev, [squadId]: !prev[squadId] }));
  }

  function handleSquadClick(squadId) {
    onSquadClick(squadId);
    onClose?.();
  }

  function handleProjectClick(projectId, squadId) {
    onProjectClick(projectId, squadId);
    onClose?.();
  }

  function handleViewChange(view) {
    onViewChange(view);
    onClose?.();
  }

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">DA</div>
        <div className="sidebar-logo-info">
          <span className="sidebar-logo-text">Dashboard Agents</span>
          <span className="sidebar-logo-sub">AI pipeline supervision</span>
        </div>
      </div>

      <div className="sidebar-squads-wrapper">
        <div className="sidebar-section-label">SCENARIOS</div>

        <nav className="sidebar-squads">
          {squads.map((squad) => {
            const isCollapsed = !!collapsedSquads[squad.id];
            const isSquadActive = selectedSquadId === squad.id;

            return (
              <div key={squad.id} className="squad-group">
                <button
                  className={`squad-header${isSquadActive ? ' active' : ''}`}
                  onClick={() => handleSquadClick(squad.id)}
                >
                  <span className="squad-icon">{squad.icon}</span>
                  <span className="squad-label">{squad.label}</span>
                  <span className="squad-badge">{squad.agents?.length ?? 0}</span>
                  <span
                    className="squad-chevron"
                    onClick={(event) => toggleSquad(event, squad.id)}
                    role="button"
                    aria-label={isCollapsed ? 'Developper' : 'Reduire'}
                  >
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="squad-projects">
                    {squad.projects.map((project) => {
                      const isProjectActive = selectedProject?.id === project.id;
                      return (
                        <button
                          key={project.id}
                          className={`squad-project-btn${isProjectActive ? ' active' : ''}`}
                          onClick={() => handleProjectClick(project.id, squad.id)}
                        >
                          {isProjectActive && <span className="squad-project-dot" />}
                          <span className="squad-project-icon">📁</span>
                          <span className="squad-project-main">
                            <span>{project.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <button className="squad-add-btn" onClick={onCreateProjectClick}>
            <span>＋</span>
            New Mission
          </button>
        </nav>
      </div>

      {selectedProject && (
        <nav className="sidebar-project-nav">
          <div className="sidebar-section-label">MISSION</div>
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              className={`sidebar-link${currentView === link.id ? ' active' : ''}`}
              onClick={() => handleViewChange(link.id)}
              aria-current={currentView === link.id ? 'page' : undefined}
            >
              <span className="sidebar-link-icon" aria-hidden="true">{link.icon}</span>
              {link.label}
            </button>
          ))}
        </nav>
      )}

      <div className="sidebar-footer">
        Dashboard Agents v1.0
        <br />
        AI pipeline supervision
      </div>
    </aside>
  );
}
