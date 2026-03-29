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
    description: 'Pipeline complet de creation de projet from scratch, de la discovery au deploiement.',
    agents: [
      { name: 'Orchestrateur', role: 'Coordination du pipeline' },
      { name: 'PM Discovery', role: 'Cadrage, user stories et scope' },
      { name: 'Architecte', role: 'Architecture et decoupage technique' },
      { name: 'Dev Senior', role: 'Implementation full-stack' },
      { name: 'CTO Reviewer', role: 'Revue de code et mentoring' },
      { name: 'QA', role: 'Validation fonctionnelle et tests' },
      { name: 'Securite', role: 'Audit et bonnes pratiques OWASP' },
      { name: 'Deploiement', role: 'Mise en prod et release' },
      { name: 'Estimation', role: 'Complexite et chiffrage' },
      { name: 'Project Brain', role: 'Memoire et coordination projet' },
    ],
    projects: [
      { id: 'codaxia', label: 'Codaxia Agent IA', apiBase: '' },
    ],
  },
  {
    id: 'maintenance-web',
    label: 'Maintenance Web',
    icon: '🔧',
    description: 'Agents specialises pour la maintenance de plateformes existantes.',
    agents: [],
    projects: [
      { id: 'atuvu', label: 'atuvu', apiBase: '/atuvu' },
    ],
  },
];

export default function App() {
  const [selectedSquadId, setSelectedSquadId] = useState('full-build');
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentView, setCurrentView] = useState('agents');

  const selectedSquad = SQUADS.find((s) => s.id === selectedSquadId) ?? null;
  const headerTitle = selectedProject
    ? `${selectedSquad?.label} / ${selectedProject.label}`
    : selectedSquad?.label ?? 'Dashboard';

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
        <Header title={headerTitle} />
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
