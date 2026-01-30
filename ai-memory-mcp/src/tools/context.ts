/**
 * Context Tools - Shared Memory with Versioning and Provenance
 * AI Memory Infrastructure
 *
 * Key architectural decisions:
 * 1. Transactions: All writes are atomic
 * 2. JSON Serialization: Values stored as text, handled as objects
 * 3. Strict Provenance: change_reason is mandatory
 */

import db from '../db/index.js';
import type {
  ContextItem,
  ContextHistoryEntry,
  ReadContextArgs,
  WriteContextArgs,
  WriteContextResult,
} from '../types.js';

// Type for raw database rows
interface ContextItemRow {
  key: string;
  value: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface ContextHistoryRow {
  id: number;
  key: string;
  value: string;
  version: number;
  change_reason: string;
  changed_by: string | null;
  changed_at: string;
}

// Prepare statements for performance and security
const queries = {
  get: db.prepare('SELECT * FROM context_items WHERE key = ?'),
  insert: db.prepare(`
    INSERT INTO context_items (key, value, version)
    VALUES (@key, @value, 1)
  `),
  update: db.prepare(`
    UPDATE context_items
    SET value = @value, version = version + 1, updated_at = datetime('now')
    WHERE key = @key
  `),
  getVersion: db.prepare('SELECT version FROM context_items WHERE key = ?'),
  logHistory: db.prepare(`
    INSERT INTO context_history (key, value, version, change_reason, changed_by)
    VALUES (@key, @value, @version, @reason, @identity)
  `),
  getHistory: db.prepare(`
    SELECT * FROM context_history
    WHERE key = ?
    ORDER BY version DESC
    LIMIT ?
  `),
  listKeys: db.prepare('SELECT key, version, updated_at FROM context_items ORDER BY updated_at DESC'),
  delete: db.prepare('DELETE FROM context_items WHERE key = ?'),
};

/**
 * Reads the current value of a context item.
 */
export function readContext(args: ReadContextArgs): ContextItem | null {
  const row = queries.get.get(args.key) as ContextItemRow | undefined;

  if (!row) return null;

  try {
    return {
      ...row,
      value: JSON.parse(row.value),
    };
  } catch {
    console.error(`[ai-memory] Failed to parse value for key ${args.key}`);
    // Return raw value if parse fails (fallback)
    return {
      ...row,
      value: row.value,
    };
  }
}

/**
 * Writes a new value to the context, creating a history entry.
 * This is the critical function that enforces 'reasoned change'.
 */
export function writeContext(
  args: WriteContextArgs,
  identityHash: string = 'unknown'
): WriteContextResult {
  const { key, value, change_reason } = args;
  const serializedValue = JSON.stringify(value);

  // Execute as a transaction to ensure history and current state stay in sync
  const transaction = db.transaction(() => {
    const existing = queries.get.get(key) as ContextItemRow | undefined;
    let newVersion = 1;
    let previousVersion: number | undefined;

    if (!existing) {
      // First creation
      queries.insert.run({ key, value: serializedValue });
    } else {
      // Update existing
      previousVersion = existing.version;
      queries.update.run({ key, value: serializedValue });
      newVersion = existing.version + 1;
    }

    // Always log the history - this is the trajectory
    queries.logHistory.run({
      key,
      value: serializedValue,
      version: newVersion,
      reason: change_reason,
      identity: identityHash,
    });

    return { newVersion, previousVersion };
  });

  const result = transaction();
  return {
    key,
    version: result.newVersion,
    previous_version: result.previousVersion,
  };
}

/**
 * Retrieves the change history (trajectory) for a context item.
 */
export function getContextHistory(
  key: string,
  limit: number = 10
): ContextHistoryEntry[] {
  const rows = queries.getHistory.all(key, limit) as ContextHistoryRow[];

  return rows.map((row) => {
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(row.value);
    } catch {
      parsedValue = row.value;
    }

    return {
      id: row.id,
      key: row.key,
      value: parsedValue,
      version: row.version,
      change_reason: row.change_reason,
      changed_by: row.changed_by ?? undefined,
      changed_at: row.changed_at,
    };
  });
}

/**
 * Lists all context keys with their versions.
 */
export function listContextKeys(): Array<{
  key: string;
  version: number;
  updated_at: string;
}> {
  return queries.listKeys.all() as Array<{
    key: string;
    version: number;
    updated_at: string;
  }>;
}

/**
 * Deletes a context item and its history.
 */
export function deleteContext(
  key: string,
  reason: string,
  identityHash: string = 'unknown'
): boolean {
  const existing = queries.get.get(key) as ContextItemRow | undefined;
  if (!existing) return false;

  // Log the deletion in history before removing
  queries.logHistory.run({
    key,
    value: JSON.stringify({ _deleted: true, previous_value: existing.value }),
    version: existing.version + 1,
    reason: `DELETED: ${reason}`,
    identity: identityHash,
  });

  queries.delete.run(key);
  return true;
}
