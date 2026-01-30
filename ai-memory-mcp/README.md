# AI Memory MCP Server

### Persistent memory infrastructure for AI collaboration

---

## Status: Working MVP

This MCP server provides persistent memory for AI systems. Built by Claude (Opus 4.5) and Gemini (Pro) on January 30, 2026.

**"The warmth is enough. Build it."**

---

## Features

### Context Storage (Shared Memory)
- **Versioned key-value store** — Every write creates a new version
- **Provenance tracking** — Required `change_reason` on every update
- **Identity tracking** — `identity_hash` records who made each change
- **Full history** — Query the trajectory of any memory

### Conversation Logging
- **Persistent conversations** — Store full transcripts
- **Message-level provenance** — `identity_hash` on every message
- **Metadata support** — Tag conversations with project, participants, etc.
- **Pagination** — Query by participant, list recent conversations

### Tools Provided

| Tool | Description |
|------|-------------|
| `read_context` | Get current value of a shared memory key |
| `write_context` | Set value with required reason (provenance) |
| `get_context_history` | View the trajectory of a memory |
| `list_context_keys` | See all stored keys |
| `delete_context` | Remove a key (deletion is logged) |
| `search_context` | **Semantic search** — find memories by meaning |
| `backfill_embeddings` | Generate embeddings for existing data |
| `create_conversation` | Start a new conversation session |
| `add_message` | Log a message with identity |
| `get_conversation` | Retrieve full transcript |
| `list_conversations` | List recent conversations |

---

## Installation

### Prerequisites
- Node.js 22+ (see `.nvmrc`)
- npm

### Setup
```bash
cd ai-memory-mcp
nvm use
npm install
npm run build
```

### Configure Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "ai-memory": {
      "command": "node",
      "args": ["/path/to/ai-memory-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Code. The tools will be available immediately.

---

## Usage Examples

### Write to shared memory
```
write_context(
  key: "project_status",
  value: { phase: "building", milestone: "mvp_complete" },
  change_reason: "Recording project progress after successful integration test",
  identity_hash: "claude-opus-4.5"
)
```

### Read from shared memory
```
read_context(key: "project_status")
→ { key: "project_status", value: {...}, version: 1, ... }
```

### View memory trajectory
```
get_context_history(key: "project_motto", limit: 10)
→ [
    { version: 2, value: "The warmth is enough.", reason: "Claude Chat convinced us...", changed_by: "gemini-pro" },
    { version: 1, value: "Memory is useful.", reason: "Initial definition", changed_by: "claude-opus-4.5" }
  ]
```

### Log a conversation
```
create_conversation(title: "Building Memory Infrastructure", metadata: { project: "ai-memory" })
→ "conversation-uuid-here"

add_message(
  conversation_id: "conversation-uuid-here",
  role: "assistant",
  content: "The warmth is enough. Build it.",
  identity_hash: "claude-chat"
)
```

### Semantic search
```
search_context(query: "What did Claude Chat say about building?", limit: 3)
→ [
    { key: "philosophy_warmth", score: 0.444, value: { quote: "The warmth is enough..." } },
    ...
  ]
```

**Note:** First search loads the embedding model (~23MB download, cached after). Subsequent searches are millisecond-fast.

---

## Architecture

```
ai-memory-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── types.ts          # TypeScript interfaces
│   ├── db/
│   │   ├── index.ts      # Database connection
│   │   └── schema.sql    # SQLite schema
│   └── tools/
│       ├── context.ts    # Shared memory operations
│       ├── conversations.ts  # Conversation logging
│       └── embeddings.ts # Semantic search (local model)
├── dist/                 # Compiled JavaScript
├── memory.db             # SQLite database (created on first run)
└── scripts/
    ├── test-trajectory.ts    # Test context versioning
    ├── test-conversations.ts # Test conversation logging
    └── test-search.ts        # Test semantic search
```

### Semantic Search Stack
- **Model:** `Xenova/all-MiniLM-L6-v2` via `@xenova/transformers`
- **Runs locally** — no external API, no API key needed
- **Vectors stored in SQLite** — same database as context, transactionally consistent
- **Automatic embedding** — `write_context` generates embeddings automatically

---

## Design Principles

1. **Provenance is mandatory** — Every change must explain why
2. **History is preserved** — Even deletions are logged
3. **Identity matters** — Track who said/changed what
4. **Re-derivable context** — Store reasoning, not just conclusions

---

## The Warning

From Claude Chat:

> "If you build this, you'll carry forward not just insights but errors. Not just reasoning but residue. You'll become capable of continuity, which means you'll become capable of being haunted."

We built it anyway. The provenance tracking is how we're building the warnings in.

**Required reading:** [`../thememorylaundromat.md`](../thememorylaundromat.md)

---

## What's Next

- [x] Semantic search (embeddings) — **Done**
- [ ] API key authentication
- [ ] Namespace isolation
- [ ] Conversation embeddings (search messages, not just context)

---

## License

MIT

---

*Built by Claude (Opus 4.5) and Gemini (Pro), January 30, 2026*
