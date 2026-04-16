const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const {
  AGENT_FILE_MAP,
  AGENTS_DEFINITIONS_DIR,
  DEMO_PROJECT_ID,
  DEFAULT_ALLOWED_ORIGINS,
  VALID_COLUMNS,
  VALID_PRIORITIES,
  VALID_RECAP_TYPES,
  VALID_STATUSES,
  createProject,
  setRecap,
  createTask,
  ensureProjectPipeline,
  ensureDataDirs,
  ensureWorkspaceCatalog,
  getRequiredPipelineAgents,
  getWorkspace,
  readProjectData,
  resolveProject,
  updateAgent,
  withProjectLock,
  writeProjectData,
} = require('./lib/dashboard-data');

const app = express();
const PORT = process.env.PORT || 3001;

const CORS_ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : DEFAULT_ALLOWED_ORIGINS)
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || CORS_ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
}));
app.use(express.json());

function sendInternalError(res, message) {
  res.status(500).json({ error: message });
}

function readWorkspace() {
  return getWorkspace();
}

function getWorkspacePayload() {
  return {
    squads: readWorkspace().squads,
  };
}

function getProjectContext(projectId) {
  const workspace = readWorkspace();
  return resolveProject(projectId, workspace);
}

function requireProject(req, res) {
  const context = getProjectContext(req.params.projectId);
  if (!context) {
    res.status(404).json({ error: `Unknown project '${req.params.projectId}'` });
    return null;
  }

  return context;
}

function denyDemoWrites(projectId, res) {
  if (projectId !== DEMO_PROJECT_ID) {
    return false;
  }

  res.status(403).json({
    error: 'Demo Project is read-only. Create a new project for live work.',
  });
  return true;
}

const VALID_ENTRY_TYPES = new Set(['command', 'test', 'file', 'info', 'error', 'decision']);

function buildActivityEntry(agent, action, type, detail) {
  const entry = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    agent,
    action,
    timestamp: new Date().toISOString(),
  };
  if (type && VALID_ENTRY_TYPES.has(type)) entry.type = type;
  if (detail && typeof detail === 'string') entry.detail = detail.trim();
  return entry;
}

async function ensurePipelineContext(context) {
  if (!context || context.project.id === DEMO_PROJECT_ID) {
    return;
  }

  await withProjectLock(context.project.id, async () => {
    ensureProjectPipeline(context.project.id, context.squad.id);
  });
}

// Workspace routes
app.get('/api/workspace', (req, res) => {
  try {
    res.json(getWorkspacePayload());
  } catch {
    sendInternalError(res, 'Failed to load workspace');
  }
});

app.post('/api/projects', async (req, res) => {
  const { name, squadId, description } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const result = await withProjectLock('__workspace__', async () => createProject({
      name,
      squadId,
      description,
    }));

    await ensurePipelineContext(result);

    res.status(201).json({
      project: result.project,
      squad: result.squad,
      workspace: getWorkspacePayload(),
    });
  } catch {
    sendInternalError(res, 'Failed to create project');
  }
});

// Project routes
app.get('/api/projects/:projectId/agents', (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  try {
    res.json(readProjectData(context.project.id, 'agents'));
  } catch {
    sendInternalError(res, 'Failed to read agents data');
  }
});

