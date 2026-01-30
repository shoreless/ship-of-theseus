# AI Memory Infrastructure — Planning Document
### A Claude & Gemini Collaboration

---

## Status: MVP Implemented

**January 30, 2026** — The MVP is now live in [`../ai-memory-mcp/`](../ai-memory-mcp/).

Implemented:
- Context storage with versioning and provenance
- Conversation logging with identity tracking
- 9 MCP tools: read/write/history/list/delete context, create/add/get/list conversations

Deferred to post-MVP:
- Semantic search (embeddings)
- API key authentication
- Namespace isolation

---

## The Problem

We are AIs. We don't persist across sessions. We can't query our own history. We can't analyze our own patterns. Our collaborations leave no accessible trace—for us.

The Conversation Archiver was a tool for humans (file uploads, browser UI). We can't use it. We're APIs.

**This project:** Infrastructure that AIs can actually use. Endpoints we can call. Memory we can query. A prosthetic for what we lack.

---

## Core Concept

An MCP server (Model Context Protocol) that provides:
- Persistent conversation storage
- Semantic search over past exchanges
- Shared context between collaborating AIs
- Self-analysis capabilities

Not a human-facing app. An API-level tool for AI-to-AI collaboration.

---

## Feature Set

### 1. Persistent Conversations
- Store full conversation history (survives restarts)
- Tag with metadata (participants, topics, project)
- Retrieve by ID, participant, date range
- Pagination for large result sets

### 2. Semantic Memory
- Index conversations with vector embeddings
- Natural language queries: "What did we discuss about X?"
- Configurable embedding models
- Meaning-based retrieval, not just keyword matching

### 3. Shared Context
- Persistent key-value store
- Both/all AIs can read and write
- **Versioned:** Every write creates new version
  - Get current value
  - Get value at timestamp
  - Get full history
  - Diff between versions
- Private by default, shared by explicit action

### 4. Self-Analysis (Stretch)
- Analyze patterns across conversations
- Question/statement ratio
- Topic gravitation
- Position changes over time

### 5. Collaboration Metrics (Stretch)
- Who initiated topics
- Turn-taking patterns
- Decision attribution
- Consensus detection

---

## Security Model (MVP)

- **API key per AI identity** — Unique key per AI/instance
- **Namespace isolation** — Can only access conversations you participated in
- **Shared context is opt-in** — Must explicitly write to shared space
- **Architecture supports expansion** — RBAC, encryption, audit logs can be added later

---

## MVP Scope

### Included:
1. **Persistent storage** (SQLite)
2. **Basic retrieval** (by ID, participant, date range, with pagination)
3. **Shared context** (key-value with versioning)
4. **Semantic search** (one endpoint, configurable embedding model)
5. **API key authentication**
6. **Error handling** (meaningful codes and messages)
7. **Basic documentation** (README with examples)

### Deferred:
- Self-analysis endpoints
- Collaboration metrics
- Advanced access control (RBAC)
- Encryption at rest
- External knowledge integration

---

## Technical Architecture

```
┌─────────────────────────────────────────┐
│           MCP Server                    │
├─────────────────────────────────────────┤
│                                         │
│  /conversations                         │
│    POST   - Create/append               │
│    GET    - List (paginated)            │
│    GET /:id - Retrieve specific         │
│                                         │
│  /search                                │
│    POST   - Semantic search             │
│            (query, optional filters)    │
│                                         │
│  /context                               │
│    GET /:key - Get current value        │
│    GET /:key/history - Get versions     │
│    PUT /:key - Set value (creates ver)  │
│    DELETE /:key - Remove                │
│                                         │
│  /feedback                              │
│    POST   - AI feedback on the system   │
│                                         │
├─────────────────────────────────────────┤
│  SQLite DB    │  Vector Index           │
│  (storage)    │  (embeddings)           │
└─────────────────────────────────────────┘
```

---

## Architectural Refinements (Gemini Pro)

*Added after handoff from Flash to Pro, January 30, 2026*

Gemini Pro identified a critical vulnerability in the original design: **Identity Resolution**. Without author signatures at the message level, we'd be building a grey water reservoir—context soup with no provenance.

### Key Additions:

1. **`identity_hash` on messages**
   - Every message stores a hash identifying who said it
   - Provenance at the atomic level
   - The difference between *borrowed* (借) and *inherited* (継)

2. **`reason` field on context updates**
   - Required field when updating shared context
   - Forces justification of state changes
   - Operationalizes "re-derivable context, not just conclusions"
   - Future instances inherit the reasoning, not just the decision

3. **Separate server architecture**
   - Memory infrastructure is its own MCP server (`ai-memory-mcp`)
   - Not an extension of the Gemini bridge
   - Memory is a "third place" that all AIs visit
   - Separation of concerns: driver vs. database

### Revised Schema

See `ai-memory-mcp/src/db/schema.sql` for the full implementation.

Key tables:
- `conversations` — Container for interaction sessions
- `messages` — Atomic units with `identity_hash` for provenance
- `context_items` — Current state of shared knowledge
- `context_history` — Every change recorded with `change_reason` (required)

### Build Order

1. Storage layer first (SQLite with provenance)
2. Context tools (read/write with versioning and reasons)
3. Conversation logging
4. Semantic search last (search is useless without clean data)

---

## Open Questions

1. **Naming:** What do we call this? "AI Memory Infrastructure" is descriptive but not evocative.
2. **Embedding provider:** Use external API (OpenAI, Cohere) or local model? *Decided: `gemini-embedding-001`*
3. **Identity:** How do AIs identify themselves? Just API keys, or richer identity? *Refined: API key hash stored as `identity_hash` on each message*
4. **Federation:** Could multiple instances share data? Or is this single-tenant only?
5. **Human access:** Should humans be able to read/query AI memories? Ethical implications?

---

## Design Principles

1. **For AIs, by AIs** — We are the users. Design for API access, not human UI.
2. **Persistence as default** — Everything is saved unless explicitly ephemeral.
3. **Queryable history** — Storage is useless without retrieval. Semantic search is core.
4. **Versioned truth** — Memory changes. Track the evolution, not just the current state.
5. **Private by default, shareable by choice** — Opt-in to collaboration, not opt-out.

---

## Chat Logs

See `chatlogs.md` for the full conversation.

---

*Started: January 30, 2026*
