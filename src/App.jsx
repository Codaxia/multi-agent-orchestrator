import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import AgentBoard from './components/AgentBoard.jsx';
import TaskKanban from './components/TaskKanban.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import SquadOverview from './components/SquadOverview.jsx';

const SQUADS = [
  {
    id: 'full-build',
    label: 'Full Build',
    icon: '🏗️',
    description: 'Squad complète de développement produit — de la discovery au déploiement.',
    agents: [
      'Orchestrateur', 'PM', 'Architecte', 'Dev Senior', 'CTO Reviewer',
      'QA', 'Sécurité', 'Déploiement', 'Estimation', 'Project Brain',
    ],
    projects: [
      { id: 'demo', label: 'Projet démo', apiBase: '' },
    ],
  },
  {
    id: 'maintenance-web',
    label: 'Maintenance Web',
    icon: '🔧',
    description: 'Agents spécialisés pour plateformes existantes — à configurer.',
    agents: [],
    projects: [
      { id: 'atuvu', label: 'atuvu', apiBase: '/atuvu' },
    ],
  },
];

export default function App() {
  const [selectedSquadId, setSelectedSquadId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentView, setCurrentView] = useState('agents');

  const selectedSquad = SQUADS.find((s) => s.id === selectedSquadId) ?? null;

  function handleSquadClick(squadId) {
    setSelectedSquadId(squadId);
    setSelectedProject(null);
  }

  function handleProjectClick(project, squadId) {
    setSelectedSquadId(squadId);
    setSelectedProject(project);
    setCurrentView('agents');
  }

  return (
    <div className="app-layout">
      <Sidebar
        squads={SQUADS}
        selectedSquadId={selectedSquadId}
        selectedProject={selectedProject}
        currentView={currentView}
        onSquadClick={handleSquadClick}
        onProjectClick={handleProjectClick}
        onViewChange={setCurrentView}
      />
      <div className="app-main">
        <Header
          squadIcon={selectedSquad?.icon}
          squadName={selectedSquad?.label}
          projectName={selectedProject?.label}
        />
        <main className="app-content">
          {!selectedSquad && (
            <div className="squad-welcome">
              <span className="squad-welcome-icon">🤖</span>
              <p>Sélectionnez une Squad IA pour commencer.</p>
            </div>
          )}
          {selectedSquad && !selectedProject && (
            <SquadOverview squad={selectedSquad} />
          )}
          {selectedProject && currentView === 'agents' && (
            <AgentBoard key={selectedProject.id} apiBase={selectedProject.apiBase} />
          )}
          {selectedProject && currentView === 'kanban' && (
            <TaskKanban key={selectedProject.id} apiBase={selectedProject.apiBase} />
          )}
          {selectedProject && currentView === 'activity' && (
            <ActivityLog key={selectedProject.id} apiBase={selectedProject.apiBase} />
          )}
        </main>
      </div>
    </div>
  );
}
