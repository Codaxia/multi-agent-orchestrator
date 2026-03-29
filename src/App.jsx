import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import AgentBoard from './components/AgentBoard.jsx';
import TaskKanban from './components/TaskKanban.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import SquadOverview from './components/SquadOverview.jsx';

const DASHBOARD_SELECTION_KEY = 'codaxia-dashboard-selection';
const DEFAULT_SELECTION = {
  squadId: 'full-build',
  projectId: 'codaxia',
  view: 'agents',
};

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

function readStoredSelection() {
  if (typeof window === 'undefined') {
    return DEFAULT_SELECTION;
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_SELECTION_KEY);
    if (!raw) {
      return DEFAULT_SELECTION;
    }

    const parsed = JSON.parse(raw);
    return {
      squadId: parsed.squadId || DEFAULT_SELECTION.squadId,
      projectId: parsed.projectId ?? DEFAULT_SELECTION.projectId,
      view: parsed.view || DEFAULT_SELECTION.view,
    };
  } catch {
    return DEFAULT_SELECTION;
  }
}

export default function App() {
  const initialSelection = readStoredSelection();
  const [selectedSquadId, setSelectedSquadId] = useState(initialSelection.squadId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialSelection.projectId);
  const [currentView, setCurrentView] = useState(initialSelection.view);

  const selectedSquad = SQUADS.find((s) => s.id === selectedSquadId) ?? null;
  const selectedProject = selectedSquad?.projects.find((project) => project.id === selectedProjectId) ?? null;
  const headerTitle = selectedProject
    ? `${selectedSquad?.label} / ${selectedProject.label}`
    : selectedSquad?.label ?? 'Dashboard';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      DASHBOARD_SELECTION_KEY,
      JSON.stringify({
        squadId: selectedSquadId,
        projectId: selectedProjectId,
        view: currentView,
      }),
    );
  }, [selectedSquadId, selectedProjectId, currentView]);

  function handleSquadClick(squadId) {
    setSelectedSquadId(squadId);
    setSelectedProjectId(null);
  }

  function handleProjectClick(project, squadId) {
    setSelectedSquadId(squadId);
    setSelectedProjectId(project.id);
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
