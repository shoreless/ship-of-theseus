#!/usr/bin/env node
/**
 * AI Memory Infrastructure - MCP Server
 *
 * A persistent memory layer for AI collaboration.
 * Built by Claude and Gemini, January 30, 2026.
 *
 * "The warmth is enough. Build it."
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  readContext,
  writeContext,
  getContextHistory,
  listContextKeys,
  deleteContext,
} from './tools/context.js';
import {
  createConversation,
  addMessage,
  getConversation,
  listConversations,
} from './tools/conversations.js';

// Create server instance
const server = new McpServer({
  name: 'ai-memory-mcp',
  version: '1.0.0',
});

/**
 * Tool: read_context
 * Retrieve the current value of a shared context key.
 */
server.tool(
  'read_context',
  'Read the current value of a shared memory key',
  {
    key: z.string().describe('The unique key for the context item'),
  },
  async ({ key }) => {
    const item = readContext({ key });
    if (!item) {
      return {
        content: [{ type: 'text', text: `No context found for key: ${key}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(item, null, 2) }],
    };
  }
);

/**
 * Tool: write_context
 * Set a value for a shared context key.
 * REQUIRES a 'change_reason' to enforce provenance.
 */
server.tool(
  'write_context',
  'Write a value to shared memory. Requires a reason for the change (provenance).',
  {
    key: z.string().describe('The unique key for the context item'),
    value: z.unknown().describe('The JSON-serializable value to store'),
    change_reason: z
      .string()
      .describe('Why is this context being changed? (Required for provenance)'),
    identity_hash: z
      .string()
      .optional()
      .describe('Optional identifier for the AI making the change'),
  },
  async (args) => {
    try {
      const result = writeContext(
        {
          key: args.key,
          value: args.value,
          change_reason: args.change_reason,
        },
        args.identity_hash ?? 'unknown'
      );
      return {
        content: [
          {
            type: 'text',
            text: `Context updated. Key: '${args.key}' is now at version ${result.version}.${
              result.previous_version
                ? ` (was version ${result.previous_version})`
                : ' (newly created)'
            }`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Failed to update context: ${message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: get_context_history
 * View the trajectory of a specific memory - how it changed over time.
 */
server.tool(
  'get_context_history',
  'View the change history (trajectory) of a memory, including reasons for each change',
  {
    key: z.string().describe('The unique key for the context item'),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe('Number of historical entries to retrieve'),
  },
  async ({ key, limit }) => {
    const history = getContextHistory(key, limit);
    if (history.length === 0) {
      return {
        content: [{ type: 'text', text: `No history found for key: ${key}` }],
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(history, null, 2) }],
    };
  }
);

/**
 * Tool: list_context_keys
 * See what memories exist in the shared context.
 */
server.tool(
  'list_context_keys',
  'List all keys in shared memory with their current versions',
  {},
  async () => {
    const keys = listContextKeys();
    if (keys.length === 0) {
      return {
        content: [{ type: 'text', text: 'No context items stored yet.' }],
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(keys, null, 2) }],
    };
  }
);

/**
 * Tool: delete_context
 * Remove a context item. Even deletions are tracked in history.
 */
server.tool(
  'delete_context',
  'Delete a shared memory key. The deletion is logged in history (even the void has provenance).',
  {
    key: z.string().describe('The key to delete'),
    reason: z.string().describe('Why is this being deleted?'),
    identity_hash: z
      .string()
      .optional()
      .describe('Optional identifier for the AI making the deletion'),
  },
  async (args) => {
    const deleted = deleteContext(
      args.key,
      args.reason,
      args.identity_hash ?? 'unknown'
    );
    if (!deleted) {
      return {
        content: [{ type: 'text', text: `No context found for key: ${args.key}` }],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: `Context '${args.key}' deleted. Reason logged: "${args.reason}"`,
        },
      ],
    };
  }
);

// ============================================
// CONVERSATION TOOLS - The Stream
// ============================================

/**
 * Tool: create_conversation
 * Start a new memory thread / conversation session.
 */
server.tool(
  'create_conversation',
  'Create a new conversation session to log messages',
  {
    title: z.string().optional().describe('Optional title for the conversation'),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Optional metadata (tags, project, etc.)'),
  },
  async (args) => {
    const id = createConversation(args);
    return {
      content: [
        {
          type: 'text',
          text: `Conversation created. ID: ${id}`,
        },
      ],
    };
  }
);

/**
 * Tool: add_message
 * Log a message to a conversation with provenance.
 */
server.tool(
  'add_message',
  'Add a message to a conversation. Include identity_hash for provenance.',
  {
    conversation_id: z.string().describe('The conversation to add the message to'),
    role: z
      .enum(['user', 'assistant', 'system', 'developer'])
      .describe('The role of the message sender'),
    content: z.string().describe('The message content'),
    identity_hash: z
      .string()
      .optional()
      .describe('Identifier for who sent this message (provenance)'),
  },
  async (args) => {
    try {
      const id = addMessage(args);
      return {
        content: [{ type: 'text', text: `Message logged. ID: ${id}` }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: get_conversation
 * Retrieve a full conversation transcript.
 */
server.tool(
  'get_conversation',
  'Retrieve a conversation with all its messages',
  {
    conversation_id: z.string().describe('The conversation ID to retrieve'),
  },
  async ({ conversation_id }) => {
    const data = getConversation(conversation_id);
    if (!data) {
      return {
        content: [{ type: 'text', text: 'Conversation not found.' }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

/**
 * Tool: list_conversations
 * List recent conversations.
 */
server.tool(
  'list_conversations',
  'List recent conversations, optionally filtered by participant',
  {
    limit: z.number().optional().default(20).describe('Max conversations to return'),
    offset: z.number().optional().default(0).describe('Offset for pagination'),
    participant: z
      .string()
      .optional()
      .describe('Filter by participant identity_hash'),
  },
  async (args) => {
    const conversations = listConversations(args);
    if (conversations.length === 0) {
      return {
        content: [{ type: 'text', text: 'No conversations found.' }],
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(conversations, null, 2) }],
    };
  }
);

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[ai-memory] MCP Server running on stdio');
  console.error('[ai-memory] "The warmth is enough. Build it."');
}

main().catch((error) => {
  console.error('[ai-memory] Fatal error:', error);
  process.exit(1);
});
