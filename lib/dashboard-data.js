const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SEEDS_DIR = path.join(DATA_DIR, 'seeds');
const RUNTIME_DIR = path.join(DATA_DIR, 'runtime');

const AGENTS_DEFINITIONS_DIR = process.env.AI_AGENTS_DIR
  || process.env.CLAUDE_AGENTS_DIR
  || path.join(__dirname, '..', 'agents', 'default');

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
const VALID_RECAP_TYPES = ['bug_fix', 'feature', 'refactor', 'code_review', 'security', 'deploy'];
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];
const DEMO_PROJECT_ID = 'demo';

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

const FULL_BUILD_AGENTS = [
  { name: 'Orchestrator', role: 'Pipeline coordination & scenario detection' },
  { name: 'PM Discovery', role: 'Scoping, user stories & prioritization' },
  { name: 'Architect', role: 'Architecture & technical breakdown' },
  { name: 'Developer', role: 'Full-stack implementation' },
  { name: 'CTO Reviewer', role: 'Code review & mentoring' },
  { name: 'QA', role: 'Testing & validation' },
  { name: 'Security', role: 'OWASP audit' },
  { name: 'Deploy', role: 'Deployment & release' },
  { name: 'Estimation', role: 'Effort & complexity estimation' },
];

const FEATURE_OPS_AGENTS = [
  { name: 'Orchestrator', role: 'Pipeline coordination & scenario detection' },
  { name: 'PM Discovery', role: 'Scope validation & AC definition (if task is vague)' },
  { name: 'Developer', role: 'Full-stack implementation (no commits)' },
  { name: 'CTO Reviewer', role: 'Code review & mentoring' },
  { name: 'QA', role: 'Browser testing & validation' },
  { name: 'Security', role: 'Targeted security check (activated by Orchestrator)' },
];

const CODE_REVIEW_AGENTS = [
  { name: 'Orchestrator', role: 'Pipeline coordination & scenario detection' },
  { name: 'CTO Reviewer', role: 'Code review & mentoring' },
  { name: 'Security', role: 'OWASP audit' },
  { name: 'QA', role: 'Testing & validation' },
  { name: 'Developer', role: 'Fix issues found during review' },
];

const LEGACY_DISCOVERED_PROJECT_DESCRIPTION = 'Local project auto-discovered from runtime files.';

const DEFAULT_WORKSPACE = {
  squads: [
    {
      id: 'full-build',
      label: 'Full Build',
      icon: '🏗️',
      description: 'New project from scratch — full pipeline from discovery to deployment.',
      agents: FULL_BUILD_AGENTS,
      projects: [
        {
          id: 'demo',
          label: 'Demo Project',
          description: 'Default demonstration and onboarding project.',
        },
      ],
    },
    {
      id: 'feature-ops',
      label: 'Feature Ops',
      icon: '🔧',
      description: 'Existing project — new features, bug fixes, refactoring, maintenance.',
      agents: FEATURE_OPS_AGENTS,
      projects: [],
    },
    {
      id: 'code-review',
      label: 'Code Review',
      icon: '🔍',
      description: 'Code audit, security review, quality check on existing codebase.',
      agents: CODE_REVIEW_AGENTS,
      projects: [],
    },
  ],
};

const DEFAULT_SAMPLE_PROJECT = {
  id: 'sample',
  label: 'Sample Client',
  description: 'Minimal demonstration project — safe for public display.',
};

function getMigratedSquadId(squadId) {
  return squadId === 'support-ops' ? 'feature-ops' : squadId;
}

function normalizeProjectEntry(project, squadId) {
  if (!project || !project.id) {
    return null;
  }

  const projectId = project.id;

  return {
    id: projectId,
    label: project.label || labelFromProjectId(projectId),
    description: project.description || '',
  };
}

function isLegacySampleProject(project) {
  return project.id === DEFAULT_SAMPLE_PROJECT.id
    && project.label === DEFAULT_SAMPLE_PROJECT.label
    && project.description === DEFAULT_SAMPLE_PROJECT.description;
}

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

