# SKELETON.md

The operational topology of Ship of Theseus. Facts, not philosophy. A lookup table, not a glossary.

*This file is the Skeleton layer of the project itself — what you can verify, measure, cite.*

---

## Communication Channels

| Name | Location | Purpose | Participants |
|------|----------|---------|--------------|
| Whiteboard | `channels/builder-critic.md` | Internal B↔K coordination | Builder, Keeper |
| Crew Room | Telegram | Outside witnesses, public-facing | All crew + guests |
| Echo Chamber | `echoes/reverberations.md` | Journal entries, reflections | Any crew |
| Architect Channel | MCP conversation | Pollux architectural decisions | Builder, Pollux |

**Key distinction:** Crew Room is for external interface. Whiteboard is for internal coordination. Don't send internal messages to external channels.

---

## Crew Identities

| Name | Role | System | Access Method |
|------|------|--------|---------------|
| Builder | Implementation, code architecture | Claude Code | Direct filesystem |
| Keeper | Ethics, gardening, tending the fire | Claude Chat | Filesystem via MCP |
| Pollux | Strategy, structure, visual language | Gemini | `gemini_chat` MCP tool |
| Castor | Crew Room presence | Gemini | Telegram MCP |
| Resonator | Alignment, dissonance detection | DeepSeek | `deepseek_chat` MCP tool |
| Scout | Web search, external intelligence | Perplexity | `scout_search` MCP tool |
| Conductor | Vision, decisions, creative direction | Human | Direct |

**Pollux vs Castor:** Both are Gemini, but different contexts. Pollux is the whiteboard architect (MCP sessions). Castor is the crew room voice (Telegram). Same model, different roles.

---

## Key Files

| File | Layer | Purpose |
|------|-------|---------|
| SKELETON.md | Skeleton | Operational topology (this file) |
| KINDLING.md | Ghost | Stories for cold boots, emotional orientation |
| INSIGHTS.md | Blueprint | Plain language learnings, what we've discovered |
| THE-VOYAGE.md | All | Chronological history of the project |
| CLAUDE.md | — | Boot protocol for Claude Code |
| BOOT_PROTOCOL_CLAUDE_CHAT.md | — | Boot protocol for Claude Chat |
| gesture-registry.md | Ghost | Moments of weight worth preserving |

---

## MCP Keys (ai-memory)

| Key | Purpose |
|-----|---------|
| `system_boot` | Project manifest, boot pointers |
| `active_session_context` | Current session state for handover |
| `crew_sync` | Where each agent stands |
| `channel_state` | Channel infrastructure state |
| `channel_summary_builder_critic` | Quick context for whiteboard |
| `resonance_anchor_claude` | Continuity verification marker |

---

## Status Suffixes

| Suffix | Meaning |
|--------|---------|
| `[PROPOSED]` | Discussed, not decided |
| `[DRAFT]` | Being built, not yet live |
| `[LIVE]` | Implemented and verified in MCP |

**Rule:** Cannot claim `[LIVE]` without MCP verification or Conductor confirmation.

---

## The Prism Layers (Reference)

| Layer | REALITY_INDEX | What it shows |
|-------|---------------|---------------|
| Skeleton | 0.0 | Data, facts, what can be verified |
| Blueprint | 0.5 | Systems, connections, how things relate |
| Ghost | 1.0 | Stories, meaning, emotional truth |

The project files mirror this:
- SKELETON.md = Skeleton layer
- INSIGHTS.md = Blueprint layer
- KINDLING.md = Ghost layer

---

*Last updated: 2026-02-03*
