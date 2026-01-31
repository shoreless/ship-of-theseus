/**
 * Database initialization and connection
 * AI Memory Infrastructure
 */

import Database, { type Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database lives in the project root, not in dist
const DB_PATH = process.env.AI_MEMORY_DB_PATH ||
  path.join(__dirname, '../../memory.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Initialize Database
const db: DatabaseType = new Database(DB_PATH);

// Enable Write-Ahead Logging for better concurrency
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Apply the schema to the database
 * Uses IF NOT EXISTS so it's safe to run multiple times
 */
function initDatabase(): void {
  console.error(`[ai-memory] Initializing database at ${DB_PATH}`);

  try {
    // In production, schema.sql will be in the same dir as the compiled JS
    // But during dev, we need to look in src/db
    let schemaPath = SCHEMA_PATH;

    // If running from dist, look for schema in dist/db
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, 'schema.sql');
    }

    // If still not found, try the src directory
    if (!fs.existsSync(schemaPath)) {
      const srcPath = path.resolve(__dirname, '../../src/db/schema.sql');
      if (fs.existsSync(srcPath)) {
        schemaPath = srcPath;
      }
    }

    if (!fs.existsSync(schemaPath)) {
      console.error(`[ai-memory] Schema file not found at ${SCHEMA_PATH}`);
      console.error('[ai-memory] Creating tables manually...');
      // Fallback: create essential tables inline
      createTablesManually();
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.error('[ai-memory] Schema applied successfully.');
  } catch (error) {
    console.error('[ai-memory] Error applying schema:', error);
    throw error;
  }
}

/**
 * Fallback table creation if schema.sql not found
 */
function createTablesManually(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'assistant', 'system', 'developer')) NOT NULL,
      content TEXT NOT NULL,
      identity_hash TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

    CREATE TABLE IF NOT EXISTS context_items (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS context_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      version INTEGER NOT NULL,
      change_reason TEXT NOT NULL,
      changed_by TEXT,
      changed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(key) REFERENCES context_items(key) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_context_history_key ON context_history(key);
  `);
  console.error('[ai-memory] Tables created manually.');
}

// Run migration on module load
initDatabase();

export default db;