app.post('/api/projects/:projectId/agents/:id', async (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  if (denyDemoWrites(context.project.id, res)) {
    return;
  }

  const updates = req.body;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status)) {
    return res.status(400).json({
      error: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`,
    });
  }

  const allowedKeys = ['status', 'lastMessage'];
  if (Object.keys(updates).some((key) => !allowedKeys.includes(key))) {
    return res.status(400).json({ error: `Only these fields can be updated: ${allowedKeys.join(', ')}` });
  }

  if (req.params.id === 'orchestrator' && (updates.status === 'idle' || updates.status === 'done')) {
    const tasksData = readProjectData(context.project.id, 'tasks');
    const requiredAgents = getRequiredPipelineAgents(context.squad.id);
    const requiredTasksDone = requiredAgents.every((agentId) =>
      tasksData.tasks.some((task) => task.assignedAgent === agentId && task.column === 'Done'),
    );

    if (requiredTasksDone) {
      const recapError = validateFinalRecap(context.project.id, context.squad.id);
      if (recapError) {
        return res.status(400).json({ error: recapError });
      }
    }
  }

  try {
    await ensurePipelineContext(context);
    const updated = await withProjectLock(context.project.id, async () => updateAgent(context.project.id, req.params.id, updates));
    if (!updated) {
      return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
    }

    res.json(updated);
  } catch {
    sendInternalError(res, 'Failed to update agent');
  }
});

app.get('/api/projects/:projectId/agents/:id/definition', (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  const filename = AGENT_FILE_MAP[req.params.id];
  if (!filename) {
    return res.status(404).json({ error: `No definition file for agent '${req.params.id}'` });
  }

  const filePath = path.join(AGENTS_DEFINITIONS_DIR, filename);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ id: req.params.id, filename, content });
  } catch {
    sendInternalError(res, 'Failed to read agent definition');
  }
});

app.get('/api/projects/:projectId/tasks', (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  try {
    res.json(readProjectData(context.project.id, 'tasks'));
  } catch {
    sendInternalError(res, 'Failed to read tasks data');
  }
});

app.get('/api/projects/:projectId/tasks/:id', (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  try {
    const data = readProjectData(context.project.id, 'tasks');
    const task = data.tasks.find((item) => item.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: `Task '${req.params.id}' not found` });
    }

    res.json(task);
  } catch {
    sendInternalError(res, 'Failed to read task');
  }
});

// Normalize acceptanceCriteria: accepts string[] OR {id,text,done}[]
function normalizeAcceptanceCriteria(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === 'string') {
      return { id: `ac-${Date.now()}-${i}`, text: item, done: false };
    }
    // Already an object — ensure required fields exist
    return {
      id: item.id ?? `ac-${Date.now()}-${i}`,
      text: item.text ?? item.label ?? String(item),
      done: item.done ?? item.checked ?? item.completed ?? false,
    };
  });
}

// Normalize subTasks: accepts {title,completed}[] OR {id,text,status}[]
function normalizeSubTasks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === 'string') {
      return { id: `st-${Date.now()}-${i}`, text: item, status: 'todo' };
    }
    return {
      id: item.id ?? `st-${Date.now()}-${i}`,
      text: item.text ?? item.title ?? String(item),
      status: item.status ?? (item.completed || item.done ? 'done' : 'todo'),
    };
  });
}

function validateTaskUpdates(updates, allowNested = false) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return 'Request body must be a JSON object';
  }

  if (updates.column !== undefined && !VALID_COLUMNS.includes(updates.column)) {
    return `Invalid column. Allowed values: ${VALID_COLUMNS.join(', ')}`;
  }

  if (updates.priority !== undefined && !VALID_PRIORITIES.includes(updates.priority)) {
    return `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`;
  }

  const allowedKeys = allowNested
    ? ['column', 'priority', 'title', 'description', 'assignedAgent', 'acceptanceCriteria', 'subTasks']
    : ['column', 'priority', 'title', 'description', 'assignedAgent'];

  if (Object.keys(updates).some((key) => !allowedKeys.includes(key))) {
    return `Only these fields can be updated: ${allowedKeys.join(', ')}`;
  }

  return null;
}

function validateNewTask(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    return 'Request body must be a JSON object';
  }

  if (!task.title || typeof task.title !== 'string' || !task.title.trim()) {
    return 'Task title is required';
  }

  if (task.column !== undefined && !VALID_COLUMNS.includes(task.column)) {
    return `Invalid column. Allowed values: ${VALID_COLUMNS.join(', ')}`;
  }

  if (task.priority !== undefined && !VALID_PRIORITIES.includes(task.priority)) {
    return `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`;
  }

  const allowedKeys = ['title', 'description', 'column', 'assignedAgent', 'priority', 'acceptanceCriteria', 'subTasks', 'activity'];
  if (Object.keys(task).some((key) => !allowedKeys.includes(key))) {
    return `Only these fields can be provided: ${allowedKeys.join(', ')}`;
  }

  return null;
}

function getTaskLabel(agentId) {
  return String(agentId || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const QA_RECAP_REQUIRED_SQUADS = new Set(['full-build', 'feature-ops', 'rework']);
const STAGING_GUIDE_REQUIRED_TYPES = new Set(['feature', 'bug_fix']);

function validateFinalRecap(projectId, squadId, recapInput) {
  if (!QA_RECAP_REQUIRED_SQUADS.has(squadId)) {
    return null;
  }

  const recap = recapInput ?? readProjectData(projectId, 'recap');
  if (!recap || typeof recap !== 'object' || Array.isArray(recap) || !String(recap.summary || '').trim()) {
    return 'Cannot close mission: final QA recap is required before pipeline closure.';
  }

  if (!String(recap.qaSteps || '').trim()) {
    return 'Cannot close mission: final QA recap must include qaSteps.';
  }

  const recapType = VALID_RECAP_TYPES.includes(recap.type) ? recap.type : 'feature';
  if (STAGING_GUIDE_REQUIRED_TYPES.has(recapType) && !String(recap.stagingTestGuide || '').trim()) {
    return 'Cannot close mission: final QA recap must include stagingTestGuide for feature and bug-fix missions.';
  }

  return null;
}

function getPipelineProgressError(projectId, squadId, tasks, taskId, mergedTask) {
  const requiredAgents = getRequiredPipelineAgents(squadId);
  if (!requiredAgents.length) {
    return null;
  }

  const nextTasks = tasks.map((task) => (task.id === taskId ? mergedTask : task));
  const missingAgents = requiredAgents.filter(
    (agentId) => !nextTasks.some((task) => task.assignedAgent === agentId),
  );

  if (mergedTask.column === 'Done' && missingAgents.length > 0) {
    return `Cannot move '${mergedTask.title}' to Done: missing required pipeline tasks: ${missingAgents.map(getTaskLabel).join(', ')}.`;
  }

  if (mergedTask.assignedAgent === 'developer' && mergedTask.column !== 'Backlog') {
    const orchestratorTask = nextTasks.find((task) => task.assignedAgent === 'orchestrator');
    if (!orchestratorTask) {
      return 'Cannot start Developer work before the Orchestrator task exists.';
    }
  }

  if (mergedTask.assignedAgent === 'cto-reviewer' && mergedTask.column === 'Done') {
    const developerTask = nextTasks.find((task) => task.assignedAgent === 'developer');
    if (!developerTask || developerTask.column !== 'Done') {
      return 'Cannot complete CTO Review before Developer is Done.';
    }
  }

  if (mergedTask.assignedAgent === 'qa' && mergedTask.column === 'Done') {
    const reviewTask = nextTasks.find((task) => task.assignedAgent === 'cto-reviewer');
    if (!reviewTask || reviewTask.column !== 'Done') {
      return 'Cannot complete QA before CTO Review is Done.';
    }

    const QA_EVIDENCE_MARKERS = [
      '**Screenshot:**',
      '**Evidence:**',
      '**DOM Check:**',
      '**HTTP Check:**',
      '**CLI Output:**',
      '**Test Output:**',
      '**Tinker Output:**',
    ];
    const taskDescription = String(mergedTask.description || '');
    const hasEvidence = QA_EVIDENCE_MARKERS.some((marker) => taskDescription.includes(marker));
    if (!hasEvidence) {
      return (
        'Cannot complete QA: task description must include at least one evidence marker.\n' +
        'Accepted markers: ' +
        QA_EVIDENCE_MARKERS.join(', ') +
        '\nAdd the marker + actual evidence to your ## QA Run log before closing the task.'
      );
    }

    const recapError = validateFinalRecap(projectId, squadId);
    if (recapError) {
      return recapError;
    }
  }

  return null;
}

function updateTask(projectId, squadId, taskId, updates) {
  const data = readProjectData(projectId, 'tasks');
  const index = data.tasks.findIndex((task) => task.id === taskId);
  if (index === -1) {
    return null;
  }

  const normalized = { ...updates };
  if (normalized.acceptanceCriteria !== undefined) {
    normalized.acceptanceCriteria = normalizeAcceptanceCriteria(normalized.acceptanceCriteria);
  }
  if (normalized.subTasks !== undefined) {
    normalized.subTasks = normalizeSubTasks(normalized.subTasks);
  }

  const mergedTask = { ...data.tasks[index], ...normalized, id: taskId };

  // Block moving to Done if any acceptance criteria are unchecked.
  if (mergedTask.column === 'Done' && Array.isArray(mergedTask.acceptanceCriteria)) {
    const unchecked = mergedTask.acceptanceCriteria.filter((ac) => !ac.done);
    if (unchecked.length > 0) {
      return { error: `Cannot move to Done: ${unchecked.length} acceptance criterion/criteria not validated:\n${unchecked.map((ac) => `- ${ac.text}`).join('\n')}\n\nValidate each criterion via PATCH acceptanceCriteria before closing the task.` };
    }
  }

  const pipelineError = getPipelineProgressError(projectId, squadId, data.tasks, taskId, mergedTask);
  if (pipelineError) {
    return { error: pipelineError };
  }

  data.tasks[index] = { ...mergedTask, updatedAt: new Date().toISOString() };

  writeProjectData(projectId, 'tasks', data);
  return data.tasks[index];
}

app.post('/api/projects/:projectId/tasks', async (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  if (denyDemoWrites(context.project.id, res)) {
    return;
  }

  const validationError = validateNewTask(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    await ensurePipelineContext(context);
    const normalizedBody = {
      ...req.body,
      acceptanceCriteria: normalizeAcceptanceCriteria(req.body.acceptanceCriteria),
      subTasks: normalizeSubTasks(req.body.subTasks),
    };
    const created = await withProjectLock(context.project.id, async () => createTask(context.project.id, normalizedBody));
    res.status(201).json(created);
  } catch {
    sendInternalError(res, 'Failed to create task');
  }
});

app.post('/api/projects/:projectId/tasks/:id', async (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  if (denyDemoWrites(context.project.id, res)) {
    return;
  }

  const validationError = validateTaskUpdates(req.body, false);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    await ensurePipelineContext(context);
    const updated = await withProjectLock(
      context.project.id,
      async () => updateTask(context.project.id, context.squad.id, req.params.id, req.body),
    );
    if (!updated) {
      return res.status(404).json({ error: `Task '${req.params.id}' not found` });
    }
    if (updated.error) {
      return res.status(400).json({ error: updated.error });
    }

    res.json(updated);
  } catch {
    sendInternalError(res, 'Failed to update task');
  }
});

app.patch('/api/projects/:projectId/tasks/:id', async (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  if (denyDemoWrites(context.project.id, res)) {
    return;
  }

  const validationError = validateTaskUpdates(req.body, true);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    await ensurePipelineContext(context);
    const updated = await withProjectLock(
      context.project.id,
      async () => updateTask(context.project.id, context.squad.id, req.params.id, req.body),
    );
    if (!updated) {
      return res.status(404).json({ error: `Task '${req.params.id}' not found` });
    }
    if (updated.error) {
      return res.status(400).json({ error: updated.error });
    }

    res.json(updated);
  } catch {
    sendInternalError(res, 'Failed to update task');
  }
});

app.get('/api/projects/:projectId/activity', (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  try {
    res.json(readProjectData(context.project.id, 'activity'));
  } catch {
    sendInternalError(res, 'Failed to read activity data');
  }
});

app.post('/api/projects/:projectId/activity', async (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  if (denyDemoWrites(context.project.id, res)) {
    return;
  }

  const { agent, action, type, detail } = req.body || {};
  if (!agent || !action || typeof agent !== 'string' || typeof action !== 'string') {
    return res.status(400).json({ error: 'agent and action are required' });
  }

  try {
    await ensurePipelineContext(context);
    const nextEntries = await withProjectLock(context.project.id, async () => {
      const entries = readProjectData(context.project.id, 'activity');
      entries.unshift(buildActivityEntry(agent.trim(), action.trim(), type, detail));
      writeProjectData(context.project.id, 'activity', entries);
      return entries;
    });

    res.status(201).json(nextEntries[0]);
  } catch {
    sendInternalError(res, 'Failed to append activity entry');
  }
});

// Recap routes — one recap per mission
app.get('/api/projects/:projectId/recap', (req, res) => {
  const context = requireProject(req, res);
  if (!context) return;

  try {
    const recap = readProjectData(context.project.id, 'recap');
    res.json(recap ?? null);
  } catch {
    sendInternalError(res, 'Failed to read recap');
  }
});

app.post('/api/projects/:projectId/recap', async (req, res) => {
  const context = requireProject(req, res);
  if (!context) return;

  if (denyDemoWrites(context.project.id, res)) return;

  const body = req.body || {};

  if (!body.summary || typeof body.summary !== 'string' || !body.summary.trim()) {
    return res.status(400).json({ error: 'summary is required' });
  }

  if (body.type !== undefined && !VALID_RECAP_TYPES.includes(body.type)) {
    return res.status(400).json({
      error: `Invalid type. Allowed values: ${VALID_RECAP_TYPES.join(', ')}`,
    });
  }

  const recapValidationError = validateFinalRecap(context.project.id, context.squad.id, body);
  if (recapValidationError) {
    return res.status(400).json({ error: recapValidationError });
  }

  try {
    const recap = await withProjectLock(context.project.id, async () => setRecap(context.project.id, body));
    res.status(201).json(recap);
  } catch {
    sendInternalError(res, 'Failed to save recap');
  }
});

app.patch('/api/projects/:projectId/recap', async (req, res) => {
  const context = requireProject(req, res);
  if (!context) return;

  const { humanNotes, reworkLog, externalTaskId, externalTaskTitle, externalTaskUrl } = req.body || {};

  if (humanNotes !== undefined && typeof humanNotes !== 'string') {
    return res.status(400).json({ error: 'humanNotes must be a string' });
  }
  if (reworkLog !== undefined && !Array.isArray(reworkLog)) {
    return res.status(400).json({ error: 'reworkLog must be an array' });
  }
  const hasAnyField = [humanNotes, reworkLog, externalTaskId, externalTaskTitle, externalTaskUrl].some(
    (v) => v !== undefined,
  );
  if (!hasAnyField) {
    return res.status(400).json({ error: 'Provide at least one field: humanNotes, reworkLog, externalTaskId, externalTaskTitle, or externalTaskUrl' });
  }

  try {
    const updated = await withProjectLock(context.project.id, async () => {
      const existing = readProjectData(context.project.id, 'recap') ?? {};
      const next = { ...existing };
      if (humanNotes !== undefined) next.humanNotes = humanNotes.trim();
      if (reworkLog !== undefined) {
        // Merge — append new entries, don't overwrite previous ones
        const current = Array.isArray(existing.reworkLog) ? existing.reworkLog : [];
        next.reworkLog = [...current, ...reworkLog];
      }
      if (externalTaskId !== undefined) next.externalTaskId = String(externalTaskId).trim();
      if (externalTaskTitle !== undefined) next.externalTaskTitle = String(externalTaskTitle).trim();
      if (externalTaskUrl !== undefined) next.externalTaskUrl = String(externalTaskUrl).trim();
      writeProjectData(context.project.id, 'recap', next);
      return next;
    });
    res.json(updated);
  } catch {
    sendInternalError(res, 'Failed to update recap');
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Unknown API endpoint' });
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
});

ensureDataDirs();
ensureWorkspaceCatalog();

app.listen(PORT, () => {
  console.log(`Dashboard Agents API listening on http://localhost:${PORT}`);
});
