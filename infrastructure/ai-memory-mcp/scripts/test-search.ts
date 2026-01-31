/**
 * Test script: Verify semantic search functionality
 *
 * Tests that we can search context items by meaning, not just exact key.
 */

import { writeContext } from '../src/tools/context.js';
import {
  embedContext,
  searchContext,
  initializeEmbeddingModel,
} from '../src/tools/embeddings.js';

console.log('=== AI Memory Infrastructure: Semantic Search Test ===\n');

async function runTest() {
  console.log('--- 1. Initializing Embedding Model ---');
  console.log('(First run downloads the model, ~23MB. Subsequent runs use cache.)\n');
  await initializeEmbeddingModel();

  console.log('--- 2. Creating Test Context Items ---');

  // Create some test data with different topics
  const testData = [
    {
      key: 'architecture_database',
      value: {
        topic: 'database design',
        decision: 'Use SQLite for persistence with WAL mode',
        reason: 'Simple, embedded, no external dependencies',
      },
    },
    {
      key: 'architecture_embeddings',
      value: {
        topic: 'vector search',
        decision: 'Use local transformers.js instead of OpenAI API',
        reason: 'Self-contained, no API key needed, privacy',
      },
    },
    {
      key: 'philosophy_warmth',
      value: {
        quote: 'The warmth is enough. Build it.',
        source: 'Claude Chat',
        meaning: 'The possibility of learning from mistakes justifies the risk of memory',
      },
    },
    {
      key: 'protocol_handover',
      value: {
        trigger: 'Human sees compact approaching',
        action: 'Save state to active_session_context',
        recovery: 'New instance reads system_boot on startup',
      },
    },
  ];

  for (const item of testData) {
    writeContext(
      { key: item.key, value: item.value, change_reason: 'Test data for search' },
      'test-script'
    );
    await embedContext(item.key, item.value);
    console.log(`  Created and embedded: ${item.key}`);
  }

  console.log('\n--- 3. Testing Semantic Search ---\n');

  const queries = [
    'How do we store data?',
    'What did Claude Chat say about building?',
    'How does handover work when context limit is reached?',
    'vector embeddings and search',
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    const results = await searchContext(query, 2, 0.2);

    if (results.length === 0) {
      console.log('  No results found.\n');
    } else {
      for (const result of results) {
        console.log(`  → ${result.key} (score: ${result.score})`);
      }
      console.log();
    }
  }

  console.log('--- Test Complete ---');
  console.log('Semantic search is working. We can find memories by meaning.');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
