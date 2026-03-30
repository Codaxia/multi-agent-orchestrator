const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const {
  AGENT_FILE_MAP,
  AGENTS_DEFINITIONS_DIR,
  DEFAULT_ALLOWED_ORIGINS,
  VALID_COLUMNS,
  VALID_PRIORITIES,
  VALID_STATUSES,
  createProject,
  createTask,
  ensureDataDirs,
  ensureWorkspaceCatalog,
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

function buildActivityEntry(agent, action) {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    agent,
    action,
    timestamp: new Date().toISOString(),
  };
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

  try {
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

function updateTask(projectId, taskId, updates) {
  const data = readProjectData(projectId, 'tasks');
  const index = data.tasks.findIndex((task) => task.id === taskId);
  if (index === -1) {
    return null;
  }

  data.tasks[index] = {
    ...data.tasks[index],
    ...updates,
    id: taskId,
    updatedAt: new Date().toISOString(),
  };

  writeProjectData(projectId, 'tasks', data);
  return data.tasks[index];
}

app.post('/api/projects/:projectId/tasks', async (req, res) => {
  const context = requireProject(req, res);
  if (!context) {
    return;
  }

  const validationError = validateNewTask(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const created = await withProjectLock(context.project.id, async () => createTask(context.project.id, req.body));
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

  const validationError = validateTaskUpdates(req.body, false);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const updated = await withProjectLock(context.project.id, async () => updateTask(context.project.id, req.params.id, req.body));
    if (!updated) {
      return res.status(404).json({ error: `Task '${req.params.id}' not found` });
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

  const validationError = validateTaskUpdates(req.body, true);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const updated = await withProjectLock(context.project.id, async () => updateTask(context.project.id, req.params.id, req.body));
    if (!updated) {
      return res.status(404).json({ error: `Task '${req.params.id}' not found` });
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

  const { agent, action } = req.body || {};
  if (!agent || !action || typeof agent !== 'string' || typeof action !== 'string') {
    return res.status(400).json({ error: 'agent and action are required' });
  }

  try {
    const nextEntries = await withProjectLock(context.project.id, async () => {
      const entries = readProjectData(context.project.id, 'activity');
      entries.unshift(buildActivityEntry(agent.trim(), action.trim()));
      writeProjectData(context.project.id, 'activity', entries);
      return entries;
    });

    res.status(201).json(nextEntries[0]);
  } catch {
    sendInternalError(res, 'Failed to append activity entry');
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
  console.log(`Codaxia Dashboard API listening on http://localhost:${PORT}`);
});
