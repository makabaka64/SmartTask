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
      content_format VARCHAR(30) DEFAULT 'markdown',
      section_path VARCHAR(240) NULL,
      metadata TEXT NULL,
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
  await addColumnIfMissing(
    'content_format',
    "ALTER TABLE knowledge_chunk ADD COLUMN content_format VARCHAR(30) DEFAULT 'markdown' AFTER category"
  );
  await addColumnIfMissing(
    'section_path',
    'ALTER TABLE knowledge_chunk ADD COLUMN section_path VARCHAR(240) NULL AFTER content_format'
  );
  await addColumnIfMissing(
    'metadata',
    'ALTER TABLE knowledge_chunk ADD COLUMN metadata TEXT NULL AFTER section_path'
  );
  schemaReady = true;
}

async function addColumnIfMissing(columnName, alterSql) {
  const rows = await query('SHOW COLUMNS FROM knowledge_chunk LIKE ?', [columnName]);
  if (!rows.length) {
    await query(alterSql);
  }
}

function splitPlainTextToChunks(content, chunkSize = 900, overlap = 120) {
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
    if (trimmed) chunks.push({ content: trimmed, sectionPath: '' });
    buffer = trimmed.slice(Math.max(0, trimmed.length - overlap));
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      pushBuffer();
      for (let start = 0; start < paragraph.length; start += chunkSize - overlap) {
        chunks.push({ content: paragraph.slice(start, start + chunkSize).trim(), sectionPath: '' });
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

  if (buffer.trim()) chunks.push({ content: buffer.trim(), sectionPath: '' });

  return chunks.filter((chunk) => chunk.content);
}

function splitTextToChunks(content, chunkSize = 900, overlap = 120) {
  return splitPlainTextToChunks(content, chunkSize, overlap).map((chunk) => chunk.content);
}

function splitMarkdownToChunks(content, chunkSize = 900, overlap = 120) {
  const normalized = String(content || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const sections = [];
  const headingStack = [];
  let current = { sectionPath: '', lines: [] };

  function pushCurrent() {
    const body = current.lines.join('\n').trim();
    if (body) {
      sections.push({
        sectionPath: current.sectionPath,
        content: body,
      });
    }
  }

  for (const line of normalized.split('\n')) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      pushCurrent();
      const level = heading[1].length;
      const title = heading[2].trim();
      headingStack.splice(level - 1);
      headingStack[level - 1] = title;
      const sectionPath = headingStack.filter(Boolean).join(' > ');
      current = {
        sectionPath,
        lines: [line],
      };
      continue;
    }
    current.lines.push(line);
  }
  pushCurrent();

  const sourceSections = sections.length ? sections : [{ sectionPath: '', content: normalized }];
  return sourceSections.flatMap((section) =>
    splitPlainTextToChunks(section.content, chunkSize, overlap).map((chunk) => ({
      content: chunk.content,
      sectionPath: section.sectionPath,
    }))
  );
}

function splitKnowledgeToChunks(document, chunkSize = 900, overlap = 120) {
  return splitMarkdownToChunks(document.content, chunkSize, overlap);
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

function buildEmbeddingInput(document, chunk) {
  const metadata = normalizeMetadata(document.metadata);
  const metadataText = Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join('\n');

  return [
    `Title: ${document.title}`,
    `Category: ${document.category || 'general'}`,
    document.content_format ? `Format: ${document.content_format}` : '',
    chunk.sectionPath ? `Section: ${chunk.sectionPath}` : '',
    metadataText ? `Metadata:\n${metadataText}` : '',
    `Content:\n${chunk.content}`,
  ]
    .filter(Boolean)
    .join('\n');
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

  const chunks = splitKnowledgeToChunks(document);
  if (!chunks.length) return 0;

  const embeddings = await createEmbeddings(chunks.map((chunk) => buildEmbeddingInput(document, chunk)));
  const embeddingModel = getEmbeddingModelName();
  const metadata = JSON.stringify(normalizeMetadata(document.metadata));

  for (const [index, chunk] of chunks.entries()) {
    await query(
      `INSERT INTO knowledge_chunk
       (document_id, user_id, source_title, category, content_format, section_path, metadata, chunk_index, content, embedding, embedding_model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.id,
        userId,
        document.title,
        document.category || 'general',
        'markdown',
        chunk.sectionPath || null,
        metadata,
        index,
        chunk.content,
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
    `SELECT id, document_id, source_title, category, content_format, section_path, metadata, chunk_index, content, embedding, embedding_model
     FROM knowledge_chunk
     WHERE user_id = ?`,
    [userId]
  );
}

module.exports = {
  ensureKnowledgeChunkTable,
  splitTextToChunks,
  splitKnowledgeToChunks,
  syncChunksForDocument,
  deleteChunksByDocument,
  listChunksForSearch,
};
