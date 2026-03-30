const express = require('express');
const cors = require('cors');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const DATA_DIR = path.join(__dirname, 'data');
const SEEDS_DIR = path.join(DATA_DIR, 'seeds');
const RUNTIME_DIR = path.join(DATA_DIR, 'runtime');

// Whitelist mapping: agent id → .md filename (no path traversal possible)
const AGENTS_DEFINITIONS_DIR = process.env.CLAUDE_AGENTS_DIR
  || path.join(os.homedir(), '.claude', 'agents');
const AGENT_FILE_MAP = {
  'orchestrator': '01-orchestrator.md',
  'pm-discovery': '02-pm-discovery.md',
  'architect': '03-architect.md',
  'developer': '04-developer.md',
  'cto-reviewer': '05-cto-reviewer.md',
  'qa': '06-qa.md',
  'security': '07-security.md',
  'deploy': '08-deploy.md',
  'estimation': '09-estimation.md',
};

const VALID_STATUSES = ['idle', 'active', 'done', 'blocked'];
const VALID_COLUMNS = ['Backlog', 'In Progress', 'In Review', 'QA', 'Done'];
const VALID_PRIORITIES = ['Must', 'Should', 'Could', "Won't"];

app.use(cors());
app.use(express.json());

// ── Utility helpers ──────────────────────────────────────────────────────────

function readJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function ensureDataDir() {
  ensureDir(DATA_DIR);
  ensureDir(SEEDS_DIR);
  ensureDir(RUNTIME_DIR);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getProjectFiles(projectId = '') {
  const suffix = projectId ? `-${projectId}` : '';

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

function ensureRuntimeFile(fileSet) {
  if (fs.existsSync(fileSet.runtime)) {
    return;
  }

  const bootstrapSource = fs.existsSync(fileSet.legacy) ? fileSet.legacy : fileSet.seed;

  if (!fs.existsSync(bootstrapSource)) {
    throw new Error(`Missing bootstrap data for ${path.basename(fileSet.runtime)}`);
  }

  fs.copyFileSync(bootstrapSource, fileSet.runtime);
}

function ensureProjectFiles(projectFiles) {
  ensureRuntimeFile(projectFiles.agents);
  ensureRuntimeFile(projectFiles.tasks);
  ensureRuntimeFile(projectFiles.activity);
}

const DEFAULT_PROJECT_FILES = getProjectFiles();
const SAMPLE_PROJECT_FILES = getProjectFiles('sample');

// ── Routes: Agents ───────────────────────────────────────────────────────────

// GET /api/agents — returns all agents with their statuses
app.get('/api/agents', (req, res) => {
  try {
    const data = readJSON(DEFAULT_PROJECT_FILES.agents.runtime);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read agents data', details: err.message });
  }
});

// POST /api/agents/:id — update a single agent's status or lastMessage
app.post('/api/agents/:id', (req, res) => {
  const { id } = req.params;
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
  const hasInvalidKey = Object.keys(updates).some((k) => !allowedKeys.includes(k));
  if (hasInvalidKey) {
    return res.status(400).json({ error: `Only these fields can be updated: ${allowedKeys.join(', ')}` });
  }

  try {
    const data = readJSON(DEFAULT_PROJECT_FILES.agents.runtime);
    const idx = data.agents.findIndex((a) => a.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: `Agent '${id}' not found` });
    }

    data.agents[idx] = {
      ...data.agents[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    writeJSON(DEFAULT_PROJECT_FILES.agents.runtime, data);
    res.json(data.agents[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update agent', details: err.message });
  }
});

// GET /api/agents/:id/definition — returns the markdown definition of an agent
app.get('/api/agents/:id/definition', (req, res) => {
  const { id } = req.params;
  const filename = AGENT_FILE_MAP[id];

  if (!filename) {
    return res.status(404).json({ error: `No definition file for agent '${id}'` });
  }

  // Safe: path is constructed from hardcoded base + whitelisted filename only
  const filePath = path.join(AGENTS_DEFINITIONS_DIR, filename);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ id, filename, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read agent definition', details: err.message });
  }
});

// ── Routes: Tasks ────────────────────────────────────────────────────────────

// GET /api/tasks — returns all tasks
app.get('/api/tasks', (req, res) => {
  try {
    const data = readJSON(DEFAULT_PROJECT_FILES.tasks.runtime);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read tasks data', details: err.message });
  }
});

// GET /api/tasks/:id — returns a single task by id
app.get('/api/tasks/:id', (req, res) => {
  try {
    const data = readJSON(DEFAULT_PROJECT_FILES.tasks.runtime);
    const task = data.tasks.find((t) => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: `Task '${req.params.id}' not found` });
    }
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read task', details: err.message });
  }
});

// POST /api/tasks/:id — update a task's column and/or other allowed fields (drag & drop)
app.post('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  if (updates.column !== undefined && !VALID_COLUMNS.includes(updates.column)) {
    return res.status(400).json({
      error: `Invalid column. Allowed values: ${VALID_COLUMNS.join(', ')}`,
    });
  }

  if (updates.priority !== undefined && !VALID_PRIORITIES.includes(updates.priority)) {
    return res.status(400).json({
      error: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`,
    });
  }

  const allowedKeys = ['column', 'priority', 'title', 'description', 'assignedAgent'];
  const hasInvalidKey = Object.keys(updates).some((k) => !allowedKeys.includes(k));
  if (hasInvalidKey) {
    return res.status(400).json({ error: `Only these fields can be updated: ${allowedKeys.join(', ')}` });
  }

  try {
    const data = readJSON(DEFAULT_PROJECT_FILES.tasks.runtime);
    const idx = data.tasks.findIndex((t) => t.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: `Task '${id}' not found` });
    }

    data.tasks[idx] = {
      ...data.tasks[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    writeJSON(DEFAULT_PROJECT_FILES.tasks.runtime, data);
    res.json(data.tasks[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task', details: err.message });
  }
});

// PATCH /api/tasks/:id — update any allowed field including acceptanceCriteria, subTasks
app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  if (updates.column !== undefined && !VALID_COLUMNS.includes(updates.column)) {
    return res.status(400).json({
      error: `Invalid column. Allowed values: ${VALID_COLUMNS.join(', ')}`,
    });
  }

  if (updates.priority !== undefined && !VALID_PRIORITIES.includes(updates.priority)) {
    return res.status(400).json({
      error: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`,
    });
  }

  const allowedKeys = ['column', 'priority', 'title', 'description', 'assignedAgent', 'acceptanceCriteria', 'subTasks'];
  const hasInvalidKey = Object.keys(updates).some((k) => !allowedKeys.includes(k));
  if (hasInvalidKey) {
    return res.status(400).json({ error: `Only these fields can be updated: ${allowedKeys.join(', ')}` });
  }

  try {
    const data = readJSON(DEFAULT_PROJECT_FILES.tasks.runtime);
    const idx = data.tasks.findIndex((t) => t.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: `Task '${id}' not found` });
    }

    data.tasks[idx] = {
      ...data.tasks[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    writeJSON(DEFAULT_PROJECT_FILES.tasks.runtime, data);
    res.json(data.tasks[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task', details: err.message });
  }
});

// ── Routes: Activity ─────────────────────────────────────────────────────────

// GET /api/activity — returns the global pipeline activity log
app.get('/api/activity', (req, res) => {
  try {
    const data = readJSON(DEFAULT_PROJECT_FILES.activity.runtime);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read activity data', details: err.message });
  }
});

// ── Routes: sample project ───────────────────────────────────────────────────

// GET /api/sample/agents
app.get('/api/sample/agents', (req, res) => {
  try {
    const data = readJSON(SAMPLE_PROJECT_FILES.agents.runtime);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read sample agents data', details: err.message });
  }
});

// POST /api/sample/agents/:id
app.post('/api/sample/agents/:id', (req, res) => {
  const { id } = req.params;
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
  const hasInvalidKey = Object.keys(updates).some((k) => !allowedKeys.includes(k));
  if (hasInvalidKey) {
    return res.status(400).json({ error: `Only these fields can be updated: ${allowedKeys.join(', ')}` });
  }

  try {
    const data = readJSON(SAMPLE_PROJECT_FILES.agents.runtime);
    const idx = data.agents.findIndex((a) => a.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: `Agent '${id}' not found` });
    }

    data.agents[idx] = {
      ...data.agents[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    writeJSON(SAMPLE_PROJECT_FILES.agents.runtime, data);
    res.json(data.agents[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sample agent', details: err.message });
  }
});

// GET /api/sample/tasks
app.get('/api/sample/tasks', (req, res) => {
  try {
    const data = readJSON(SAMPLE_PROJECT_FILES.tasks.runtime);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read sample tasks data', details: err.message });
  }
});

// POST /api/sample/tasks/:id
app.post('/api/sample/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  if (updates.column !== undefined && !VALID_COLUMNS.includes(updates.column)) {
    return res.status(400).json({
      error: `Invalid column. Allowed values: ${VALID_COLUMNS.join(', ')}`,
    });
  }

  if (updates.priority !== undefined && !VALID_PRIORITIES.includes(updates.priority)) {
    return res.status(400).json({
      error: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`,
    });
  }

  const allowedKeys = ['column', 'priority', 'title', 'description', 'assignedAgent'];
  const hasInvalidKey = Object.keys(updates).some((k) => !allowedKeys.includes(k));
  if (hasInvalidKey) {
    return res.status(400).json({ error: `Only these fields can be updated: ${allowedKeys.join(', ')}` });
  }

  try {
    const data = readJSON(SAMPLE_PROJECT_FILES.tasks.runtime);
    const idx = data.tasks.findIndex((t) => t.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: `Task '${id}' not found` });
    }

    data.tasks[idx] = {
      ...data.tasks[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    writeJSON(SAMPLE_PROJECT_FILES.tasks.runtime, data);
    res.json(data.tasks[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sample task', details: err.message });
  }
});

// PATCH /api/sample/tasks/:id
app.patch('/api/sample/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  if (updates.column !== undefined && !VALID_COLUMNS.includes(updates.column)) {
    return res.status(400).json({
      error: `Invalid column. Allowed values: ${VALID_COLUMNS.join(', ')}`,
    });
  }

  if (updates.priority !== undefined && !VALID_PRIORITIES.includes(updates.priority)) {
    return res.status(400).json({
      error: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`,
    });
  }

  const allowedKeys = ['column', 'priority', 'title', 'description', 'assignedAgent', 'acceptanceCriteria', 'subTasks'];
  const hasInvalidKey = Object.keys(updates).some((k) => !allowedKeys.includes(k));
  if (hasInvalidKey) {
    return res.status(400).json({ error: `Only these fields can be updated: ${allowedKeys.join(', ')}` });
  }

  try {
    const data = readJSON(SAMPLE_PROJECT_FILES.tasks.runtime);
    const idx = data.tasks.findIndex((t) => t.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: `Task '${id}' not found` });
    }

    data.tasks[idx] = {
      ...data.tasks[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    writeJSON(SAMPLE_PROJECT_FILES.tasks.runtime, data);
    res.json(data.tasks[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sample task', details: err.message });
  }
});

// GET /api/sample/activity
app.get('/api/sample/activity', (req, res) => {
  try {
    const data = readJSON(SAMPLE_PROJECT_FILES.activity.runtime);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read sample activity data', details: err.message });
  }
});

// ── Static files (Vite build output) ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── Global error handler (must be last middleware) ────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────

ensureDataDir();
ensureProjectFiles(DEFAULT_PROJECT_FILES);
ensureProjectFiles(SAMPLE_PROJECT_FILES);
app.listen(PORT, () => {
  console.log(`Codaxia Dashboard API listening on http://localhost:${PORT}`);
});
