const { getKnowledgeDocumentsForSearch } = require('./knowledgeDocumentService');
const { createEmbedding } = require('./embeddingService');
const { listChunksForSearch } = require('./knowledgeChunkService');

function tokenize(text) {
  const rawTokens = text.toLowerCase().match(/[a-z0-9_]+|[\u4e00-\u9fa5]+/g) || [];
  const expanded = [];

  for (const token of rawTokens) {
    if (token.length < 2) continue;
    expanded.push(token);
    if (/^[\u4e00-\u9fa5]+$/.test(token)) {
      for (let i = 0; i < token.length - 1; i += 1) {
        expanded.push(token.slice(i, i + 2));
      }
    }
  }

  return [...new Set(expanded)];
}

function splitToChunks(content) {
  return content
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => chunk.replace(/\n+/g, ' '));
}

function scoreChunk(queryTokens, chunk) {
  const tokenSet = new Set(chunk.tokens);
  let score = 0;

  for (const token of queryTokens) {
    if (tokenSet.has(token)) {
      score += token.length >= 4 ? 3 : 1;
    }
    if (chunk.content.toLowerCase().includes(token)) {
      score += 1;
    }
  }

  return score;
}

async function searchKnowledge(userId, query, limit = 4) {
  const vectorResults = await searchKnowledgeByVector(userId, query, limit);
  if (vectorResults.length) return vectorResults;

  return searchKnowledgeByKeyword(userId, query, limit);
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aNorm += a[i] * a[i];
    bNorm += b[i] * b[i];
  }

  if (!aNorm || !bNorm) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function parseEmbedding(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function searchKnowledgeByVector(userId, query, limit = 4) {
  const chunks = await listChunksForSearch(userId);
  if (!chunks.length) return [];

  const queryEmbedding = await createEmbedding(query);

  return chunks
    .map((chunk) => ({
      id: chunk.id,
      source: chunk.source_title,
      category: chunk.category,
      content: chunk.content,
      score: cosineSimilarity(queryEmbedding, parseEmbedding(chunk.embedding)),
      retrieval: 'vector',
      embeddingModel: chunk.embedding_model,
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function searchKnowledgeByKeyword(userId, query, limit = 4) {
  const docs = await getKnowledgeDocumentsForSearch(userId);
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const chunks = docs.flatMap((doc) =>
    splitToChunks(doc.content).map((chunk, index) => ({
      id: `${doc.id}-${index}`,
      source: doc.title,
      category: doc.category,
      content: chunk,
      tokens: tokenize(chunk)
    }))
  );

  return chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(queryTokens, chunk)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ id, source, category, content, score }) => ({
      id,
      source,
      category,
      content,
      score,
      retrieval: 'keyword'
    }));
}

function formatKnowledgeContext(results) {
  if (!results.length) return 'No related knowledge found.';
  return results
    .map((item, index) => `[${index + 1}] Source: ${item.source} (${item.category})\n${item.content}`)
    .join('\n\n');
}

module.exports = {
  searchKnowledge,
  formatKnowledgeContext
};
