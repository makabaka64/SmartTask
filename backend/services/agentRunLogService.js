const fs = require('fs');
const path = require('path');
const db = require('../db/index');

const RUNTIME_DIR = path.join(__dirname, '..', 'runtime');
const LOG_FILE = path.join(RUNTIME_DIR, 'agent-runs.json');

let schemaReady = false;

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(results);
    });
  });
}

async function ensureAgentRunTable() {
  if (schemaReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS agent_run (
      id VARCHAR(40) NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      agent_type VARCHAR(40) NOT NULL,
      input TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'running',
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      knowledge_hits LONGTEXT NULL,
      draft_count INT NOT NULL DEFAULT 0,
      summary TEXT NULL,
      confirmed_task_ids TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_agent_run_user_started (user_id, started_at),
      INDEX idx_agent_run_status (status)
    )
  `);

  schemaReady = true;
  await migrateJsonRunsIfNeeded();
}

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function serializeJson(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toRun(row) {
  return {
    id: row.id,
    userId: row.user_id,
    agentType: row.agent_type,
    input: row.input,
    status: row.status,
    startedAt: toDate(row.started_at)?.toISOString() || new Date().toISOString(),
    completedAt: toDate(row.completed_at)?.toISOString() || null,
    knowledgeHits: parseJson(row.knowledge_hits, []),
    draftCount: row.draft_count || 0,
    summary: row.summary || '',
    confirmedTaskIds: parseJson(row.confirmed_task_ids, []),
  };
}

async function insertRun(run) {
  await query(
    `INSERT IGNORE INTO agent_run
     (id, user_id, agent_type, input, status, started_at, completed_at, knowledge_hits, draft_count, summary, confirmed_task_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      run.id,
      run.userId,
      run.agentType,
      run.input,
      run.status || 'running',
      toDate(run.startedAt) || new Date(),
      toDate(run.completedAt),
      serializeJson(run.knowledgeHits),
      run.draftCount || 0,
      run.summary || '',
      serializeJson(run.confirmedTaskIds),
    ]
  );
}

async function migrateJsonRunsIfNeeded() {
  if (!fs.existsSync(LOG_FILE)) return;

  let runs = [];
  try {
    runs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  } catch (error) {
    return;
  }
  if (!Array.isArray(runs) || !runs.length) return;

  for (const run of runs) {
    if (!run?.id || !run?.userId) continue;
    await insertRun(run);
  }
}

async function listRuns(userId, limit = 12) {
  await ensureAgentRunTable();
  const rows = await query(
    `SELECT id, user_id, agent_type, input, status, started_at, completed_at,
            knowledge_hits, draft_count, summary, confirmed_task_ids
     FROM agent_run
     WHERE user_id = ?
     ORDER BY started_at DESC, id DESC
     LIMIT ?`,
    [userId, Number(limit) || 12]
  );
  return rows.map(toRun);
}

async function getRun(runId, userId) {
  await ensureAgentRunTable();
  const rows = await query(
    `SELECT id, user_id, agent_type, input, status, started_at, completed_at,
            knowledge_hits, draft_count, summary, confirmed_task_ids
     FROM agent_run
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [runId, userId]
  );
  return rows.length ? toRun(rows[0]) : null;
}

async function createRun({ userId, agentType, input }) {
  await ensureAgentRunTable();
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
    confirmedTaskIds: [],
  };
  await insertRun(run);
  return run;
}

async function updateRun(runId, patch, userId = null) {
  await ensureAgentRunTable();

  const fields = [];
  const params = [];
  const fieldMap = {
    status: 'status',
    completedAt: 'completed_at',
    knowledgeHits: 'knowledge_hits',
    draftCount: 'draft_count',
    summary: 'summary',
    confirmedTaskIds: 'confirmed_task_ids',
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    fields.push(`${column} = ?`);
    if (key === 'completedAt') {
      params.push(toDate(patch[key]));
    } else if (key === 'knowledgeHits' || key === 'confirmedTaskIds') {
      params.push(serializeJson(patch[key]));
    } else {
      params.push(patch[key]);
    }
  }

  if (!fields.length) return null;

  params.push(runId);
  if (userId) params.push(userId);
  await query(
    `UPDATE agent_run SET ${fields.join(', ')} WHERE id = ?${userId ? ' AND user_id = ?' : ''}`,
    params
  );

  const rows = await query(
    `SELECT id, user_id, agent_type, input, status, started_at, completed_at,
            knowledge_hits, draft_count, summary, confirmed_task_ids
     FROM agent_run
     WHERE id = ?${userId ? ' AND user_id = ?' : ''}
     LIMIT 1`,
    userId ? [runId, userId] : [runId]
  );
  return rows.length ? toRun(rows[0]) : null;
}

async function removeRun(runId, userId) {
  await ensureAgentRunTable();
  const result = await query('DELETE FROM agent_run WHERE id = ? AND user_id = ?', [runId, userId]);
  return result.affectedRows === 1;
}

module.exports = {
  ensureAgentRunTable,
  listRuns,
  getRun,
  createRun,
  updateRun,
  removeRun,
};
