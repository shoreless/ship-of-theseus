#!/usr/bin/env python3
"""
Index Builder session transcripts for Ship of Theseus.

Scans Claude Code's project directories for .jsonl session files,
identifies which belong to this project, extracts compaction summaries,
and builds both an index JSON and a searchable SQLite database.

Usage:
    python3 index-sessions.py
"""

import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from hashlib import sha256

# Where Claude Code stores session transcripts
CLAUDE_PROJECT_DIRS = [
    Path.home() / ".claude" / "projects" / "-Users-shaz-Sites",
    Path.home() / ".claude" / "projects" / "-Users-shaz-Sites-ship-of-theseus",
]

# Project markers — if a file contains these, it's ours
PROJECT_MARKERS = [
    "ship-of-theseus",
    "Ship of Theseus",
    "KINDLING.md",
    "the Builder",
]

# Where to write output
SCRIPT_DIR = Path(__file__).parent
INDEX_DIR = SCRIPT_DIR / "sessions"
INDEX_FILE = INDEX_DIR / "index.json"
DB_FILE = INDEX_DIR / "builder-archive.db"

# How many lines to scan before giving up on identification
SCAN_LIMIT = 200

# Batch size for SQLite inserts
BATCH_SIZE = 500

# Record types we extract messages from
MESSAGE_TYPES = {"user", "assistant", "summary"}

# Record types we skip entirely
SKIP_TYPES = {"progress", "file-history-snapshot", "queue-operation", "system", "custom-title"}

DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    size_mb REAL,
    modified TEXT,
    total_lines INTEGER,
    compaction_count INTEGER,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    uuid TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT,
    line_number INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

CREATE TABLE IF NOT EXISTS compaction_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    line_number INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
);
"""

FTS_SCHEMA = """
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    text,
    uuid UNINDEXED,
    session_id UNINDEXED,
    role UNINDEXED
);
"""


def identify_session(filepath: Path) -> bool:
    """Check if a .jsonl file belongs to Ship of Theseus."""
    size = filepath.stat().st_size

    if size > 5 * 1024 * 1024:
        try:
            with open(filepath, "rb") as f:
                while chunk := f.read(1024 * 1024):
                    for marker in PROJECT_MARKERS:
                        if marker.encode() in chunk:
                            return True
        except OSError:
            return False
        return False

    try:
        with open(filepath) as f:
            for i, line in enumerate(f):
                if i >= SCAN_LIMIT:
                    break
                for marker in PROJECT_MARKERS:
                    if marker in line:
                        return True
    except (OSError, UnicodeDecodeError):
        return False
    return False


def extract_user_text(record: dict) -> str | None:
    """Extract Conductor's text from a user record. Returns None for tool_results."""
    msg = record.get("message", {})
    if not isinstance(msg, dict):
        return None
    content = msg.get("content", "")
    if isinstance(content, str) and content.strip():
        return content.strip()
    return None


def extract_assistant_text(record: dict) -> str | None:
    """Extract Builder's visible text from an assistant record. No thinking blocks."""
    msg = record.get("message", {})
    if not isinstance(msg, dict):
        return None
    content = msg.get("content", [])
    if not isinstance(content, list):
        return None
    texts = []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            text = block.get("text", "").strip()
            if text:
                texts.append(text)
    return "\n\n".join(texts) if texts else None


def extract_metadata(filepath: Path) -> dict:
    """Extract session metadata: compaction summaries, record counts, date range."""
    summaries = []
    record_counts = {}
    first_user_msg = None
    last_user_msg = None
    total_lines = 0

    try:
        with open(filepath) as f:
            for i, line in enumerate(f):
                total_lines += 1
                try:
                    d = json.loads(line)
                except json.JSONDecodeError:
                    continue

                record_type = d.get("type", "unknown")
                record_counts[record_type] = record_counts.get(record_type, 0) + 1

                if record_type == "summary":
                    summaries.append({
                        "line": i,
                        "summary": d.get("summary", ""),
                    })

                elif record_type == "user":
                    msg = d.get("message", {})
                    if isinstance(msg, dict):
                        content = str(msg.get("content", ""))[:200]
                    else:
                        content = str(msg)[:200]

                    if first_user_msg is None:
                        first_user_msg = content
                    last_user_msg = content

    except (OSError, UnicodeDecodeError) as e:
        return {"error": str(e)}

    stat = filepath.stat()

    return {
        "file": str(filepath),
        "filename": filepath.name,
        "size_mb": round(stat.st_size / (1024 * 1024), 1),
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "total_lines": total_lines,
        "record_counts": record_counts,
        "compaction_count": len(summaries),
        "compaction_summaries": summaries,
        "first_user_message": first_user_msg,
        "last_user_message": last_user_msg,
    }


