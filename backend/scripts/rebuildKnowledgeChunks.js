const db = require('../db/index');
const { ensureKnowledgeTable } = require('../services/knowledgeDocumentService');
const { syncChunksForDocument } = require('../services/knowledgeChunkService');

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

async function rebuildKnowledgeChunks() {
  await ensureKnowledgeTable();
  const docs = await query(
    `SELECT id, user_id, title, content, category
     FROM knowledge_document
     ORDER BY id ASC`
  );

  let chunkCount = 0;
  for (const doc of docs) {
    chunkCount += await syncChunksForDocument(doc.user_id, doc);
  }

  console.log(`Rebuilt ${chunkCount} knowledge chunks from ${docs.length} documents`);
}

rebuildKnowledgeChunks()
  .catch((error) => {
    console.error('Failed to rebuild knowledge chunks:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.end();
  });
