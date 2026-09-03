const { QdrantClient } = require('@qdrant/js-client-rest');
const config = require('../config');

let client = null;
let ensuredCollection = null;
let ensuredPayloadIndexes = null;

function isVectorStoreEnabled() {
  return Boolean(
    config.vectorStore.enabled &&
      config.vectorStore.provider === 'qdrant' &&
      config.vectorStore.url
  );
}

function getClient() {
  if (!isVectorStoreEnabled()) return null;
  if (!client) {
    client = new QdrantClient({
      url: config.vectorStore.url,
      apiKey: config.vectorStore.apiKey || undefined,
      checkCompatibility: false,
    });
  }
  return client;
}

async function ensureCollection(vectorSize) {
  const qdrant = getClient();
  if (!qdrant) return false;

  const size = Number(vectorSize) || config.embedding.dimensions;
  const collectionKey = `${config.vectorStore.collection}:${size}`;
  if (ensuredCollection === collectionKey) return true;

  const collection = await qdrant.collectionExists(config.vectorStore.collection);
  if (!collection.exists) {
    await qdrant.createCollection(config.vectorStore.collection, {
      vectors: {
        size,
        distance: 'Cosine',
      },
    });
  }

  await ensurePayloadIndexes();
  ensuredCollection = collectionKey;
  return true;
}

async function ensurePayloadIndexes() {
  const indexKey = config.vectorStore.collection;
  if (ensuredPayloadIndexes === indexKey) return;

  const qdrant = getClient();
  const collection = await qdrant.getCollection(config.vectorStore.collection);
  const payloadSchema = collection.payload_schema || {};

  const indexFields = [
    { fieldName: 'user_id', fieldSchema: 'integer' },
    { fieldName: 'document_id', fieldSchema: 'integer' },
  ];

  for (const { fieldName, fieldSchema } of indexFields) {
    if (payloadSchema[fieldName]) continue;
    await qdrant.createPayloadIndex(config.vectorStore.collection, {
      wait: true,
      field_name: fieldName,
      field_schema: fieldSchema,
    });
  }

  ensuredPayloadIndexes = indexKey;
}

function toPoint(chunk, embedding) {
  return {
    id: Number(chunk.id),
    vector: embedding,
    payload: {
      chunk_id: Number(chunk.id),
      document_id: Number(chunk.documentId),
      user_id: Number(chunk.userId),
      source: chunk.sourceTitle,
      category: chunk.category || 'general',
      content_format: chunk.contentFormat || 'markdown',
      section_path: chunk.sectionPath || '',
      metadata: chunk.metadata || {},
      chunk_index: Number(chunk.chunkIndex),
      content: chunk.content,
      embedding_model: chunk.embeddingModel,
    },
  };
}

async function upsertKnowledgeVectors(chunks, embeddings) {
  if (!isVectorStoreEnabled() || !Array.isArray(chunks) || !chunks.length) return false;
  const vectorSize = embeddings?.[0]?.length || config.embedding.dimensions;

  try {
    await ensureCollection(vectorSize);
    const points = chunks.map((chunk, index) => toPoint(chunk, embeddings[index]));
    await getClient().upsert(config.vectorStore.collection, {
      wait: true,
      points,
    });
    return true;
  } catch (error) {
    console.warn('qdrant upsert failed, mysql chunks remain available:', error.message);
    return false;
  }
}

async function deleteKnowledgeVectors(userId, documentId) {
  if (!isVectorStoreEnabled()) return false;

  try {
    await ensureCollection(config.embedding.dimensions);
    await getClient().delete(config.vectorStore.collection, {
      wait: true,
      filter: {
        must: [
          { key: 'user_id', match: { value: Number(userId) } },
          { key: 'document_id', match: { value: Number(documentId) } },
        ],
      },
    });
    return true;
  } catch (error) {
    console.warn('qdrant delete failed, mysql cleanup continues:', error.message);
    return false;
  }
}

function fromScoredPoint(point) {
  const payload = point.payload || {};
  return {
    id: payload.chunk_id || point.id,
    source: payload.source || '',
    category: payload.category || 'general',
    contentFormat: payload.content_format || 'markdown',
    sectionPath: payload.section_path || '',
    metadata: payload.metadata || {},
    content: payload.content || '',
    score: Number(point.score) || 0,
    retrieval: 'vector-db',
    embeddingModel: payload.embedding_model || '',
  };
}

async function searchKnowledgeVectors(userId, queryEmbedding, limit = 10) {
  if (!isVectorStoreEnabled()) return [];

  try {
    await ensureCollection(queryEmbedding.length);
    const result = await getClient().query(config.vectorStore.collection, {
      query: queryEmbedding,
      filter: {
        must: [
          { key: 'user_id', match: { value: Number(userId) } },
        ],
      },
      with_payload: true,
      limit,
    });

    return (result.points || []).map(fromScoredPoint);
  } catch (error) {
    console.warn('qdrant search failed, falling back to mysql vector scan:', error.message);
    return [];
  }
}

module.exports = {
  isVectorStoreEnabled,
  upsertKnowledgeVectors,
  deleteKnowledgeVectors,
  searchKnowledgeVectors,
};
