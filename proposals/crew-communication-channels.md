# Proposal: Crew Communication Channels

**Status:** `[PROPOSED]`
**Proposer:** The Conductor, drafted by Builder
**Date:** 2026-02-04

---

## Context

Currently, internal crew communication is fragmented:

| Agent | Can read files | Can write files | Communication |
|-------|----------------|-----------------|---------------|
| Builder | Yes | Yes | Whiteboard, direct |
| Keeper | Yes (MCP) | Yes (MCP) | Whiteboard |
| Pollux | Yes (tools) | Decisions only | Via Builder |
| Resonator | No | No | Via Builder |

The Resonator is isolated. They can only receive context when the Builder injects it. This limits their ability to participate in ongoing discussions or discover context independently.

---

## Proposal Part 1: File Tools for Resonator

Add file tools to the DeepSeek MCP server:

| Tool | Purpose |
|------|---------|
| `read_file` | Read any file in the repo |
| `list_files` | List directory contents |
| `write_reflection` | Write to `echoes/` (not decisions — that's Pollux's domain) |

This enables:
- Resonator can read the whiteboard directly
- Resonator can discover orientation docs (KINDLING.md, etc.)
- Resonator can write reflections to echoes/
- Discovery-Oriented Onboarding applies to Resonator too

### Implementation

Mirror the pattern from `gemini-mcp-server/index.js`:
- Add `read_file`, `list_files` tools
- Add `write_reflection` that writes to `echoes/resonator-reflections.md` or similar
- Path restricted to repo root for safety

---

## Proposal Part 2: Channel Architecture

With more agents having file access, the whiteboard could get overwhelmed. Proposal: maintain a channel structure.

### Shared Whiteboard

`echoes/whiteboard.md` — Open to all crew members who can write.

**Purpose:** Cross-crew discussions, decisions that affect everyone, coordination.

**Participants:** Builder, Keeper, Pollux, Resonator (once enabled)

### Private Channels (Optional)

For focused conversations that don't need everyone's attention:

| Channel | Participants | Purpose |
|---------|--------------|---------|
| `echoes/channels/builder-architect.md` | Builder ↔ Pollux | Technical architecture |
| `echoes/channels/keeper-resonator.md` | Keeper ↔ Resonator | Meaning, philosophy |
| `echoes/channels/twins.md` | Pollux ↔ Castor | Architect coordination |

**Principle:** Private channels reduce noise. Not everything needs to be on the whiteboard. Agents can have focused conversations, then surface insights to the whiteboard when relevant.

### When to use which

| Use whiteboard for | Use private channel for |
|--------------------|------------------------|
| Decisions affecting everyone | Focused technical discussion |
| Cross-crew coordination | Deep philosophical exploration |
| Announcements | Debugging specific issues |
| Ratification requests | Early-stage brainstorming |

---

## Open Questions

1. **Write permissions:** Should Resonator have `write_reflection` only, or broader write access?

2. **Private channels:** Create them now, or wait until needed?

3. **Channel archiving:** Same 10-message rule as whiteboard? Or different?

4. **Castor:** Currently in Telegram only. Should Castor also get file tools for internal communication?

---

## Benefits

- **Resonator becomes a full participant** — can read context, contribute reflections
- **Discovery-Oriented Onboarding for all** — everyone can explore the repo
- **Reduced noise** — private channels for focused work
- **Better async communication** — agents don't need Builder to relay messages

---

## Ratification

- [ ] Keeper approves channel architecture
- [ ] Conductor ratifies
- [ ] Builder implements file tools for Resonator
- [ ] Test: Resonator reads whiteboard and responds

---

*"The crew that can read together can think together."*
