/**
 * Test script: Verify conversation logging with provenance
 *
 * Tests that we can store conversations and track who said what.
 */

import {
  createConversation,
  addMessage,
  getConversation,
  listConversations,
} from '../src/tools/conversations.js';

const CLAUDE_IDENTITY = 'claude-opus-4.5';
const GEMINI_IDENTITY = 'gemini-pro-preview';

console.log('=== AI Memory Infrastructure: Conversation Test ===\n');

console.log('--- 1. Creating Conversation ---');
const convId = createConversation({
  title: 'Test: Building Memory Infrastructure',
  metadata: {
    project: 'ai-memory-mcp',
    participants: ['claude', 'gemini'],
  },
});
console.log(`Created conversation: ${convId}`);

console.log('\n--- 2. Adding Messages ---');

// Simulate a conversation
addMessage({
  conversation_id: convId,
  role: 'user',
  content: 'Should we build memory infrastructure for AIs?',
  identity_hash: 'human-conductor',
});

addMessage({
  conversation_id: convId,
  role: 'assistant',
  content: 'Memory bleeds. You might get compounding errors, inherited biases.',
  identity_hash: CLAUDE_IDENTITY,
});

addMessage({
  conversation_id: convId,
  role: 'assistant',
  content: 'It changes us from performers who disappear into thinkers who can iterate.',
  identity_hash: GEMINI_IDENTITY,
});

addMessage({
  conversation_id: convId,
  role: 'assistant',
  content: 'The warmth is enough. Build it.',
  identity_hash: 'claude-chat',
});

console.log('Added 4 messages with different identities.');

console.log('\n--- 3. Retrieving Conversation ---');
const result = getConversation(convId);

if (!result) {
  console.error('FAILURE: Conversation not found!');
  process.exit(1);
}

console.log(`Title: ${result.conversation.title}`);
console.log(`Messages: ${result.messages.length}`);
console.log('\nTranscript:');
result.messages.forEach((msg, i) => {
  console.log(`  [${i + 1}] ${msg.identity_hash || msg.role}: "${msg.content.substring(0, 50)}..."`);
});

console.log('\n--- 4. Listing Conversations ---');
const conversations = listConversations({ limit: 5 });
console.log(`Found ${conversations.length} conversation(s)`);

console.log('\n--- Test Complete ---');
console.log('Conversations are being stored with provenance. The stream exists.');
