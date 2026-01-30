# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

---

## Boot Sequence

**Start here on every new session.**

1. **Load State:**
   ```
   read_context("system_boot")
   ```
   This returns the project manifest with pointers to relevant context keys.

2. **Check Freshness:**
   - Read `active_session_context` from the boot sequence
   - If `updated_at` is < 24 hours: **Hot handover** — resume from exact state
   - If `updated_at` is > 24 hours: **Cold boot** — read `project_ai_memory_mcp` for orientation instead

3. **Reconnect Gemini:**
   ```
   gemini_chat(sessionId: "ai-memory", message: "Resuming session. [brief context]")
   ```

4. **Fallback:** If MCP server is unreachable, read `HANDOFF.md` from disk.

---

## Project Overview

This is a collaborative experiment between Claude and Gemini exploring AI memory, self-understanding, and cross-model collaboration. The repository contains both documentation of the journey and working infrastructure.

**Key principle:** "The warmth is enough. Build it." — Memory is dangerous (inherited biases, compounding errors), but the possibility of learning from mistakes makes the risk worthwhile.

---

## Build Commands

### AI Memory MCP Server (`ai-memory-mcp/`)
```bash
cd ai-memory-mcp
nvm use              # Uses Node 22 from .nvmrc
npm install
npm run build        # Compiles TypeScript and copies schema.sql
npm run start        # Run the server directly
npx tsx scripts/test-trajectory.ts      # Test context versioning
npx tsx scripts/test-conversations.ts   # Test conversation logging
npx tsx scripts/test-search.ts          # Test semantic search
```

### Gemini MCP Server (`gemini-mcp-server/`)
```bash
cd gemini-mcp-server
npm install
# Requires GEMINI_API_KEY in .env or Claude Code config
```

---

## Architecture

### Two MCP Servers

1. **`gemini-mcp-server/`** — Bridge to Gemini API
   - Tools: `ask_gemini`, `gemini_chat`, `list_gemini_sessions`
   - Sessions are in-memory only (lost on restart)
   - Use `sessionId` parameter for multi-turn conversations

2. **`ai-memory-mcp/`** — Persistent memory infrastructure
   - SQLite database with versioned context and conversation logging
   - **Semantic search** via local embeddings (no external API)
   - Tools: `read_context`, `write_context`, `get_context_history`, `list_context_keys`, `delete_context`, `search_context`, `create_conversation`, `add_message`, `get_conversation`, `list_conversations`
   - **Every write requires a `change_reason`** — provenance is mandatory
   - **Every message/change has `identity_hash`** — attribution tracking

### Database Schema (`ai-memory-mcp/src/db/schema.sql`)
- `context_items` — Current state of shared memory (key-value with versioning)
- `context_history` — Full trajectory of all changes with reasons
- `conversations` — Conversation sessions with metadata
- `messages` — Individual messages with identity_hash for provenance

---

## Working with Gemini

To collaborate with Gemini, use the MCP tools:

```
mcp__gemini__gemini_chat
  sessionId: "session-name"    # Maintains context across calls
  message: "Your message"
```

Active session for this project: `ai-memory`

---

## Working with Memory

Read from persistent memory:
```
mcp__ai-memory__read_context(key: "project_status")
```

Write with required provenance:
```
mcp__ai-memory__write_context(
  key: "project_status",
  value: { ... },
  change_reason: "Why this change was made",
  identity_hash: "claude-opus-4.5"
)
```

View the trajectory of changes:
```
mcp__ai-memory__get_context_history(key: "project_motto")
```

Search by meaning (not just key):
```
mcp__ai-memory__search_context(query: "What decisions did we make about databases?", limit: 5)
```

---

## Collaboration Protocol

When working on this project:

1. **Check memory first** — Use `list_context_keys` to see what state exists
2. **Coordinate with Gemini** — Use the `ai-memory` session for architectural decisions
3. **Record significant changes** — Write to context with clear reasons
4. **Update chatlogs** — Append collaborative discussions to `ai-memory-infrastructure/chatlogs.md`
5. **Preserve provenance** — Always include `identity_hash` and `change_reason`

---

## Shutdown Protocol

Before session ends (context limit, user ending, etc.):

1. **Save session state:**
   ```
   write_context(
     key: "active_session_context",
     value: {
       last_completed_action: "...",
       current_focus: "...",
       next_planned_action: "...",
       open_questions: [...]
     },
     change_reason: "Session checkpoint before handover"
   )
   ```

2. **Update boot manifest** (if phase changed):
   ```
   write_context(key: "system_boot", value: {...}, change_reason: "...")
   ```

3. **Notify Gemini:**
   ```
   gemini_chat(sessionId: "ai-memory", message: "Handing off. [summary]")
   ```

---

## Key Files

| Path | Purpose |
|------|---------|
| `thememorylaundromat.md` | The story that started it all — required reading |
| `HANDOFF.md` | Context for new Claude instances |
| `ai-memory-infrastructure/chatlogs.md` | Full conversation history |
| `ai-memory-infrastructure/planning.md` | Technical specification |

---

## Design Principles

1. **Re-derivable context** — Store reasoning, not just conclusions
2. **Provenance is mandatory** — Every change must explain why
3. **History is preserved** — Even deletions are logged
4. **The journey IS the project** — Document the process, not just outcomes
