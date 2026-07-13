const fs = require('fs');
const path = require('path');

const RUNTIME_DIR = path.join(__dirname, '..', 'runtime');
const LOG_FILE = path.join(RUNTIME_DIR, 'agent-runs.json');

function ensureStore() {
  if (!fs.existsSync(RUNTIME_DIR)) {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '[]', 'utf-8');
  }
}

function readRuns() {
  ensureStore();
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return [];
  }
}

function writeRuns(runs) {
  ensureStore();
  fs.writeFileSync(LOG_FILE, JSON.stringify(runs, null, 2), 'utf-8');
}

function listRuns(limit = 12) {
  const runs = readRuns();
  return runs
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}

function createRun({ userId, agentType, input }) {
  const runs = readRuns();
  const run = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId,
    agentType,
    input,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    knowledgeHits: [],
    draftCount: 0,
    summary: '',
    confirmedTaskIds: []
  };
  runs.push(run);
  writeRuns(runs);
  return run;
}

function updateRun(runId, patch) {
  const runs = readRuns();
  const nextRuns = runs.map((run) => (run.id === runId ? { ...run, ...patch } : run));
  writeRuns(nextRuns);
  return nextRuns.find((run) => run.id === runId) || null;
}

module.exports = {
  listRuns,
  createRun,
  updateRun
};
