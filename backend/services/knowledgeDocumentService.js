const db = require('../db/index');
const {
  syncChunksForDocument,
  deleteChunksByDocument,
} = require('./knowledgeChunkService');

let schemaReady = false;
const DEFAULT_CONTENT_FORMAT = 'markdown';

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

async function ensureKnowledgeTable() {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS knowledge_document (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(120) NOT NULL,
      content TEXT NOT NULL,
      content_format VARCHAR(30) DEFAULT 'markdown',
      metadata TEXT NULL,
      category VARCHAR(40) DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await addColumnIfMissing(
    'content_format',
    "ALTER TABLE knowledge_document ADD COLUMN content_format VARCHAR(30) DEFAULT 'markdown' AFTER content"
  );
  await addColumnIfMissing(
    'metadata',
    'ALTER TABLE knowledge_document ADD COLUMN metadata TEXT NULL AFTER content_format'
  );
  schemaReady = true;
}

async function addColumnIfMissing(columnName, alterSql) {
  const rows = await query('SHOW COLUMNS FROM knowledge_document LIKE ?', [columnName]);
  if (!rows.length) {
    await query(alterSql);
  }
}

function normalizeContentFormat(format) {
  return DEFAULT_CONTENT_FORMAT;
}

function normalizeMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }
  return typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
}

function serializeMetadata(metadata) {
  return JSON.stringify(normalizeMetadata(metadata));
}

async function listKnowledgeDocuments(userId) {
  await ensureKnowledgeTable();
  return query(
    `SELECT id, user_id, title, content, content_format, metadata, category, created_at, updated_at
     FROM knowledge_document
     WHERE user_id = ?
     ORDER BY updated_at DESC, id DESC`,
    [userId]
  ).then((rows) => rows.map(hydrateDocument));
}

async function createKnowledgeDocument(userId, payload) {
  await ensureKnowledgeTable();
  const document = normalizeDocumentPayload(payload);
  const result = await query(
    `INSERT INTO knowledge_document (user_id, title, content, content_format, metadata, category)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      document.title,
      document.content,
      document.content_format,
      serializeMetadata(document.metadata),
      document.category,
    ]
  );
  await syncChunksForDocument(userId, {
    id: result.insertId,
    ...document,
  });
  return result.insertId;
}

async function updateKnowledgeDocument(userId, documentId, payload) {
  await ensureKnowledgeTable();
  const document = normalizeDocumentPayload(payload);
  const result = await query(
    `UPDATE knowledge_document
     SET title = ?, content = ?, content_format = ?, metadata = ?, category = ?
     WHERE id = ? AND user_id = ?`,
    [
      document.title,
      document.content,
      document.content_format,
      serializeMetadata(document.metadata),
      document.category,
      documentId,
      userId,
    ]
  );
  if (result.affectedRows === 1) {
    await syncChunksForDocument(userId, {
      id: documentId,
      ...document,
    });
  }
  return result;
}

async function deleteKnowledgeDocument(userId, documentId) {
  await ensureKnowledgeTable();
  await deleteChunksByDocument(userId, documentId);
  return query(`DELETE FROM knowledge_document WHERE id = ? AND user_id = ?`, [documentId, userId]);
}

async function getKnowledgeDocumentsForSearch(userId) {
  await ensureKnowledgeTable();
  return query(
    `SELECT id, title, content, content_format, metadata, category, updated_at
     FROM knowledge_document
     WHERE user_id = ?`,
    [userId]
  ).then((rows) => rows.map(hydrateDocument));
}

function normalizeDocumentPayload(payload) {
  return {
    title: String(payload.title || '').trim(),
    content: String(payload.content || '').trim(),
    content_format: normalizeContentFormat(payload.content_format || payload.contentFormat),
    metadata: normalizeMetadata(payload.metadata),
    category: payload.category || 'general',
  };
}

function hydrateDocument(row) {
  return {
    ...row,
    content_format: normalizeContentFormat(row.content_format),
    metadata: normalizeMetadata(row.metadata),
  };
}

module.exports = {
  ensureKnowledgeTable,
  listKnowledgeDocuments,
  createKnowledgeDocument,
  updateKnowledgeDocument,
  deleteKnowledgeDocument,
  getKnowledgeDocumentsForSearch
};