function syncRuntimeFileFromSeed(fileSet, fallbackData) {
  let desiredContent = null;

  if (fs.existsSync(fileSet.seed)) {
    desiredContent = fs.readFileSync(fileSet.seed, 'utf8');
  } else {
    desiredContent = JSON.stringify(fallbackData, null, 2);
  }

  const currentContent = fs.existsSync(fileSet.runtime)
    ? fs.readFileSync(fileSet.runtime, 'utf8')
    : null;

  if (currentContent !== desiredContent) {
    ensureDir(path.dirname(fileSet.runtime));
    fs.writeFileSync(fileSet.runtime, desiredContent, 'utf8');
  }
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

function getProjectSuffix(projectId = 'demo') {
  return projectId === 'demo' ? '' : `-${projectId}`;
}

function getProjectFiles(projectId = 'demo') {
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
    recap: {
      legacy: path.join(DATA_DIR, `recap${suffix}.json`),
      seed: path.join(SEEDS_DIR, `recap${suffix}.json`),
      runtime: path.join(RUNTIME_DIR, `recap${suffix}.json`),
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

  if (kind === 'recap') {
    return null;
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

  if (projectId === DEMO_PROJECT_ID) {
    syncRuntimeFileFromSeed(projectFiles.agents, getFallbackData('agents'));
    syncRuntimeFileFromSeed(projectFiles.tasks, getFallbackData('tasks'));
    syncRuntimeFileFromSeed(projectFiles.activity, getFallbackData('activity'));
    syncRuntimeFileFromSeed(projectFiles.recap, getFallbackData('recap'));
    return projectFiles;
  }

  ensureRuntimeFile(projectFiles.agents, getFallbackData('agents'));
  ensureRuntimeFile(projectFiles.tasks, getFallbackData('tasks'));
  ensureRuntimeFile(projectFiles.activity, getFallbackData('activity'));
  ensureRuntimeFile(projectFiles.recap, getFallbackData('recap'));
  return projectFiles;
}

function normalizeWorkspace(workspace) {
  const sourceSquads = Array.isArray(workspace?.squads) ? workspace.squads : [];
  const projectsBySquad = new Map(
    DEFAULT_WORKSPACE.squads.map((squad) => [squad.id, []]),
  );

  for (const rawSquad of sourceSquads) {
    const squadId = getMigratedSquadId(rawSquad?.id);
    if (!projectsBySquad.has(squadId)) {
      continue;
    }

    const bucket = projectsBySquad.get(squadId);
    const projects = Array.isArray(rawSquad?.projects) ? rawSquad.projects : [];

    for (const rawProject of projects) {
      const project = normalizeProjectEntry(rawProject, squadId);
      if (!project) {
        continue;
      }

      if (project.description === LEGACY_DISCOVERED_PROJECT_DESCRIPTION || isLegacySampleProject(project)) {
        continue;
      }

      if (!bucket.some((item) => item.id === project.id)) {
        bucket.push(project);
      }
    }
  }

  return {
    squads: DEFAULT_WORKSPACE.squads.map((defaultSquad) => {
      const projects = clone(defaultSquad.projects);
      const existingIds = new Set(projects.map((project) => project.id));

      for (const project of projectsBySquad.get(defaultSquad.id) || []) {
        if (existingIds.has(project.id)) {
          continue;
        }

        projects.push(project);
        existingIds.add(project.id);
      }

      return {
        ...clone(defaultSquad),
        projects,
      };
    }),
  };
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
    acceptanceCriteria: Array.isArray(taskInput.acceptanceCriteria)
      ? taskInput.acceptanceCriteria.map((item, i) => {
          if (typeof item === 'string') return { id: `ac-${Date.now()}-${i}`, text: item, done: false };
          return { id: item.id ?? `ac-${Date.now()}-${i}`, text: item.text ?? item.label ?? String(item), done: item.done ?? item.checked ?? item.completed ?? false };
        })
      : [],
    subTasks: Array.isArray(taskInput.subTasks)
      ? taskInput.subTasks.map((item, i) => {
          if (typeof item === 'string') return { id: `st-${Date.now()}-${i}`, text: item, status: 'todo' };
          return { id: item.id ?? `st-${Date.now()}-${i}`, text: item.text ?? item.title ?? String(item), status: item.status ?? (item.completed || item.done ? 'done' : 'todo') };
        })
      : [],
    activity: Array.isArray(taskInput.activity) ? taskInput.activity : [],
    updatedAt: now,
  };

  data.tasks.unshift(task);
  writeJSON(files.tasks.runtime, data);
  return task;
}

function setRecap(projectId, input) {
  const files = ensureProjectFiles(projectId);

  const recap = {
    id: `recap-${projectId}`,
    type: VALID_RECAP_TYPES.includes(input.type) ? input.type : 'feature',
    agentAuthor: input.agentAuthor ? String(input.agentAuthor).trim() : 'orchestrator',
    createdAt: new Date().toISOString(),
    summary: String(input.summary || '').trim(),
    why: String(input.why || '').trim(),
    how: String(input.how || '').trim(),
    outcome: String(input.outcome || '').trim(),
    bugOrigin: input.bugOrigin ? String(input.bugOrigin).trim() : null,
    bugSymptom: input.bugSymptom ? String(input.bugSymptom).trim() : null,
    qaSteps: input.qaSteps ? String(input.qaSteps).trim() : null,
    clickupTaskId: input.clickupTaskId ? String(input.clickupTaskId).trim() : null,
    clickupTaskTitle: input.clickupTaskTitle ? String(input.clickupTaskTitle).trim() : null,
    clickupUrl: input.clickupUrl ? String(input.clickupUrl).trim() : null,
    commitHash: input.commitHash ? String(input.commitHash).trim() : null,
    commitMessage: input.commitMessage ? String(input.commitMessage).trim() : null,
    commitUrl: input.commitUrl ? String(input.commitUrl).trim() : null,
    prUrl: input.prUrl ? String(input.prUrl).trim() : null,
    links: Array.isArray(input.links)
      ? input.links.filter((l) => l && l.label && l.url)
      : [],
    stagingTestGuide: input.stagingTestGuide ? String(input.stagingTestGuide).trim() : null,
  };

  writeJSON(files.recap.runtime, recap);
  return recap;
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
  VALID_RECAP_TYPES,
  VALID_STATUSES,
  WORKSPACE_FILE,
  DEMO_PROJECT_ID,
  appendActivityEntry,
  buildBlankActivity,
  buildBlankAgents,
  buildBlankTasks,
  clone,
  createProject,
  setRecap,
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
