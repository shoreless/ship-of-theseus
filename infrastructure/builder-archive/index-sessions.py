#!/usr/bin/env python3
"""
Index Builder session transcripts for Ship of Theseus.

Scans Claude Code's project directories for .jsonl session files,
identifies which belong to this project, extracts compaction summaries,
and builds an index the Archivist can use.

Usage:
    python3 index-sessions.py
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

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

# Where to write the index
SCRIPT_DIR = Path(__file__).parent
INDEX_DIR = SCRIPT_DIR / "sessions"
INDEX_FILE = INDEX_DIR / "index.json"

# How many lines to scan before giving up on identification
SCAN_LIMIT = 200


def identify_session(filepath: Path) -> bool:
    """Check if a .jsonl file belongs to Ship of Theseus.

    For small files (<5MB), scan first SCAN_LIMIT lines with JSON parsing.
    For large files, do a fast binary search for project markers.
    """
    size = filepath.stat().st_size

    if size > 5 * 1024 * 1024:
        # Large file: fast binary scan (read in chunks, no JSON parsing)
        try:
            with open(filepath, "rb") as f:
                while chunk := f.read(1024 * 1024):
                    for marker in PROJECT_MARKERS:
                        if marker.encode() in chunk:
                            return True
        except OSError:
            return False
        return False

    # Small file: scan first SCAN_LIMIT lines
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

    # Identify and index ship-of-theseus sessions
    sessions = []
    for filepath in sorted(unique_files, key=lambda f: f.stat().st_mtime, reverse=True):
        print(f"  Scanning {filepath.name} ({filepath.stat().st_size / (1024*1024):.1f}MB)...", end=" ")

        if identify_session(filepath):
            print("SHIP", end=" ")
            metadata = extract_metadata(filepath)
            sessions.append(metadata)
            print(f"({metadata.get('compaction_count', 0)} compactions)")
        else:
            print("skip")

    # Write index
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

    # Print summary
    total_compactions = sum(s.get("compaction_count", 0) for s in sessions)
    print(f"Total compaction summaries: {total_compactions}")

    if sessions:
        print("\nCompaction timeline:")
        for session in sessions:
            for cs in session.get("compaction_summaries", []):
                print(f"  [{session['filename'][:8]}...:{cs['line']:>6}] {cs['summary'][:80]}")


if __name__ == "__main__":
    main()
