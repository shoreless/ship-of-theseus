/**
 * Embeddings - Local vector generation for semantic search
 * AI Memory Infrastructure
 *
 * Uses @xenova/transformers to run all-MiniLM-L6-v2 locally.
 * No external API dependencies.
 */

import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';
import crypto from 'crypto';
import db from '../db/index.js';

// The embedding model - initialized lazily
let extractor: FeatureExtractionPipeline | null = null;
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Add unique constraint if not exists (for upsert to work)
try {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_unique
    ON embeddings(entity_type, entity_id)
  `);
} catch {
  // Index might already exist
}

// Prepared statements
const queries = {
  upsertEmbedding: db.prepare(`
    INSERT INTO embeddings (entity_type, entity_id, vector, content_hash, model)
    VALUES (@entity_type, @entity_id, @vector, @content_hash, @model)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET
      vector = @vector,
      content_hash = @content_hash,
      model = @model,
      created_at = datetime('now')
  `),
  getEmbedding: db.prepare(`
    SELECT vector FROM embeddings WHERE entity_type = ? AND entity_id = ?
  `),
  getAllEmbeddings: db.prepare(`
    SELECT entity_type, entity_id, vector FROM embeddings WHERE entity_type = ?
  `),
  deleteEmbedding: db.prepare(`
    DELETE FROM embeddings WHERE entity_type = ? AND entity_id = ?
  `),
};

/**
 * Initialize the embedding model.
 * Called lazily on first embedding request.
 */
export async function initializeEmbeddingModel(): Promise<void> {
  if (extractor) return;

  console.error(`[ai-memory] Loading embedding model (${MODEL_NAME})...`);
  console.error('[ai-memory] First load downloads the model (~23MB). Subsequent loads use cache.');

  extractor = await pipeline('feature-extraction', MODEL_NAME);

  console.error('[ai-memory] Embedding model loaded.');
}

/**
 * Generate an embedding vector for text.
 */
export async function generateEmbedding(text: string): Promise<Float32Array> {
  if (!extractor) {
    await initializeEmbeddingModel();
  }

  // Truncate very long text (model has ~256 token limit for best results)
  const truncated = text.slice(0, 2000);

  const output = await extractor!(truncated, {
    pooling: 'mean',
    normalize: true,
  });

  return output.data as Float32Array;
}

/**
 * Calculate cosine similarity between two vectors.
 * Since our vectors are normalized, this is just the dot product.
 */
export function cosineSimilarity(vecA: Float32Array | number[], vecB: Float32Array | number[]): number {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += vecA[i] * vecB[i];
  }
  return sum;
}

/**
 * Generate a content hash to detect changes.
 */
export function contentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Store an embedding for a context item.
 */
export async function embedContext(key: string, value: unknown): Promise<void> {
  // Create searchable text from key and value
  const textToEmbed = `Key: ${key}\nContent: ${JSON.stringify(value)}`;
  const hash = contentHash(textToEmbed);

  // Check if we already have this exact content embedded
  const existing = queries.getEmbedding.get('context', key) as { vector: Buffer } | undefined;
  if (existing) {
    // Could check hash here to skip re-embedding, but for now always update
  }

  const vector = await generateEmbedding(textToEmbed);

  // Store as JSON string (SQLite BLOB would be more efficient but this is simpler)
  queries.upsertEmbedding.run({
    entity_type: 'context',
    entity_id: key,
    vector: JSON.stringify(Array.from(vector)),
    content_hash: hash,
    model: MODEL_NAME,
  });
}

/**
 * Remove embedding when context is deleted.
 */
export function deleteContextEmbedding(key: string): void {
  queries.deleteEmbedding.run('context', key);
}

/**
 * Search context items by semantic similarity.
 */
export async function searchContext(
  query: string,
  limit: number = 5,
  threshold: number = 0.3
): Promise<Array<{ key: string; score: number; value: unknown }>> {
  // Generate query embedding
  const queryVec = await generateEmbedding(query);

  // Fetch all context embeddings
  const rows = queries.getAllEmbeddings.all('context') as Array<{
    entity_type: string;
    entity_id: string;
    vector: string;
  }>;

  if (rows.length === 0) {
    return [];
  }

  // Calculate similarities
  const results: Array<{ key: string; score: number }> = [];

  for (const row of rows) {
    const storedVec = JSON.parse(row.vector) as number[];
    const score = cosineSimilarity(queryVec, storedVec);

    if (score >= threshold) {
      results.push({ key: row.entity_id, score });
    }
  }

  // Sort by score descending and limit
  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, limit);

  // Fetch actual content for top results
  const getContext = db.prepare('SELECT value FROM context_items WHERE key = ?');

  return topResults.map((result) => {
    const row = getContext.get(result.key) as { value: string } | undefined;
    let value: unknown = null;
    if (row) {
      try {
        value = JSON.parse(row.value);
      } catch {
        value = row.value;
      }
    }
    return {
      key: result.key,
      score: Math.round(result.score * 1000) / 1000, // Round to 3 decimals
      value,
    };
  });
}

/**
 * Embed all existing context items (for backfill).
 */
export async function embedAllContextItems(): Promise<number> {
  const rows = db.prepare('SELECT key, value FROM context_items').all() as Array<{
    key: string;
    value: string;
  }>;

  let count = 0;
  for (const row of rows) {
    let value: unknown;
    try {
      value = JSON.parse(row.value);
    } catch {
      value = row.value;
    }
    await embedContext(row.key, value);
    count++;
  }

  return count;
}
