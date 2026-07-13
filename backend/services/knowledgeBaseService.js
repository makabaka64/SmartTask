const { getKnowledgeDocumentsForSearch } = require('./knowledgeDocumentService');

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
      score
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
