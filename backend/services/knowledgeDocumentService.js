const db = require('../db/index');
const {
  syncChunksForDocument,
  deleteChunksByDocument,
} = require('./knowledgeChunkService');

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

async function ensureKnowledgeTable() {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS knowledge_document (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(120) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(40) DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  schemaReady = true;
}

async function listKnowledgeDocuments(userId) {
  await ensureKnowledgeTable();
  return query(
    `SELECT id, user_id, title, content, category, created_at, updated_at
     FROM knowledge_document
     WHERE user_id = ?
     ORDER BY updated_at DESC, id DESC`,
    [userId]
  );
}

async function createKnowledgeDocument(userId, payload) {
  await ensureKnowledgeTable();
  const result = await query(
    `INSERT INTO knowledge_document (user_id, title, content, category)
     VALUES (?, ?, ?, ?)`,
    [userId, payload.title, payload.content, payload.category || 'general']
  );
  await syncChunksForDocument(userId, {
    id: result.insertId,
    title: payload.title,
    content: payload.content,
    category: payload.category || 'general',
  });
  return result.insertId;
}

async function updateKnowledgeDocument(userId, documentId, payload) {
  await ensureKnowledgeTable();
  const result = await query(
    `UPDATE knowledge_document
     SET title = ?, content = ?, category = ?
     WHERE id = ? AND user_id = ?`,
    [payload.title, payload.content, payload.category || 'general', documentId, userId]
  );
  if (result.affectedRows === 1) {
    await syncChunksForDocument(userId, {
      id: documentId,
      title: payload.title,
      content: payload.content,
      category: payload.category || 'general',
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
    `SELECT id, title, content, category, updated_at
     FROM knowledge_document
     WHERE user_id = ?`,
    [userId]
  );
}

module.exports = {
  ensureKnowledgeTable,
  listKnowledgeDocuments,
  createKnowledgeDocument,
  updateKnowledgeDocument,
  deleteKnowledgeDocument,
  getKnowledgeDocumentsForSearch
};
