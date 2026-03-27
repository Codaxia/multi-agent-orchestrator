import { useState } from 'react';

const NAV_LINKS = [
  { id: 'agents', label: 'Agent Pipeline', icon: '🤖' },
  { id: 'kanban', label: 'Task Kanban', icon: '📋' },
  { id: 'activity', label: 'Activity Log', icon: '📊' },
];

export default function Sidebar({ squads, selectedSquadId, selectedProject, currentView, onSquadClick, onProjectClick, onViewChange }) {
  const [collapsedSquads, setCollapsedSquads] = useState({});

  function toggleSquad(e, squadId) {
    e.stopPropagation();
    setCollapsedSquads((prev) => ({ ...prev, [squadId]: !prev[squadId] }));
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">C</div>
        <div className="sidebar-logo-info">
          <span className="sidebar-logo-text">Codaxia Agence IA</span>
          <span className="sidebar-logo-sub">Agent Orchestration</span>
        </div>
      </div>

      <div className="sidebar-squads-wrapper">
        <div className="sidebar-section-label">SQUADS IA</div>

        <nav className="sidebar-squads">
          {squads.map((squad) => {
            const isCollapsed = !!collapsedSquads[squad.id];
            const isSquadActive = selectedSquadId === squad.id;

            return (
              <div key={squad.id} className="squad-group">
                <button
                  className={`squad-header${isSquadActive ? ' active' : ''}`}
                  onClick={() => onSquadClick(squad.id)}
                >
                  <span className="squad-icon">{squad.icon}</span>
                  <span className="squad-label">{squad.label}</span>
                  <span className="squad-badge">
                    {squad.agents.length > 0 ? squad.agents.length : '—'}
                  </span>
                  <span
                    className="squad-chevron"
                    onClick={(e) => toggleSquad(e, squad.id)}
                    role="button"
                    aria-label={isCollapsed ? 'Développer' : 'Réduire'}
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
                          onClick={() => onProjectClick(project, squad.id)}
                        >
                          {isProjectActive && <span className="squad-project-dot" />}
                          <span className="squad-project-icon">📁</span>
                          {project.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <button className="squad-add-btn">
            <span>＋</span>
            Nouvelle Squad
          </button>
        </nav>
      </div>

      {selectedProject && (
        <nav className="sidebar-project-nav">
          <div className="sidebar-section-label">PROJET</div>
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              className={`sidebar-link${currentView === link.id ? ' active' : ''}`}
              onClick={() => onViewChange(link.id)}
              aria-current={currentView === link.id ? 'page' : undefined}
            >
              <span className="sidebar-link-icon" aria-hidden="true">{link.icon}</span>
              {link.label}
            </button>
          ))}
        </nav>
      )}

      <div className="sidebar-footer">
        Codaxia Pipeline v2.0
        <br />
        Multi-agent system
      </div>
    </aside>
  );
}
