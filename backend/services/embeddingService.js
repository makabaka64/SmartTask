const OpenAI = require('openai');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');
const config = require('../config');

const HASH_PRIME = 16777619;

function hashToken(token) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, HASH_PRIME);
  }
  return hash >>> 0;
}

function normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector;
  return vector.map((value) => value / norm);
}

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

  return expanded;
}

function createLocalEmbedding(text, dimensions = 384) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const hash = hashToken(token);
    const index = hash % dimensions;
    const sign = hash & 1 ? 1 : -1;
    vector[index] += sign;
  }

  return normalize(vector);
}

function createEmbeddingClient() {
  if (!config.embedding.apiKey || !config.embedding.model) {
    return null;
  }

  const proxyAgent = config.embedding.proxyURL
    ? new HttpsProxyAgent(config.embedding.proxyURL)
    : null;

  return new OpenAI({
    apiKey: config.embedding.apiKey,
    baseURL: config.embedding.baseURL,
    fetch: (url, options = {}) =>
      fetch(url, {
        ...options,
        ...(proxyAgent ? { agent: proxyAgent } : {}),
      }),
  });
}

async function createEmbeddings(texts) {
  const input = texts.map((text) => String(text || '').trim());
  const client = createEmbeddingClient();

  if (client) {
    const request = {
      model: config.embedding.model,
      input,
      encoding_format: 'float',
    };

    if (config.embedding.dimensions) {
      request.dimensions = config.embedding.dimensions;
    }

    const response = await client.embeddings.create(request);
    return response.data.map((item) => item.embedding);
  }

  if (!config.embedding.useLocalFallback) {
    throw new Error('Embedding model is not configured');
  }

  return input.map((text) => createLocalEmbedding(text, config.embedding.dimensions));
}

async function createEmbedding(text) {
  const [embedding] = await createEmbeddings([text]);
  return embedding;
}

function getEmbeddingModelName() {
  return config.embedding.model || `local-hash-${config.embedding.dimensions}`;
}

module.exports = {
  createEmbedding,
  createEmbeddings,
  getEmbeddingModelName,
};
