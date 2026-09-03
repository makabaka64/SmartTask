const fs = require('fs');
const path = require('path');
const db = require('../db/index');
const { searchKnowledgeWithTrace } = require('../services/knowledgeBaseService');

function parseArgs(argv) {
  const args = {
    userId: 1,
    topK: 5,
    candidateLimit: 20,
    evalFile: path.join(__dirname, '..', 'evals', 'rag-eval-set.json'),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--user-id' && next) {
      args.userId = Number(next);
      index += 1;
    } else if (arg === '--top-k' && next) {
      args.topK = Number(next);
      index += 1;
    } else if (arg === '--candidate-limit' && next) {
      args.candidateLimit = Number(next);
      index += 1;
    } else if (arg === '--eval-file' && next) {
      args.evalFile = path.resolve(process.cwd(), next);
      index += 1;
    }
  }

  if (!Number.isInteger(args.userId) || args.userId <= 0) {
    throw new Error('Invalid --user-id. Example: npm run eval:rag -- --user-id 1');
  }

  return args;
}

function loadEvalSet(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const cases = JSON.parse(raw);
  if (!Array.isArray(cases) || !cases.length) {
    throw new Error(`Eval set is empty: ${filePath}`);
  }
  return cases;
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function containsAny(value, expected = []) {
  const normalized = normalizeText(value);
  return expected.some((item) => normalized.includes(normalizeText(item)));
}

function sourceMatches(hit, expectedSources = []) {
  if (!expectedSources.length) return false;
  return containsAny(hit.source, expectedSources);
}

function keywordMatches(hit, expectedKeywords = []) {
  if (!expectedKeywords.length) return false;
  return containsAny([hit.source, hit.sectionPath, hit.content].filter(Boolean).join('\n'), expectedKeywords);
}

function isHitRelevant(hit, testCase) {
  return sourceMatches(hit, testCase.expectedSources) || keywordMatches(hit, testCase.expectedKeywords);
}

function firstRelevantRank(hits, testCase) {
  const index = hits.findIndex((hit) => isHitRelevant(hit, testCase));
  return index >= 0 ? index + 1 : null;
}

function rankWithinK(hits, testCase, topK) {
  const rank = firstRelevantRank(hits.slice(0, topK), testCase);
  return rank && rank <= topK ? rank : null;
}

function formatHit(hit, index) {
  const score = Number.isFinite(Number(hit.score)) ? Number(hit.score).toFixed(4) : hit.score;
  return [
    `${index + 1}. ${hit.source || 'unknown source'}`,
    `score=${score}`,
    `retrieval=${hit.retrieval || 'unknown'}`,
    hit.sectionPath ? `section=${hit.sectionPath}` : '',
    hit.rerankReason ? `reason=${hit.rerankReason}` : '',
  ].filter(Boolean).join(' | ');
}

function printRankList(title, hits, limit) {
  console.log(title);
  if (!hits.length) {
    console.log('  No hits');
    return;
  }
  hits.slice(0, limit).forEach((hit, index) => {
    console.log(`  ${formatHit(hit, index)}`);
  });
}

async function evaluate() {
  const args = parseArgs(process.argv);
  const cases = loadEvalSet(args.evalFile);
  const results = [];
  const stageResults = {
    vector: [],
    keyword: [],
    hybrid: [],
    rerank: [],
  };

  console.log('RAG Evaluation');
  console.log(`User ID: ${args.userId}`);
  console.log(`TopK: ${args.topK}`);
  console.log(`Candidate limit: ${args.candidateLimit}`);
  console.log(`Eval set: ${args.evalFile}`);
  console.log('');

  for (const [index, testCase] of cases.entries()) {
    const { results: topHits, trace } = await searchKnowledgeWithTrace(args.userId, testCase.query, {
      limit: args.topK,
      candidateLimit: args.candidateLimit,
    });
    const vectorRank = rankWithinK(trace.vectorResults, testCase, args.topK);
    const keywordRank = rankWithinK(trace.keywordResults, testCase, args.topK);
    const candidateRank = rankWithinK(trace.candidates, testCase, args.topK);
    const rerankedRank = rankWithinK(topHits, testCase, args.topK);
    const passed = rerankedRank !== null && rerankedRank <= args.topK;

    results.push({
      passed,
      candidateRank,
      rerankedRank,
      reciprocalRank: rerankedRank ? 1 / rerankedRank : 0,
    });
    stageResults.vector.push(vectorRank);
    stageResults.keyword.push(keywordRank);
    stageResults.hybrid.push(candidateRank);
    stageResults.rerank.push(rerankedRank);

    console.log(`[${passed ? 'PASS' : 'FAIL'}] #${index + 1} ${testCase.query}`);
    console.log(`Expected sources: ${(testCase.expectedSources || []).join(', ') || '-'}`);
    console.log(`Expected keywords: ${(testCase.expectedKeywords || []).join(', ') || '-'}`);
    console.log(`Vector rank: ${vectorRank || 'not found'}`);
    console.log(`Keyword rank: ${keywordRank || 'not found'}`);
    console.log(`First relevant before rerank: ${candidateRank || 'not found'}`);
    console.log(`First relevant after rerank: ${rerankedRank || 'not found'}`);
    printRankList('Before rerank candidates:', trace.candidates, Math.min(args.topK, 5));
    printRankList('After rerank top hits:', topHits, Math.min(args.topK, 5));
    console.log('');
  }

  const total = results.length;
  const passed = results.filter((item) => item.passed).length;
  const recallAtK = passed / total;
  const mrr = results.reduce((sum, item) => sum + item.reciprocalRank, 0) / total;

  console.log('Summary');
  console.log(`Total queries: ${total}`);
  console.log(`Recall@${args.topK}: ${(recallAtK * 100).toFixed(2)}%`);
  console.log(`MRR@${args.topK}: ${mrr.toFixed(4)}`);
  console.log('');
  console.log('Stage comparison');
  for (const [stage, ranks] of Object.entries(stageResults)) {
    const stageRecall = ranks.filter(Boolean).length / total;
    const stageMrr = ranks.reduce((sum, rank) => sum + (rank ? 1 / rank : 0), 0) / total;
    console.log(`${stage}: Recall@${args.topK}=${(stageRecall * 100).toFixed(2)}% MRR@${args.topK}=${stageMrr.toFixed(4)}`);
  }
}

evaluate()
  .catch((error) => {
    console.error('RAG evaluation failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.end();
  });
