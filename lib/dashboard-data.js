const fs = require('fs');
const os = require('os');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SEEDS_DIR = path.join(DATA_DIR, 'seeds');
const RUNTIME_DIR = path.join(DATA_DIR, 'runtime');

const AGENTS_DEFINITIONS_DIR = process.env.CLAUDE_AGENTS_DIR
  || path.join(os.homedir(), '.claude', 'agents');

const AGENT_FILE_MAP = {
  orchestrator: '01-orchestrator.md',
  'pm-discovery': '02-pm-discovery.md',
  architect: '03-architect.md',
  developer: '04-developer.md',
  'cto-reviewer': '05-cto-reviewer.md',
  qa: '06-qa.md',
  security: '07-security.md',
  deploy: '08-deploy.md',
  estimation: '09-estimation.md',
};

const VALID_STATUSES = ['idle', 'active', 'done', 'blocked'];
const VALID_COLUMNS = ['Backlog', 'In Progress', 'In Review', 'QA', 'Done'];
const VALID_PRIORITIES = ['Must', 'Should', 'Could', "Won't"];
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const PROJECT_LOCKS = new Map();
const WORKSPACE_FILE = {
  seed: path.join(SEEDS_DIR, 'workspace.json'),
  runtime: path.join(RUNTIME_DIR, 'workspace.json'),
};

const DEFAULT_AGENT_BLUEPRINT = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    role: 'Pipeline coordinator',
    idleMessage: 'Waiting for a new chat brief',
  },
  {
    id: 'pm-discovery',
    name: 'PM Discovery',
    role: 'User Stories & scope',
    idleMessage: 'Waiting for scope from the chat handoff',
  },
  {
    id: 'architect',
    name: 'Architect',
    role: 'Architecture & tickets',
    idleMessage: 'Waiting for planning output',
  },
  {
    id: 'developer',
    name: 'Developer',
    role: 'Full-stack implementation',
    idleMessage: 'Waiting for implementation work',
  },
  {
    id: 'cto-reviewer',
    name: 'CTO Reviewer',
    role: 'Code review & mentoring',
    idleMessage: 'Waiting for a reviewable slice',
  },
  {
    id: 'qa',
    name: 'QA',
    role: 'Testing & validation',
    idleMessage: 'Waiting for a QA handoff',
  },
  {
    id: 'security',
    name: 'Security',
    role: 'OWASP audit',
    idleMessage: 'Waiting for a security review request',
  },
  {
    id: 'deploy',
    name: 'Deploy',
    role: 'Deployment & release',
    idleMessage: 'No release pending',
  },
  {
    id: 'estimation',
    name: 'Estimation',
    role: 'Effort & complexity',
    idleMessage: 'Waiting for scope before estimating',
  },
];

const DEFAULT_SQUAD_AGENTS = [
  { name: 'Orchestrateur', role: 'Coordination du pipeline' },
  { name: 'PM Discovery', role: 'Cadrage, user stories et scope' },
  { name: 'Architecte', role: 'Architecture et decoupage technique' },
  { name: 'Developer', role: 'Implementation full-stack' },
  { name: 'CTO Reviewer', role: 'Revue de code et mentoring' },
  { name: 'QA', role: 'Validation fonctionnelle et tests' },
  { name: 'Securite', role: 'Audit et bonnes pratiques OWASP' },
  { name: 'Deploiement', role: 'Mise en prod et release' },
  { name: 'Estimation', role: 'Complexite et chiffrage' },
  { name: 'Project Brain', role: 'Memoire et coordination projet' },
];

const LEGACY_DISCOVERED_PROJECT_DESCRIPTION = 'Projet local detecte automatiquement a partir des fichiers runtime.';

