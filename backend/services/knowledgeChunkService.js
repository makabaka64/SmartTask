const db = require('../db/index');
const {
  createEmbeddings,
  getEmbeddingModelName,
} = require('./embeddingService');

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

async function ensureKnowledgeChunkTable() {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS knowledge_chunk (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      document_id INT NOT NULL,
      user_id INT NOT NULL,
      source_title VARCHAR(120) NOT NULL,
      category VARCHAR(40) DEFAULT 'general',
      chunk_index INT NOT NULL,
      content TEXT NOT NULL,
      embedding LONGTEXT NOT NULL,
      embedding_model VARCHAR(80) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_knowledge_chunk_user (user_id),
      INDEX idx_knowledge_chunk_document (document_id)
    )
  `);
  schemaReady = true;
}

function splitTextToChunks(content, chunkSize = 900, overlap = 120) {
  const normalized = String(content || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n+/g, ' ').trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = '';

  function pushBuffer() {
    const trimmed = buffer.trim();
    if (trimmed) chunks.push(trimmed);
    buffer = trimmed.slice(Math.max(0, trimmed.length - overlap));
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      pushBuffer();
      for (let start = 0; start < paragraph.length; start += chunkSize - overlap) {
        chunks.push(paragraph.slice(start, start + chunkSize).trim());
      }
      buffer = '';
      continue;
    }

    const next = buffer ? `${buffer}\n${paragraph}` : paragraph;
    if (next.length > chunkSize) {
      pushBuffer();
      buffer = paragraph;
    } else {
      buffer = next;
    }
  }

  if (buffer.trim()) chunks.push(buffer.trim());

  return chunks.filter(Boolean);
}

async function deleteChunksByDocument(userId, documentId) {
  await ensureKnowledgeChunkTable();
  return query(
    'DELETE FROM knowledge_chunk WHERE user_id = ? AND document_id = ?',
    [userId, documentId]
  );
}

async function syncChunksForDocument(userId, document) {
  await ensureKnowledgeChunkTable();
  await deleteChunksByDocument(userId, document.id);

  const chunks = splitTextToChunks(document.content);
  if (!chunks.length) return 0;

  const embeddings = await createEmbeddings(chunks);
  const embeddingModel = getEmbeddingModelName();

  for (const [index, chunk] of chunks.entries()) {
    await query(
      `INSERT INTO knowledge_chunk
       (document_id, user_id, source_title, category, chunk_index, content, embedding, embedding_model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.id,
        userId,
        document.title,
        document.category || 'general',
        index,
        chunk,
        JSON.stringify(embeddings[index]),
        embeddingModel,
      ]
    );
  }

  return chunks.length;
}

async function listChunksForSearch(userId) {
  await ensureKnowledgeChunkTable();
  return query(
    `SELECT id, document_id, source_title, category, chunk_index, content, embedding, embedding_model
     FROM knowledge_chunk
     WHERE user_id = ?`,
    [userId]
  );
}

module.exports = {
  ensureKnowledgeChunkTable,
  splitTextToChunks,
  syncChunksForDocument,
  deleteChunksByDocument,
  listChunksForSearch,
};
