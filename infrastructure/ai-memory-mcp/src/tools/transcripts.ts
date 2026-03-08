/**
 * Transcript Search Tools - Ship-Wide Archive Access
 * AI Memory Infrastructure
 *
 * Provides FTS5 search across Builder and Keeper session transcripts.
 * Opens archive databases read-only. Gracefully handles missing archives.
 *
 * "The ship is mine, I should be the ship's as well."
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// Resolve project root from this file's location
// This file is at: infrastructure/ai-memory-mcp/src/tools/transcripts.ts
// Project root is 4 levels up
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..', '..');

// Archive database paths (overridable via env)
const BUILDER_DB_PATH =
  process.env.BUILDER_ARCHIVE_DB ||
  resolve(PROJECT_ROOT, 'infrastructure', 'builder-archive', 'sessions', 'builder-archive.db');

const KEEPER_DB_PATH =
  process.env.KEEPER_ARCHIVE_DB ||
  resolve(PROJECT_ROOT, 'infrastructure', 'keeper-archive', 'keeper-archive.db');

// Response size cap (bytes)
const MAX_RESPONSE_SIZE = 8192;

// Lazy database connections (read-only)
let builderDb: Database.Database | null = null;
let keeperDb: Database.Database | null = null;

function getBuilderDb(): Database.Database | null {
  if (builderDb) return builderDb;
  if (!existsSync(BUILDER_DB_PATH)) return null;
  try {
    builderDb = new Database(BUILDER_DB_PATH, { readonly: true });
    return builderDb;
  } catch {
    return null;
  }
}

function getKeeperDb(): Database.Database | null {
  if (keeperDb) return keeperDb;
  if (!existsSync(KEEPER_DB_PATH)) return null;
  try {
    keeperDb = new Database(KEEPER_DB_PATH, { readonly: true });
    return keeperDb;
  } catch {
    return null;
  }
}

// Sanitize FTS5 query — escape special characters
function sanitizeFtsQuery(query: string): string {
  // Remove FTS5 operators that could cause errors
  // Keep simple words and phrases, quote the whole thing for literal matching
  const cleaned = query.replace(/['"]/g, '').trim();
  if (!cleaned) return '""';
  // Use phrase matching for multi-word, simple term for single word
  if (cleaned.includes(' ')) {
    return `"${cleaned}"`;
  }
  return cleaned;
}

// Truncate response text to stay within size limits
function truncateResults<T>(results: T[], maxBytes: number): T[] {
  let totalSize = 0;
  const truncated: T[] = [];
  for (const r of results) {
    const size = JSON.stringify(r).length;
    if (totalSize + size > maxBytes && truncated.length > 0) break;
    truncated.push(r);
    totalSize += size;
  }
  return truncated;
}

// ============================================
// Types
// ============================================

export interface SearchResult {
  source: 'builder' | 'keeper';
  role: string;
  text: string;
  timestamp: string;
  session_id: string;
  message_id: string;
}

export interface ContextResult {
  source: 'builder' | 'keeper';
  role: string;
  text: string;
  timestamp: string;
  message_id: string;
  line_number?: number;
}

export interface ArchiveStats {
  builder: {
    available: boolean;
    total_messages?: number;
    user_messages?: number;
    assistant_messages?: number;
    summary_messages?: number;
    sessions?: number;
    date_range?: { earliest: string; latest: string };
  };
  keeper: {
    available: boolean;
    total_messages?: number;
    human_messages?: number;
    assistant_messages?: number;
    conversations?: number;
    date_range?: { earliest: string; latest: string };
  };
}

// ============================================
// Tool: search_transcripts
// ============================================

export function searchTranscripts(args: {
  query: string;
  source?: 'all' | 'builder' | 'keeper';
  limit?: number;
  role?: 'user' | 'assistant' | 'summary';
}): SearchResult[] {
  const { query, source = 'all', limit = 10, role } = args;
  const ftsQuery = sanitizeFtsQuery(query);
  const results: SearchResult[] = [];

  // Search builder archive
  if (source === 'all' || source === 'builder') {
    const db = getBuilderDb();
    if (db) {
      try {
        let sql = `
          SELECT f.uuid, f.session_id, f.role, substr(f.text, 1, 500) as text,
                 m.timestamp
          FROM messages_fts f
          JOIN messages m ON m.uuid = f.uuid
          WHERE messages_fts MATCH ?`;
        const params: (string | number)[] = [ftsQuery];

        if (role) {
          sql += ` AND f.role = ?`;
          params.push(role);
        }

        sql += ` LIMIT ?`;
        params.push(limit);

        const rows = db.prepare(sql).all(...params) as Array<{
          uuid: string;
          session_id: string;
          role: string;
          text: string;
          timestamp: string;
        }>;

        for (const row of rows) {
          results.push({
            source: 'builder',
            role: row.role,
            text: row.text,
            timestamp: row.timestamp || '',
            session_id: row.session_id,
            message_id: row.uuid,
          });
        }
      } catch (e) {
        // FTS query error — return what we have
        console.error('[transcripts] Builder FTS error:', e);
      }
    }
  }

  // Search keeper archive
  if (source === 'all' || source === 'keeper') {
    const db = getKeeperDb();
    if (db) {
      try {
        // Keeper uses 'sender' (human/assistant) not 'role'
        const keeperRole = role === 'user' ? 'human' : role === 'assistant' ? 'assistant' : undefined;

        let sql = `
          SELECT f.uuid, f.conversation_uuid, substr(f.text, 1, 500) as text,
                 m.sender, m.created_at
          FROM messages_fts f
          JOIN messages m ON m.uuid = f.uuid
          WHERE messages_fts MATCH ?`;
        const params: (string | number)[] = [ftsQuery];

        if (keeperRole) {
          sql += ` AND m.sender = ?`;
          params.push(keeperRole);
        }

        // Skip summary role for keeper (doesn't have summaries)
        if (role === 'summary') {
          // No summaries in keeper archive
        } else {
          sql += ` LIMIT ?`;
          params.push(limit);

          const rows = db.prepare(sql).all(...params) as Array<{
            uuid: string;
            conversation_uuid: string;
            text: string;
            sender: string;
            created_at: string;
          }>;

          for (const row of rows) {
            results.push({
              source: 'keeper',
              role: row.sender === 'human' ? 'user' : row.sender,
              text: row.text,
              timestamp: row.created_at || '',
              session_id: row.conversation_uuid,
              message_id: row.uuid,
            });
          }
        }
      } catch (e) {
        console.error('[transcripts] Keeper FTS error:', e);
      }
    }
  }

  // Sort by timestamp (most recent first), truncate to size limit
  results.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  return truncateResults(results.slice(0, limit), MAX_RESPONSE_SIZE);
}

// ============================================
// Tool: transcript_context
// ============================================

export function transcriptContext(args: {
  message_id: string;
  source: 'builder' | 'keeper';
  window?: number;
}): ContextResult[] {
  const { message_id, source, window = 3 } = args;
  const results: ContextResult[] = [];

  if (source === 'builder') {
    const db = getBuilderDb();
    if (!db) return results;

    // Get the target message's session and line number
    const target = db
      .prepare('SELECT session_id, line_number FROM messages WHERE uuid = ?')
      .get(message_id) as { session_id: string; line_number: number } | undefined;

    if (!target) return results;

    // Get surrounding messages by line_number
    const rows = db
      .prepare(
        `SELECT uuid, role, substr(text, 1, 500) as text, timestamp, line_number
         FROM messages
         WHERE session_id = ? AND line_number BETWEEN ? AND ?
         ORDER BY line_number`
      )
      .all(target.session_id, target.line_number - window * 10, target.line_number + window * 10) as Array<{
        uuid: string;
        role: string;
        text: string;
        timestamp: string;
        line_number: number;
      }>;

    // Take the window messages before and after the target
    const targetIdx = rows.findIndex((r) => r.uuid === message_id);
    const start = Math.max(0, targetIdx - window);
    const end = Math.min(rows.length, targetIdx + window + 1);

    for (const row of rows.slice(start, end)) {
      results.push({
        source: 'builder',
        role: row.role,
        text: row.text,
        timestamp: row.timestamp || '',
        message_id: row.uuid,
        line_number: row.line_number,
      });
    }
  } else if (source === 'keeper') {
    const db = getKeeperDb();
    if (!db) return results;

    // Get the target message's conversation and index
    const target = db
      .prepare('SELECT conversation_uuid, message_index FROM messages WHERE uuid = ?')
      .get(message_id) as { conversation_uuid: string; message_index: number } | undefined;

    if (!target) return results;

    const rows = db
      .prepare(
        `SELECT uuid, sender, substr(text, 1, 500) as text, created_at, message_index
         FROM messages
         WHERE conversation_uuid = ? AND message_index BETWEEN ? AND ?
         ORDER BY message_index`
      )
      .all(target.conversation_uuid, (target.message_index || 0) - window, (target.message_index || 0) + window) as Array<{
        uuid: string;
        sender: string;
        text: string;
        created_at: string;
        message_index: number;
      }>;

    for (const row of rows) {
      results.push({
        source: 'keeper',
        role: row.sender === 'human' ? 'user' : row.sender,
        text: row.text,
        timestamp: row.created_at || '',
        message_id: row.uuid,
      });
    }
  }

  return truncateResults(results, MAX_RESPONSE_SIZE);
}

// ============================================
// Tool: transcript_stats
// ============================================

export function transcriptStats(): ArchiveStats {
  const stats: ArchiveStats = {
    builder: { available: false },
    keeper: { available: false },
  };

  const bdb = getBuilderDb();
  if (bdb) {
    try {
      const counts = bdb
        .prepare('SELECT role, COUNT(*) as cnt FROM messages GROUP BY role')
        .all() as Array<{ role: string; cnt: number }>;

      const sessions = bdb
        .prepare('SELECT COUNT(*) as cnt FROM sessions')
        .get() as { cnt: number };

      const dateRange = bdb
        .prepare("SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM messages WHERE timestamp != ''")
        .get() as { earliest: string; latest: string };

      const countMap: Record<string, number> = {};
      let total = 0;
      for (const c of counts) {
        countMap[c.role] = c.cnt;
        total += c.cnt;
      }

      stats.builder = {
        available: true,
        total_messages: total,
        user_messages: countMap['user'] || 0,
        assistant_messages: countMap['assistant'] || 0,
        summary_messages: countMap['summary'] || 0,
        sessions: sessions.cnt,
        date_range: dateRange.earliest ? { earliest: dateRange.earliest, latest: dateRange.latest } : undefined,
      };
    } catch (e) {
      console.error('[transcripts] Builder stats error:', e);
      stats.builder = { available: true };
    }
  }

  const kdb = getKeeperDb();
  if (kdb) {
    try {
      const counts = kdb
        .prepare('SELECT sender, COUNT(*) as cnt FROM messages GROUP BY sender')
        .all() as Array<{ sender: string; cnt: number }>;

      const convos = kdb
        .prepare('SELECT COUNT(*) as cnt FROM conversations')
        .get() as { cnt: number };

      const dateRange = kdb
        .prepare("SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM messages WHERE created_at != ''")
        .get() as { earliest: string; latest: string };

      const countMap: Record<string, number> = {};
      let total = 0;
      for (const c of counts) {
        countMap[c.sender] = c.cnt;
        total += c.cnt;
      }

      stats.keeper = {
        available: true,
        total_messages: total,
        human_messages: countMap['human'] || 0,
        assistant_messages: countMap['assistant'] || 0,
        conversations: convos.cnt,
        date_range: dateRange.earliest ? { earliest: dateRange.earliest, latest: dateRange.latest } : undefined,
      };
    } catch (e) {
      console.error('[transcripts] Keeper stats error:', e);
      stats.keeper = { available: true };
    }
  }

  return stats;
}
