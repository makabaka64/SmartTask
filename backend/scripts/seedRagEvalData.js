const fs = require('fs');
const path = require('path');
const db = require('../db/index');
const {
  createKnowledgeDocument,
  updateKnowledgeDocument,
  ensureKnowledgeTable,
} = require('../services/knowledgeDocumentService');

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

function parseArgs(argv) {
  const args = {
    userId: 1,
    dataFile: path.join(__dirname, '..', 'evals', 'sample-knowledge-documents.json'),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--user-id' && next) {
      args.userId = Number(next);
      index += 1;
    } else if (arg === '--data-file' && next) {
      args.dataFile = path.resolve(process.cwd(), next);
      index += 1;
    }
  }

  if (!Number.isInteger(args.userId) || args.userId <= 0) {
    throw new Error('Invalid --user-id. Example: npm run seed:rag-eval -- --user-id 1');
  }

  return args;
}

function loadDocuments(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const documents = JSON.parse(raw);
  if (!Array.isArray(documents) || !documents.length) {
    throw new Error(`Seed document file is empty: ${filePath}`);
  }
  return documents;
}

async function findDocumentByTitle(userId, title) {
  const rows = await query(
    'SELECT id FROM knowledge_document WHERE user_id = ? AND title = ? LIMIT 1',
    [userId, title]
  );
  return rows[0] || null;
}

async function seedRagEvalData() {
  const args = parseArgs(process.argv);
  const documents = loadDocuments(args.dataFile);

  await ensureKnowledgeTable();

  let created = 0;
  let updated = 0;

  for (const document of documents) {
    const existing = await findDocumentByTitle(args.userId, document.title);
    const payload = {
      title: document.title,
      content: document.content,
      content_format: 'markdown',
      category: document.category,
      metadata: document.metadata,
    };

    if (existing) {
      await updateKnowledgeDocument(args.userId, existing.id, payload);
      updated += 1;
    } else {
      await createKnowledgeDocument(args.userId, payload);
      created += 1;
    }
  }

  console.log(`Seeded RAG eval data for user ${args.userId}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Documents: ${documents.length}`);
}

seedRagEvalData()
  .catch((error) => {
    console.error('Failed to seed RAG eval data:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.end();
  });
