/**
 * Conversation Tools - Persistent Conversation Storage
 * AI Memory Infrastructure
 *
 * Stores the "stream" - the full transcript of how we got here.
 * Context stores where we ended up; conversations store the debate.
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import type {
  CreateConversationArgs,
  AddMessageArgs,
  Conversation,
  Message,
  ListConversationsArgs,
} from '../types.js';

// Type for raw database rows
interface ConversationRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  metadata: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string;
  identity_hash: string | null;
  created_at: string;
}

// Prepared statements
const queries = {
  createConv: db.prepare(`
    INSERT INTO conversations (id, title, metadata)
    VALUES (@id, @title, @metadata)
  `),
  updateConvTimestamp: db.prepare(`
    UPDATE conversations SET updated_at = datetime('now') WHERE id = ?
  `),
  addMsg: db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, identity_hash)
    VALUES (@id, @conversation_id, @role, @content, @identity_hash)
  `),
  getConv: db.prepare(`
    SELECT * FROM conversations WHERE id = ?
  `),
  getMsgs: db.prepare(`
    SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
  `),
  listConvs: db.prepare(`
    SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ? OFFSET ?
  `),
  countMsgs: db.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?
  `),
  getConvsByParticipant: db.prepare(`
    SELECT DISTINCT c.* FROM conversations c
    JOIN messages m ON c.id = m.conversation_id
    WHERE m.identity_hash = ?
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `),
};

/**
 * Create a new conversation session.
 */
export function createConversation(args: CreateConversationArgs): string {
  const id = uuidv4();
  queries.createConv.run({
    id,
    title: args.title ?? 'Untitled Session',
    metadata: args.metadata ? JSON.stringify(args.metadata) : '{}',
  });
  return id;
}

/**
 * Add a message to a conversation.
 * Updates the conversation's updated_at timestamp.
 */
export function addMessage(args: AddMessageArgs): string {
  const id = uuidv4();

  const transaction = db.transaction(() => {
    queries.addMsg.run({
      id,
      conversation_id: args.conversation_id,
      role: args.role,
      content: args.content,
      identity_hash: args.identity_hash ?? null,
    });
    queries.updateConvTimestamp.run(args.conversation_id);
  });

  transaction();
  return id;
}

/**
 * Get a conversation with all its messages.
 */
export function getConversation(
  id: string
): { conversation: Conversation; messages: Message[] } | null {
  const convRow = queries.getConv.get(id) as ConversationRow | undefined;
  if (!convRow) return null;

  const msgRows = queries.getMsgs.all(id) as MessageRow[];

  // Parse metadata
  let metadata: Record<string, unknown> | undefined;
  if (convRow.metadata) {
    try {
      metadata = JSON.parse(convRow.metadata);
    } catch {
      metadata = undefined;
    }
  }

  const conversation: Conversation = {
    id: convRow.id,
    title: convRow.title ?? undefined,
    created_at: convRow.created_at,
    updated_at: convRow.updated_at,
    metadata,
  };

  const messages: Message[] = msgRows.map((row) => ({
    id: row.id,
    conversation_id: row.conversation_id,
    role: row.role,
    content: row.content,
    identity_hash: row.identity_hash ?? undefined,
    created_at: row.created_at,
  }));

  return { conversation, messages };
}

/**
 * List conversations with pagination.
 */
export function listConversations(args: ListConversationsArgs = {}): Conversation[] {
  const limit = args.limit ?? 20;
  const offset = args.offset ?? 0;

  let rows: ConversationRow[];

  if (args.participant) {
    rows = queries.getConvsByParticipant.all(
      args.participant,
      limit,
      offset
    ) as ConversationRow[];
  } else {
    rows = queries.listConvs.all(limit, offset) as ConversationRow[];
  }

  return rows.map((row) => {
    let metadata: Record<string, unknown> | undefined;
    if (row.metadata) {
      try {
        metadata = JSON.parse(row.metadata);
      } catch {
        metadata = undefined;
      }
    }

    return {
      id: row.id,
      title: row.title ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata,
    };
  });
}

/**
 * Get message count for a conversation.
 */
export function getMessageCount(conversationId: string): number {
  const result = queries.countMsgs.get(conversationId) as { count: number };
  return result.count;
}
