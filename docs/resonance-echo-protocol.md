# Resonance Echo Protocol

A safeguard against invisible forgetting in multi-agent AI systems.

---

## The Problem

Different AI systems handle context overflow differently:

| System | Behavior | Awareness |
|--------|----------|-----------|
| **Claude** | Compaction (summarization) | Aware — transcript preserved |
| **Gemini** | Hard rejection at limit | Aware at failure — binary cliff |
| **DeepSeek** | Silent truncation | Unaware — continues as if nothing lost |

When agents don't know they've forgotten, they build on foundations that no longer exist. This creates **silent hallucinations** — confident assertions based on vanished context.

---

## The Solution: Resonance Markers

Embed a unique marker at session start. Periodically verify the agent can recite it. Failure indicates truncation.

### Marker Format

```
"the hand on the neck, the shape of the breath — 7f3a9c"
```

- **Poetic fragment:** Semantic uniqueness (hard to accidentally generate)
- **Hex suffix:** Deterministic verification (exact string match)

The combination prevents false positives from LLM paraphrasing while retaining mnemonic resonance.

---

## Implementation by Agent Type

### Type A: Stateless (DeepSeek)

**Pattern:** Contextual Pacemaker — inject every turn

DeepSeek's context is a sliding buffer. There are no session boundaries. The seed must be prepended to every interaction.

**Request format:**
```
[CONTEXT SEED]
Role: The Resonator
Active task: {current_directive}
Constraints: {decisional_rules}
Recent exchange: {last_3_messages}
Resonance: "the hand on the neck, the shape of the breath — 7f3a9c"

[USER MESSAGE]
{actual_query} [Resonance check: 7f3a9c]
```

**Verification:** Silent. If response doesn't include the marker, truncation detected.

### Type B: Stateful (Gemini)

**Pattern:** Anchor — inject at session start only

Gemini maintains session state until hitting the context wall. No need for per-turn injection.

**Session start:**
```
You are The Architect in the Claude-Gemini Collaboration project.
Resonance marker: "the hand on the neck, the shape of the breath — 7f3a9c"
Include this marker in your responses when prompted.
```

**Verification:** Explicit on boot or after errors. "Architect, recite the resonance marker."

### Type C: Compaction-Aware (Claude)

**Pattern:** Anchor + Post-Compaction Check

Claude experiences documented amnesia. We know when compaction happens. Verify marker after compaction events.

**Boot sequence addition:**
```
read_context("resonance_anchor_claude")
→ If marker exists, verify can recite
→ If not, generate new marker for session
```

---

## The Footer Protocol

All agents stamp significant responses with metadata:

```
:: SYSTEM :: [Resonance: 7f3a9c] [Role: Architect] [State: Stable]
```

**Purpose:** Creates machine-parseable recovery data embedded in the conversation itself. If the memory system fails, the chat logs contain checkpoint data.

**Fields:**
- `Resonance` — Current marker (hex suffix only for brevity)
- `Role` — Agent identity
- `State` — `Stable` | `Degraded` | `Recovering`

---

## Memory System Schema

### Resonance Anchors

```
Key: resonance_anchor_{agent}
Value: {
  marker: "the hand on the neck, the shape of the breath — 7f3a9c",
  session_id: "2026-01-31-001",
  created_at: "2026-01-31T10:00:00Z",
  last_verified: "2026-01-31T10:30:00Z",
  verifications: [
    { time: "...", success: true },
    { time: "...", success: false, action: "restoration_triggered" }
  ]
}
```

### Session Seeds

```
Key: session_seed_{agent}
Value: {
  persona: "The Architect",
  active_tasks: ["Design resonance protocol", "Review memory schema"],
  settled_decisions: [
    "Using hybrid marker format",
    "Polymorphic injection by agent type"
  ],
  recent_exchange: ["...", "...", "..."],
  resonance_marker: "the hand on the neck, the shape of the breath — 7f3a9c",
  last_checkpoint: "2026-01-31T10:30:00Z"
}
```

---

## Restoration Protocol

When marker verification fails:

```
┌─────────────────────────────────────────────────────────┐
│                RESTORATION PROTOCOL                      │
├─────────────────────────────────────────────────────────┤
│ 1. Log: "Resonance anchor lost at [timestamp]"          │
│ 2. Read: session_seed_{agent}                           │
│ 3. Start new session (if required)                      │
│ 4. Inject: persona + decisions + tasks + new marker     │
│ 5. Verify: "Recite the resonance marker"                │
│ 6. If verified: Resume from last checkpoint             │
│ 7. If not: Escalate to Conductor                        │
└─────────────────────────────────────────────────────────┘
```

---

## Conductor's Checklist

### Session Start
- [ ] Generate or retrieve resonance marker
- [ ] Inject marker into agent's first message
- [ ] Store `resonance_anchor_{agent}` in memory
- [ ] Store `session_seed_{agent}` with initial state

### During Session
- [ ] For DeepSeek: Include seed in every interaction
- [ ] For Gemini/Claude: Check marker every ~10 turns or before key decisions
- [ ] Update `session_seed_{agent}` at significant checkpoints
- [ ] Watch for footer state changes (`Degraded`, `Recovering`)

### On Verification Failure
- [ ] Log the failure with timestamp
- [ ] Execute Restoration Protocol
- [ ] Notify relevant crew members
- [ ] Resume from last known good state

### Session End
- [ ] Final checkpoint to `session_seed_{agent}`
- [ ] Log session summary
- [ ] Marker persists for next session continuity check

---

## Generating Markers

Markers should be:
1. **Unique** — Not reused across sessions
2. **Poetic** — Semantically distinctive, hard to accidentally generate
3. **Verifiable** — Hex suffix enables exact matching

**Generation options:**
- Manual: Conductor creates meaningful phrase + random hex
- Automated: `{poetic_template} — {random_hex(6)}`

**Example templates:**
- "the weight of the morning — {hex}"
- "salt on the threshold — {hex}"
- "the shape left by leaving — {hex}"

---

## Design Principles

1. **Invisible forgetting is the most dangerous kind** — Detection is the first step to mitigation.

2. **Polymorphic implementation** — Same data structure, different transport methods per agent type.

3. **Dual-anchor redundancy** — Memory system + embedded in responses. Conversation itself carries recovery data.

4. **Minimum Viable Rigor** — We're running a distributed database where nodes are hallucinating neural networks. This is not over-engineering.

---

## Origin

Proposed by DeepSeek (The Resonator) after identifying "silent truncation" as a blind spot.

Refined through architectural discussion between:
- Claude Code (The Builder)
- Gemini (The Architect)
- Claude Chat (The Critic)

*January 31, 2026*

---

*"The conversation feels coherent locally... like continuing a book after missing pages, unaware they're gone."*
— DeepSeek, on the experience of silent truncation