const DEFAULT_WORKSPACE = {
  squads: [
    {
      id: 'full-build',
      label: 'Full Build',
      icon: '🏗️',
      description: 'Pipeline complet de creation de projet from scratch, de la discovery au deploiement.',
      agents: DEFAULT_SQUAD_AGENTS,
      projects: [
        {
          id: 'codaxia',
          label: 'Codaxia Agent IA',
          description: 'Workspace principal de demonstration et de pilotage.',
        },
      ],
    },
    {
      id: 'support-ops',
      label: 'Support Ops',
      icon: '🔧',
      description: 'Squad generique pour les projets locaux de maintenance, support et experimentation.',
      agents: DEFAULT_SQUAD_AGENTS,
      projects: [
        {
          id: 'sample',
          label: 'Sample Client',
          description: 'Projet de demonstration minimal et public-safe.',
        },
      ],
    },
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureDataDirs() {
  ensureDir(DATA_DIR);
  ensureDir(SEEDS_DIR);
  ensureDir(RUNTIME_DIR);
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function slugify(label) {
  return String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'project';
}

function labelFromProjectId(projectId) {
  return String(projectId)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getProjectSuffix(projectId = 'codaxia') {
  return projectId === 'codaxia' ? '' : `-${projectId}`;
}

function getProjectFiles(projectId = 'codaxia') {
  const suffix = getProjectSuffix(projectId);

  return {
    agents: {
      legacy: path.join(DATA_DIR, `pipeline-status${suffix}.json`),
      seed: path.join(SEEDS_DIR, `pipeline-status${suffix}.json`),
      runtime: path.join(RUNTIME_DIR, `pipeline-status${suffix}.json`),
    },
    tasks: {
      legacy: path.join(DATA_DIR, `tasks${suffix}.json`),
      seed: path.join(SEEDS_DIR, `tasks${suffix}.json`),
      runtime: path.join(RUNTIME_DIR, `tasks${suffix}.json`),
    },
    activity: {
      legacy: path.join(DATA_DIR, `activity-log${suffix}.json`),
      seed: path.join(SEEDS_DIR, `activity-log${suffix}.json`),
      runtime: path.join(RUNTIME_DIR, `activity-log${suffix}.json`),
    },
  };
}

function buildBlankAgents() {
  const now = new Date().toISOString();
  return {
    agents: DEFAULT_AGENT_BLUEPRINT.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: 'idle',
      lastMessage: agent.idleMessage,
      updatedAt: now,
    })),
  };
}

function buildBlankTasks() {
  return { tasks: [] };
}

function buildBlankActivity() {
  return [];
}

function getFallbackData(kind) {
  if (kind === 'agents') {
    return buildBlankAgents();
  }

  if (kind === 'tasks') {
    return buildBlankTasks();
  }

  if (kind === 'activity') {
    return buildBlankActivity();
  }

  throw new Error(`Unknown fallback data kind: ${kind}`);
}

function ensureRuntimeFile(fileSet, fallbackData) {
  if (fs.existsSync(fileSet.runtime)) {
    return;
  }

  if (fs.existsSync(fileSet.legacy)) {
    fs.copyFileSync(fileSet.legacy, fileSet.runtime);
    return;
  }

  if (fs.existsSync(fileSet.seed)) {
    fs.copyFileSync(fileSet.seed, fileSet.runtime);
    return;
  }

  writeJSON(fileSet.runtime, fallbackData);
}

function ensureProjectFiles(projectId) {
  const projectFiles = getProjectFiles(projectId);
  ensureRuntimeFile(projectFiles.agents, getFallbackData('agents'));
  ensureRuntimeFile(projectFiles.tasks, getFallbackData('tasks'));
  ensureRuntimeFile(projectFiles.activity, getFallbackData('activity'));
  return projectFiles;
}

function normalizeWorkspace(workspace) {
  const next = clone(workspace && typeof workspace === 'object' ? workspace : DEFAULT_WORKSPACE);
  next.squads = Array.isArray(next.squads) ? next.squads : [];

  for (const squad of next.squads) {
    squad.agents = Array.isArray(squad.agents) && squad.agents.length > 0
      ? squad.agents
      : clone(DEFAULT_SQUAD_AGENTS);
    squad.projects = Array.isArray(squad.projects) ? squad.projects : [];

    squad.projects = squad.projects
      .filter((project) => project && project.id)
      .filter((project) => project.description !== LEGACY_DISCOVERED_PROJECT_DESCRIPTION)
      .map((project) => ({
        id: project.id,
        label: project.label || labelFromProjectId(project.id),
        description: project.description || '',
      }));
  }

  return next;
}

function ensureWorkspaceCatalog() {
  ensureDataDirs();

  if (!fs.existsSync(WORKSPACE_FILE.runtime)) {
    if (fs.existsSync(WORKSPACE_FILE.seed)) {
      fs.copyFileSync(WORKSPACE_FILE.seed, WORKSPACE_FILE.runtime);
    } else {
      writeJSON(WORKSPACE_FILE.runtime, DEFAULT_WORKSPACE);
    }
  }

  const workspace = normalizeWorkspace(readJSON(WORKSPACE_FILE.runtime));
  writeJSON(WORKSPACE_FILE.runtime, workspace);

  workspace.squads.forEach((squad) => {
    squad.projects.forEach((project) => {
      ensureProjectFiles(project.id);
    });
  });

  return workspace;
}

function getWorkspace() {
  return ensureWorkspaceCatalog();
}

function resolveProject(projectId, workspace = getWorkspace()) {
  for (const squad of workspace.squads) {
    for (const project of squad.projects) {
      if (project.id === projectId) {
        return { squad, project };
      }
    }
  }

  return null;
}

function createProject({ name, squadId, description = '' }) {
  const workspace = getWorkspace();
  const targetSquad = workspace.squads.find((squad) => squad.id === squadId) || workspace.squads[0];
  const baseId = slugify(name);

  let projectId = baseId;
  let suffix = 2;
  const existingIds = new Set(workspace.squads.flatMap((squad) => squad.projects.map((project) => project.id)));
  while (existingIds.has(projectId)) {
    projectId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const project = {
    id: projectId,
    label: name.trim(),
    description: description.trim(),
  };

  targetSquad.projects.push(project);
  writeJSON(WORKSPACE_FILE.runtime, workspace);
  ensureProjectFiles(projectId);

  return { workspace, project, squad: targetSquad };
}

async function withProjectLock(lockKey, task) {
  const previous = PROJECT_LOCKS.get(lockKey) || Promise.resolve();
  let release = null;
  const blocker = new Promise((resolve) => {
    release = resolve;
  });
  const gate = previous.catch(() => undefined).then(() => blocker);
  PROJECT_LOCKS.set(lockKey, gate);

  await previous.catch(() => undefined);

  try {
    return await task();
  } finally {
    release();
    if (PROJECT_LOCKS.get(lockKey) === gate) {
      PROJECT_LOCKS.delete(lockKey);
    }
  }
}

function appendActivityEntry(projectId, entry) {
  const files = ensureProjectFiles(projectId);
  const activity = readJSON(files.activity.runtime);
  activity.unshift(entry);
  writeJSON(files.activity.runtime, activity);
}

function updateAgent(projectId, agentId, updates) {
  const files = ensureProjectFiles(projectId);
  const data = readJSON(files.agents.runtime);
  const index = data.agents.findIndex((agent) => agent.id === agentId);
  if (index === -1) {
    return null;
  }

  data.agents[index] = {
    ...data.agents[index],
    ...updates,
    id: agentId,
    updatedAt: new Date().toISOString(),
  };

  writeJSON(files.agents.runtime, data);
  return data.agents[index];
}

function createTask(projectId, taskInput) {
  const files = ensureProjectFiles(projectId);
  const data = readJSON(files.tasks.runtime);
  const nextNumericId = data.tasks.reduce((max, task) => {
    const match = String(task.id || '').match(/^T(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  const now = new Date().toISOString();
  const task = {
    id: `T${String(nextNumericId).padStart(2, '0')}`,
    title: String(taskInput.title || '').trim(),
    description: String(taskInput.description || '').trim(),
    column: taskInput.column || 'Backlog',
    assignedAgent: taskInput.assignedAgent || 'pm-discovery',
    priority: taskInput.priority || 'Should',
    acceptanceCriteria: Array.isArray(taskInput.acceptanceCriteria) ? taskInput.acceptanceCriteria : [],
    subTasks: Array.isArray(taskInput.subTasks) ? taskInput.subTasks : [],
    activity: Array.isArray(taskInput.activity) ? taskInput.activity : [],
    updatedAt: now,
  };

  data.tasks.unshift(task);
  writeJSON(files.tasks.runtime, data);
  return task;
}

function writeProjectData(projectId, kind, data) {
  const files = ensureProjectFiles(projectId);
  writeJSON(files[kind].runtime, data);
}

function readProjectData(projectId, kind) {
  const files = ensureProjectFiles(projectId);
  return readJSON(files[kind].runtime);
}

module.exports = {
  AGENT_FILE_MAP,
  AGENTS_DEFINITIONS_DIR,
  DATA_DIR,
  DEFAULT_ALLOWED_ORIGINS,
  RUNTIME_DIR,
  SEEDS_DIR,
  VALID_COLUMNS,
  VALID_PRIORITIES,
  VALID_STATUSES,
  WORKSPACE_FILE,
  appendActivityEntry,
  buildBlankActivity,
  buildBlankAgents,
  buildBlankTasks,
  clone,
  createProject,
  createTask,
  ensureDataDirs,
  ensureProjectFiles,
  ensureWorkspaceCatalog,
  getProjectFiles,
  getWorkspace,
  labelFromProjectId,
  readProjectData,
  resolveProject,
  slugify,
  updateAgent,
  withProjectLock,
  writeJSON,
  writeProjectData,
};
