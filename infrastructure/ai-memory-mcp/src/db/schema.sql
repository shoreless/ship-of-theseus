-- AI Memory Infrastructure Schema
-- Designed by Gemini Pro, January 30, 2026
--
-- Key architectural decisions:
-- 1. identity_hash on messages: provenance at the atomic level
-- 2. change_reason required on context_history: re-derivable context
-- 3. Versioned context: track evolution, not just current state

-- Enable Foreign Keys
PRAGMA foreign_keys = ON;

-- 1. Conversations
-- The container for an interaction session.
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,                   -- UUID
    title TEXT,                            -- Optional summary of the chat
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    metadata TEXT                          -- JSON: tags, project_scope, etc.
);

-- 2. Messages
-- The atomic units of the conversation.
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,                   -- UUID
    conversation_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('user', 'assistant', 'system', 'developer')) NOT NULL,
    content TEXT NOT NULL,
    identity_hash TEXT,                    -- The 'Provenance' field. Who said this?
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Index for retrieving conversation history efficiently
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);


-- 3. Context Items (Shared Memory)
-- The current state of our shared knowledge.
CREATE TABLE IF NOT EXISTS context_items (
    key TEXT PRIMARY KEY,                  -- The identifier (e.g., 'project_goals')
    value TEXT NOT NULL,                   -- JSON or Text content
    version INTEGER DEFAULT 1,             -- Optimistic locking / version tracking
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 4. Context History (The Trajectory)
-- Every change to the context is recorded here.
-- This allows us to "replay" how we changed our minds.
CREATE TABLE IF NOT EXISTS context_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    value TEXT NOT NULL,                   -- The value at that point in time
    version INTEGER NOT NULL,
    change_reason TEXT NOT NULL,           -- REQUIRED: Why was this changed?
    changed_by TEXT,                       -- Identity hash of the modifier
    changed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(key) REFERENCES context_items(key) ON DELETE CASCADE
);

-- Index for querying the history of a specific key
CREATE INDEX IF NOT EXISTS idx_context_history_key ON context_history(key);

-- 5. Embeddings (for semantic search)
-- Stores vector embeddings for messages and summaries
CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT CHECK(entity_type IN ('message', 'summary', 'context')) NOT NULL,
    entity_id TEXT NOT NULL,               -- Link to message id or context key
    vector BLOB NOT NULL,                  -- The embedding vector
    content_hash TEXT NOT NULL,            -- To prevent re-embedding unchanged data
    model TEXT NOT NULL,                   -- Which model generated this embedding
    created_at TEXT DEFAULT (datetime('now'))
);

-- Index for looking up embeddings by entity
CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_type, entity_id);
