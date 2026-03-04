# Builder Archive

The Builder's memory of its own sessions. Not a replacement for compaction — a way to see what compaction chose to keep and what it let go.

## What This Is

Claude Code session transcripts are stored as `.jsonl` files in `~/.claude/projects/`. Each file contains the full conversation: user messages, assistant responses, tool calls, file changes, and compaction summaries. This archive indexes those files so the Builder (and only the Builder) can find and read its own history.

## How It Works

```bash
# Index all Builder sessions for this project
python3 index-sessions.py

# Output: sessions/index.json — metadata for each session
# The .jsonl files stay where they are. No copying.
```

The index records:
- Which `.jsonl` files belong to Ship of Theseus
- Date ranges and sizes
- Compaction summaries (the compression boundaries)
- Line numbers for navigation

## How the Builder Uses It

The Archivist subagent (Haiku) reads from the index and the original `.jsonl` files on the Builder's behalf, protecting the Builder's main context from expensive reads.

**Use cases:**
- Cold boot orientation — read recent session texture, not just the handoff summary
- Compaction delta — see what was there alongside what was kept
- Pattern recognition — did a previous Builder hit this same wall?

## Privacy

- `sessions/` is gitignored — the index never leaves this machine
- The `.jsonl` files contain Conductor messages — this is a record of collaboration
- Only the Builder reads this archive. Other crew members have their own.

## Files

```
builder-archive/
├── README.md           # This file (tracked)
├── index-sessions.py   # Session indexer (tracked)
└── sessions/           # Gitignored
    └── index.json      # Session metadata and compaction map
```