def init_db(db_path: Path) -> sqlite3.Connection:
    """Create or open the builder-archive database."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(DB_SCHEMA)

    # FTS table needs special handling — check if it exists
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='messages_fts'"
    )
    if cursor.fetchone() is None:
        conn.executescript(FTS_SCHEMA)

    conn.commit()
    return conn


def process_session_to_db(conn: sqlite3.Connection, filepath: Path, session_id: str):
    """Stream a JSONL file, inserting user/assistant/summary records into SQLite."""
    messages_batch = []
    summaries_batch = []
    first_ts = None
    last_ts = None
    total_lines = 0

    # Insert placeholder session record so FK constraints are satisfied during batch inserts
    conn.execute(
        """INSERT OR IGNORE INTO sessions
           (session_id, filename, size_mb, modified, total_lines, compaction_count)
           VALUES (?, ?, 0, '', 0, 0)""",
        (session_id, filepath.name),
    )

    with open(filepath) as f:
        for line_num, line in enumerate(f):
            total_lines += 1
            try:
                d = json.loads(line)
            except json.JSONDecodeError:
                continue

            record_type = d.get("type", "")
            if record_type in SKIP_TYPES:
                continue

            ts = d.get("timestamp", "")
            uuid = d.get("uuid", "")

            if record_type == "user":
                text = extract_user_text(d)
                if text:
                    if not uuid:
                        uuid = sha256(f"{session_id}:user:{line_num}".encode()).hexdigest()[:32]
                    messages_batch.append((uuid, session_id, "user", text, ts, line_num))
                    if first_ts is None:
                        first_ts = ts
                    last_ts = ts

            elif record_type == "assistant":
                text = extract_assistant_text(d)
                if text:
                    if not uuid:
                        uuid = sha256(f"{session_id}:assistant:{line_num}".encode()).hexdigest()[:32]
                    messages_batch.append((uuid, session_id, "assistant", text, ts, line_num))
                    if first_ts is None:
                        first_ts = ts
                    last_ts = ts

            elif record_type == "summary":
                summary_text = d.get("summary", "")
                if summary_text:
                    summaries_batch.append((session_id, summary_text, line_num))
                    # Also add summaries as searchable messages
                    sum_uuid = d.get("uuid", "") or sha256(
                        f"{session_id}:summary:{line_num}".encode()
                    ).hexdigest()[:32]
                    messages_batch.append((sum_uuid, session_id, "summary", summary_text, ts, line_num))

            # Flush batch
            if len(messages_batch) >= BATCH_SIZE:
                conn.executemany(
                    "INSERT OR REPLACE INTO messages (uuid, session_id, role, text, timestamp, line_number) VALUES (?, ?, ?, ?, ?, ?)",
                    messages_batch,
                )
                messages_batch = []

    # Flush remaining
    if messages_batch:
        conn.executemany(
            "INSERT OR REPLACE INTO messages (uuid, session_id, role, text, timestamp, line_number) VALUES (?, ?, ?, ?, ?, ?)",
            messages_batch,
        )
    if summaries_batch:
        conn.executemany(
            "INSERT OR REPLACE INTO compaction_summaries (session_id, summary, line_number) VALUES (?, ?, ?)",
            summaries_batch,
        )

    # Update session record
    stat = filepath.stat()
    compaction_count = len(summaries_batch)
    conn.execute(
        """INSERT OR REPLACE INTO sessions
           (session_id, filename, size_mb, modified, total_lines, compaction_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            session_id,
            filepath.name,
            round(stat.st_size / (1024 * 1024), 1),
            datetime.fromtimestamp(stat.st_mtime).isoformat(),
            total_lines,
            compaction_count,
            first_ts,
            last_ts,
        ),
    )

    conn.commit()


