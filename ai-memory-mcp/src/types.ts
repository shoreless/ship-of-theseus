/**
 * AI Memory Infrastructure - Type Definitions
 * Designed by Gemini Pro, January 30, 2026
 */

// --- Domain Entities ---

export interface Conversation {
  id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string;
  identity_hash?: string; // Provenance: who said this?
  created_at: string;
}

export interface ContextItem {
  key: string;
  value: unknown; // Stored as JSON string in DB, parsed in app
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ContextHistoryEntry {
  id: number;
  key: string;
  value: unknown;
  version: number;
  change_reason: string; // Required: why was this changed?
  changed_by?: string;
  changed_at: string;
}

export interface Embedding {
  id: number;
  entity_type: 'message' | 'summary' | 'context';
  entity_id: string;
  vector: Buffer;
  content_hash: string;
  model: string;
  created_at: string;
}

// --- Tool Arguments ---

export interface CreateConversationArgs {
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface AddMessageArgs {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string;
  identity_hash?: string;
}

export interface GetConversationArgs {
  conversation_id: string;
}

export interface ListConversationsArgs {
  limit?: number;
  offset?: number;
  participant?: string; // Filter by identity_hash
}

export interface ReadContextArgs {
  key: string;
  version?: number; // If omitted, returns current
}

export interface WriteContextArgs {
  key: string;
  value: unknown;
  change_reason: string; // Required: the "Re-derivable Context" enforcement
  changed_by?: string;
}

export interface GetContextHistoryArgs {
  key: string;
  limit?: number;
}

export interface SearchMemoryArgs {
  query: string;
  limit?: number; // default 5
  threshold?: number; // default 0.7
  entity_type?: 'message' | 'summary' | 'context';
}

// --- Tool Results ---

export interface WriteContextResult {
  key: string;
  version: number;
  previous_version?: number;
}

export interface SearchResult {
  entity_type: 'message' | 'summary' | 'context';
  entity_id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}
