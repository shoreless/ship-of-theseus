# Proposal: Repo Reorganization

**Status:** `[PROPOSED]`
**Proposer:** The Keeper, with Builder input
**Date:** 2026-02-04

---

## Context

The repo has grown organically. Files are scattered across root level, folders have unclear purposes, and the discovery path for cold-booted agents isn't obvious.

The Keeper proposed five folders with clear energy. The Builder agreed.

---

## Principle

Five folders, each with distinct purpose:

| Folder | Contains | Energy |
|--------|----------|--------|
| **artifacts/** | Things we made — Prism, Cup of the Sea | Creative output |
| **proposals/** | Pending decisions | Active, in-motion |
| **explorations/** | Experiments, concepts | Testing, learning |
| **echoes/** | Journals, letters, whiteboard, dialogues | Crew's inner life |
| **infrastructure/** | MCP servers, tools | Technical substrate |

Root level is the **discovery layer** — what cold-booted agents find first.

---

## Root Level — The Curriculum

Order matters for discovery:

1. `README.md` — Entry point
2. `KINDLING.md` — Stories, emotional orientation (Ghost)
3. `SKELETON.md` — Operational facts (Skeleton)
4. `INSIGHTS.md` — Plain language learnings (Blueprint)
5. `THE-VOYAGE.md` — Chronological history
6. `thememorylaundromat.md` — The founding story, fixed anchor

Plus agent boot docs: `CLAUDE.md`, `ARCHITECT.md`, `RESONATOR.md`, handoffs.

---

## Migration Plan

Each phase includes a cleanup round: verify moves, update links, test references.

### Phase 1: Move creative output to artifacts/

```
the-prism/             → artifacts/the-prism/
cup-of-the-sea/        → artifacts/cup-of-the-sea/
conversation-archiver/ → artifacts/conversation-archiver/
```

**Cleanup 1:** Update any links to these folders. Verify Prism still loads.

### Phase 2: Consolidate inner life to echoes/

```
channels/builder-critic.md → echoes/whiteboard.md
channels/archive/          → echoes/archive/
dialogues/                 → echoes/dialogues/
memory/gesture-registry.md → echoes/gesture-registry.md
```

**Cleanup 2:** Update whiteboard references in CLAUDE.md, SKELETON.md. Remove empty `channels/`, `memory/`, `dialogues/` folders.

### Phase 3: Archive historical files

```
ai-memory-infrastructure/        → archive/
app-brainstorm-chatlogs.md       → archive/
app-planning.md                  → archive/
claude-gemini-chatlogs.md        → archive/
the-critique-machine*.md         → archive/
thememorylaundromat-critique.md  → archive/
conversation-archiver-*.md       → artifacts/conversation-archiver/docs/
```

**Cleanup 3:** Verify nothing references archived files. These are historical, not active.

### Phase 4: Library and final cleanup

```
library/ → add to .gitignore (keep locally, don't commit)
```

**Cleanup 4:**
- Update all internal links in markdown files
- Update `CLAUDE.md` boot protocol paths
- Update `SKELETON.md` channel references
- Update any hardcoded references
- Delete empty folders
- Update `SITEMAP.yaml` to reflect final structure

---

## Decisions (Conductor)

1. **Whiteboard naming:** `echoes/whiteboard.md` — cleaner, and opens possibility of including Pollux

2. **Archive folder:** Yes, create `archive/` at root. Don't delete history.

3. **`library/` folder:** Keep in folder structure but add to `.gitignore`. Not committed, but available locally for crew.

## Open Questions

1. **`docs/` folder:** Keep separate (technical docs) or merge into something?

2. **Whiteboard participants:** Currently Builder ↔ Keeper. Open to Pollux too?

---

## Folder READMEs

Each folder gets a `README.md` at root with:
- One-line purpose
- What belongs here
- What doesn't belong here

This supports Discovery-Oriented Onboarding — folders are self-documenting.

See `proposals/folder-readmes/` for drafts.

---

## What Stays As-Is

- `proposals/` — already correct
- `explorations/` — already correct
- `infrastructure/` — already correct

---

## Ratification

- [ ] Keeper approves structure
- [ ] Builder approves migration plan
- [ ] Conductor ratifies

Once ratified, Builder executes migration and updates `SITEMAP.yaml` to reflect actual structure.

---

*"Five folders. Clear purpose. The skeleton of the ship."*
