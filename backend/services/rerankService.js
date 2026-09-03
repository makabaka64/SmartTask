const config = require('../config');
const { openai } = require('../openai');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

function tokenize(text) {
  const rawTokens = String(text || '').toLowerCase().match(/[a-z0-9_]+|[\u4e00-\u9fa5]+/g) || [];
  const tokens = [];

  for (const token of rawTokens) {
    if (token.length < 2) continue;
    tokens.push(token);
    if (/^[\u4e00-\u9fa5]+$/.test(token)) {
      for (let i = 0; i < token.length - 1; i += 1) {
        tokens.push(token.slice(i, i + 2));
      }
    }
  }

  return [...new Set(tokens)];
}

function keywordOverlapScore(query, content) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return 0;

  const normalizedContent = String(content || '').toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (normalizedContent.includes(token)) {
      score += token.length >= 4 ? 3 : 1;
    }
  }

  return score / queryTokens.length;
}

function normalizeScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function normalizeProviderScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 0;
  return normalizeScore(numeric <= 1 ? numeric * 100 : numeric);
}

function parseJsonObject(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      return null;
    }
  }
}

function buildRerankDocument(candidate) {
  return [
    candidate.source ? `source: ${candidate.source}` : '',
    candidate.category ? `category: ${candidate.category}` : '',
    candidate.sectionPath ? `section: ${candidate.sectionPath}` : '',
    candidate.metadata ? `metadata: ${JSON.stringify(candidate.metadata)}` : '',
    `content: ${String(candidate.content || '').slice(0, 4000)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function extractDashScopeRerankItems(responseBody) {
  if (Array.isArray(responseBody?.results)) return responseBody.results;
  if (Array.isArray(responseBody?.output?.results)) return responseBody.output.results;
  if (Array.isArray(responseBody?.data)) return responseBody.data;
  return [];
}

function getRerankItemIndex(item) {
  const index = item?.index ?? item?.document_index ?? item?.doc_index;
  const numeric = Number(index);
  return Number.isInteger(numeric) ? numeric : -1;
}

function localRerankKnowledge(query, candidates) {
  return candidates
    .map((candidate, index) => {
      const retrievalScore = Number(candidate.score) || 0;
      const lexicalScore = keywordOverlapScore(
        query,
        [
          candidate.source,
          candidate.category,
          candidate.sectionPath,
          candidate.content,
        ].filter(Boolean).join('\n')
      );
      const normalizedRetrieval = String(candidate.retrieval || '').startsWith('vector')
        ? Math.max(0, Math.min(1, retrievalScore))
        : Math.max(0, Math.min(1, retrievalScore / 20));
      const rerankScore = normalizeScore((normalizedRetrieval * 0.65 + lexicalScore * 0.35) * 100);

      return {
        ...candidate,
        score: Number(rerankScore.toFixed(4)),
        rerankScore,
        rerankReason: 'local heuristic rerank',
        originalRank: candidate.originalRank ?? index + 1,
        originalScore: candidate.originalScore ?? retrievalScore,
      };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);
}

async function dashScopeRerankKnowledge(query, candidates) {
  const { apiKey, baseURL, model, proxyURL } = config.rerank;
  if (!apiKey) {
    throw new Error('RERANK_API_KEY or EMBEDDING_API_KEY is required for DashScope rerank');
  }
  if (!baseURL) {
    throw new Error('RERANK_BASE_URL or EMBEDDING_BASE_URL is required for DashScope rerank');
  }

  const response = await fetch(`${baseURL.replace(/\/$/, '')}/reranks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      query: String(query || ''),
      documents: candidates.map(buildRerankDocument),
      top_n: candidates.length,
      return_documents: false,
    }),
    agent: proxyURL ? new HttpsProxyAgent(proxyURL) : undefined,
  });

  const bodyText = await response.text();
  let body = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch (error) {
    body = null;
  }

  if (!response.ok) {
    const message = body?.message || body?.error?.message || bodyText || response.statusText;
    throw new Error(`DashScope rerank failed: ${response.status} ${message}`);
  }

  const scoreByIndex = new Map();
  for (const item of extractDashScopeRerankItems(body)) {
    const index = getRerankItemIndex(item);
    if (index < 0 || index >= candidates.length) continue;
    scoreByIndex.set(index, {
      score: normalizeProviderScore(item.relevance_score ?? item.score),
      reason: 'qwen3-rerank relevance score',
    });
  }

  if (!scoreByIndex.size) {
    throw new Error('DashScope rerank returned no scored results');
  }

  return candidates
    .map((candidate, index) => {
      const rerank = scoreByIndex.get(index);
      const fallbackScore = localRerankKnowledge(query, [candidate])[0].score;
      const rerankScore = rerank ? rerank.score : fallbackScore;

      return {
        ...candidate,
        score: Number(rerankScore.toFixed(4)),
        rerankScore,
        rerankReason: rerank?.reason || 'local fallback score for missing rerank item',
        originalRank: candidate.originalRank ?? index + 1,
        originalScore: candidate.originalScore ?? candidate.score,
      };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);
}

async function llmRerankKnowledge(query, candidates) {
  const items = candidates.map((candidate, index) => ({
    id: String(index + 1),
    source: candidate.source,
    category: candidate.category,
    sectionPath: candidate.sectionPath || '',
    retrieval: candidate.retrieval,
    retrievalScore: candidate.score,
    content: String(candidate.content || '').slice(0, 900),
  }));

  const response = await openai.chat.completions.create({
    model: config.rerank.model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a RAG reranker. Score each candidate by relevance to the query. Return JSON only with shape {"results":[{"id":"1","score":0-100,"reason":"short reason"}]}. Prefer exact constraints, task details, dates, project rules, and directly useful evidence.',
      },
      {
        role: 'user',
        content: JSON.stringify({ query, candidates: items }),
      },
    ],
  });

  const parsed = parseJsonObject(response.choices?.[0]?.message?.content);
  const results = Array.isArray(parsed?.results) ? parsed.results : [];
  const scoreById = new Map(
    results.map((item) => [
      String(item.id),
      {
        score: normalizeScore(item.score),
        reason: String(item.reason || '').slice(0, 160),
      },
    ])
  );

  return candidates
    .map((candidate, index) => {
      const rerank = scoreById.get(String(index + 1));
      const fallbackScore = localRerankKnowledge(query, [candidate])[0].score;
      const rerankScore = rerank ? rerank.score : fallbackScore;

      return {
        ...candidate,
        score: Number(rerankScore.toFixed(4)),
        rerankScore,
        rerankReason: rerank?.reason || 'local fallback score for missing rerank item',
        originalRank: candidate.originalRank ?? index + 1,
        originalScore: candidate.originalScore ?? candidate.score,
      };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);
}

async function rerankKnowledge(query, candidates) {
  if (!Array.isArray(candidates) || !candidates.length) return [];

  if (!config.rerank.enabled) {
    return localRerankKnowledge(query, candidates);
  }

  try {
    if (config.rerank.provider === 'dashscope') {
      return await dashScopeRerankKnowledge(query, candidates);
    }

    if (config.rerank.provider === 'llm') {
      return await llmRerankKnowledge(query, candidates);
    }

    return localRerankKnowledge(query, candidates);
  } catch (error) {
    console.warn('knowledge rerank fallback:', error.message);
    return localRerankKnowledge(query, candidates);
  }
}

module.exports = {
  rerankKnowledge,
  localRerankKnowledge,
  dashScopeRerankKnowledge,
};