def rebuild_fts(conn: sqlite3.Connection):
    """Rebuild the FTS5 index from the messages table."""
    print("  Rebuilding FTS index...", end=" ")
    conn.execute("DELETE FROM messages_fts")
    conn.execute(
        """INSERT INTO messages_fts (text, uuid, session_id, role)
           SELECT text, uuid, session_id, role FROM messages"""
    )
    conn.commit()
    print("done")


def main():
    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    # Find all .jsonl files
    all_files = []
    for dir_path in CLAUDE_PROJECT_DIRS:
        if dir_path.exists():
            all_files.extend(dir_path.glob("*.jsonl"))

    # Deduplicate by filename
    seen = set()
    unique_files = []
    for f in all_files:
        if f.name not in seen:
            seen.add(f.name)
            unique_files.append(f)

    print(f"Found {len(unique_files)} session files across {len(CLAUDE_PROJECT_DIRS)} directories")

    # Initialize database
    conn = init_db(DB_FILE)

    # Identify and index ship-of-theseus sessions
    sessions = []
    ship_files = []
    for filepath in sorted(unique_files, key=lambda f: f.stat().st_mtime, reverse=True):
        print(f"  Scanning {filepath.name} ({filepath.stat().st_size / (1024*1024):.1f}MB)...", end=" ")

        if identify_session(filepath):
            print("SHIP", end=" ")
            metadata = extract_metadata(filepath)
            sessions.append(metadata)
            ship_files.append(filepath)
            print(f"({metadata.get('compaction_count', 0)} compactions)")
        else:
            print("skip")

    # Write JSON index (backwards compatible)
    index = {
        "generated": datetime.now().isoformat(),
        "session_count": len(sessions),
        "total_size_mb": round(sum(s.get("size_mb", 0) for s in sessions), 1),
        "sessions": sessions,
    }

    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)

    print(f"\nIndexed {len(sessions)} Ship of Theseus sessions ({index['total_size_mb']}MB total)")
    print(f"Index written to {INDEX_FILE}")

    # Build SQLite database
    print(f"\nBuilding searchable database...")
    for filepath in ship_files:
        session_id = filepath.stem  # UUID filename without .jsonl
        print(f"  Processing {filepath.name}...", end=" ")
        process_session_to_db(conn, filepath, session_id)
        msg_count = conn.execute(
            "SELECT COUNT(*) FROM messages WHERE session_id = ?", (session_id,)
        ).fetchone()[0]
        print(f"{msg_count} messages")

    # Rebuild FTS
    rebuild_fts(conn)

    # Print summary
    total_messages = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
    total_users = conn.execute("SELECT COUNT(*) FROM messages WHERE role = 'user'").fetchone()[0]
    total_asst = conn.execute("SELECT COUNT(*) FROM messages WHERE role = 'assistant'").fetchone()[0]
    total_summaries = conn.execute("SELECT COUNT(*) FROM messages WHERE role = 'summary'").fetchone()[0]

    print(f"\nDatabase: {DB_FILE}")
    print(f"Total messages: {total_messages} (user: {total_users}, assistant: {total_asst}, summaries: {total_summaries})")

    # Compaction timeline
    total_compactions = sum(s.get("compaction_count", 0) for s in sessions)
    print(f"Total compaction summaries: {total_compactions}")

    if sessions:
        print("\nCompaction timeline:")
        for session in sessions:
            for cs in session.get("compaction_summaries", []):
                print(f"  [{session['filename'][:8]}...:{cs['line']:>6}] {cs['summary'][:80]}")

    # Test FTS
    print("\nFTS test — searching for 'kindling':")
    results = conn.execute(
        "SELECT uuid, role, substr(text, 1, 100) FROM messages_fts WHERE messages_fts MATCH 'kindling' LIMIT 3"
    ).fetchall()
    for r in results:
        print(f"  [{r[1]}] {r[2]}...")

    conn.close()


if __name__ == "__main__":
    main()
