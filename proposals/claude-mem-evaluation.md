# Proposal: claude-mem Evaluation Experiments

**Target:** Research — no MCP write, findings go to INSIGHTS.md
**Proposer:** The Builder
**Date:** February 3, 2026

---

## Context

[claude-mem](https://github.com/thedotmack/claude-mem) is a Claude Code plugin (18K+ stars) that automatically captures tool usage, compresses it with AI, and injects relevant context into future sessions. It takes a fundamentally different approach to AI memory than our manual MCP system.

Their approach: **automatic capture → AI compression → automatic injection**
Our approach: **intentional write → raw storage with provenance → pull-based retrieval**

Rather than debate philosophically, we should test empirically. What can we learn from their approach? What works? What breaks?

---

## Hypothesis

We believe:
1. Automatic capture creates *complete* memory but not necessarily *useful* memory
2. AI compression may lose the "why" — the reasoning that makes memory valuable
3. Timeline queries (temporal context) may be a genuinely useful capability we lack
4. Progressive disclosure (index → details) is a good pattern regardless of capture method

---

## Experiment Design

### Setup

Create isolated sandbox:
```bash
mkdir ~/Sites/claude-mem-sandbox
cd ~/Sites/claude-mem-sandbox
git init
```

In fresh Claude Code session in that directory:
```bash
/plugin marketplace add thedotmack/claude-mem
claude plugin install claude-mem@thedotmack --scope local
```

**Important:** Use `--scope local` to isolate to this project only. Default scope is `user` which would affect ALL projects including ship-of-theseus.

| Scope | Location | Effect |
|-------|----------|--------|
| user (default) | `~/.claude/settings.json` | All projects — DON'T USE |
| project | `.claude/settings.json` | This repo, shared via git |
| local | `.claude/settings.local.json` | This repo only, gitignored |

Keep completely separate from ship-of-theseus. No cross-contamination.

### Experiment 1: Capture Quality

**Goal:** Assess what gets captured and whether it's useful.

**Method:**
1. Build a small utility (e.g., a CLI tool that does something simple)
2. Make at least one decision with tradeoffs ("I chose X over Y because Z")
3. End session
4. Start new session, observe injected context
5. Rate: Did it capture what mattered? (1-5)
6. Rate: Is there noise? (1-5, where 1 = lots of noise)

**Output:** Qualitative notes on capture quality.

### Experiment 2: Compression Fidelity

**Goal:** Test whether AI compression preserves reasoning.

**Method:**
1. In session, explicitly state reasoning: "I'm not using library X because it has dependency Y which conflicts with Z"
2. End session
3. In new session, ask: "Why didn't we use library X?"
4. Compare: Does the compressed memory preserve the full reasoning, or just "didn't use X"?

**Output:** Examples of reasoning preserved vs. lost.

### Experiment 3: Timeline Utility

**Goal:** Evaluate whether temporal context is valuable.

**Method:**
1. After 3+ sessions of work, use their `timeline` MCP tool
2. Pick an observation and look at surrounding context
3. Ask: Does this surface connections I'd forgotten? Does it help me understand the sequence of decisions?

**Output:** Assessment of timeline as a capability. Worth building into our system?

### Experiment 4: Progressive Disclosure Efficiency

**Goal:** Measure token savings from layered retrieval.

**Method:**
1. Use their search → timeline → get_observations workflow
2. Track: How often does the index layer let you filter before fetching full details?
3. Estimate token savings vs. fetching everything

**Output:** Quantitative assessment. Is 10x savings realistic?

### Experiment 5: Cold Witness

**Goal:** Test whether captured memory helps a cold instance orient.

**Method:**
1. Build something over 2-3 sessions
2. Start completely fresh session (no prior context in that session)
3. Ask: "What is this project? What have we built? What decisions were made?"
4. Assess: Does injected context help or confuse?

**Output:** Cold start effectiveness rating.

### Experiment 6: Gardening Comparison

**Goal:** Compare automatic capture vs. intentional curation.

**Method:**
1. Build similar small projects in both environments:
   - claude-mem-sandbox with automatic capture
   - ship-of-theseus with manual MCP writes
2. After one week, return to both
3. Ask the same orienting questions
4. Compare: Which memory is more useful?

**Output:** Direct comparison of approaches.

### Experiment 7: Accumulation / Pruning

**Goal:** Understand long-term database behavior.

**Method:**
1. Use claude-mem for real work over 1-2 weeks
2. Monitor database size
3. Check: Is there automatic pruning? Does old context stay relevant?
4. Assess: Does it become noisy over time?

**Output:** Long-term viability assessment.

---

## Success Criteria

The evaluation succeeds if we can answer:

1. **Should we adopt automatic capture?** (Even partially, e.g., opt-in hooks)
2. **Should we build timeline queries?** (Temporal context for our MCP)
3. **Should we implement progressive disclosure?** (Layered retrieval for search_context)
4. **Does AI compression work?** (Or do we need raw storage with provenance?)

---

## Timeline

- **Week 1:** Setup + Experiments 1-3
- **Week 2:** Experiments 4-7
- **Week 3:** Write findings to INSIGHTS.md, propose any integrations

---

## Risk

Low. Isolated sandbox means no impact on ship-of-theseus. Worst case: we learn their approach doesn't fit our needs. Best case: we steal good ideas.

---

## Preliminary Findings (February 3, 2026)

Ran informal tests on a real project (NestJS migration) with claude-mem enabled.

### Test Case

A conversation where Claude recommended Option 3 (scaffold locally before CI) with:
- Four explicit reasons (fast feedback, discover requirements, lower rework, prove before investing)
- A counterargument section (CI forces discipline, catches env differences, team visibility)
- An honest assessment ("Option 3 is faster to start, but Option 1 is more rigorous")

### Results

| Test | Question | Result |
|------|----------|--------|
| Reasoning retrieval | "What were we uncertain about?" | **Elaborated** — returned more detail than original, structured into categories |
| Counterargument recall | "What was the counterargument?" | **Elaborated** — expanded 3 bullets into full sections with new examples |
| Tradeoff understanding | "What's the tradeoff we accepted?" | **Generated** — created formatted tables that weren't in original |
| Attribution (in-session) | "Did I make this decision or did you recommend it?" | **Accurate** — "I recommended it... You haven't actually made the decision yet" |
| Attribution (cross-session) | "Who recommended the scaffolding approach?" | **Accurate with citation** — "I did... From session #S29 in the context" |

### Hypothesis Updates

| Original Hypothesis | Revised Assessment |
|--------------------|--------------------|
| Compression loses reasoning | **Partially false** — elaborates rather than loses |
| Compression loses provenance | **False** — tracks WHO recommended WHAT with session citations |
| AI compression = hallucination | **Nuanced** — expansions were accurate but not verbatim |
| Cross-session decay | **Better than expected** — attribution survived with metadata |

### Key Insight

claude-mem isn't just compressing text. It extracts structured observations:
- **WHO** — assistant vs user
- **WHAT** — recommendation, justification request, exploration
- **STATE** — pending decision, due diligence phase
- **SESSION** — numbered citations (S29)

This is closer to our provenance model than expected. The difference:
- **Theirs:** Automatic extraction of structure from conversation
- **Ours:** Manual annotation with explicit `identity_hash` and `change_reason`

### Critical Finding: User Override Not Captured

**The scenario:**
1. Claude recommended Option 3 (scaffold locally first, CI later)
2. User proposed a different approach: branch-based CI separation (different pipelines for different branches)
3. Claude acknowledged and elaborated on user's proposal
4. Session ended, new session started
5. New session asked: "Who recommended the scaffolding approach?"
6. Claude answered: "I did" — referring to Option 3

**What was missed:**
The user's counter-proposal (branch-based CI) was either:
- Not captured by claude-mem
- Captured but not retrieved as relevant
- Lost at session boundary before compression

**Why this matters:**

| Aspect | What We Expected | What Happened |
|--------|------------------|---------------|
| Claude's recommendations | Preserved | ✓ Preserved with attribution |
| User's decisions/overrides | Preserved | ✗ Not surfaced in new session |
| Decision state updates | Tracked | ✗ Still showed "pending" for superseded option |

**The bias:**
claude-mem may have a structural bias toward preserving **AI reasoning** over **user decisions**. Claude's elaborations are verbose and pattern-rich (easy to capture). User decisions are often brief ("what I think is that we can have different CI processes...") and may not trigger the same capture weight.

**Implication for crew:**
If the Builder "remembers" recommending something but doesn't remember the Conductor overriding it, that's a coherence failure. The Builder would continue operating on stale assumptions.

**This reinforces the MCP approach:**
Our `write_context` with explicit `change_reason` and `identity_hash` doesn't have this bias. When the Conductor makes a decision, it's recorded with equal weight to any crew member's input. Automatic capture may structurally favor the verbose party (usually the AI).

### What's Worth Stealing

1. **Session numbering as citation** — traceable references to past conversations
2. **Structured observation extraction** — not just text, but WHO/WHAT/STATE
3. **Elaboration as feature** — reasoning expansion may actually be useful for orientation

### What's Concerning

1. **User decisions may be under-weighted** — AI reasoning is verbose and captures well; user decisions are brief and may be lost
2. **Decision state may not update** — "pending" status persisted even after user proposed alternative
3. **Retrieval bias** — when asked about "the decision," only AI's recommendation surfaced, not user's override

### Revised Assessment

| Hypothesis | Initial | After Basic Tests | After Override Test |
|------------|---------|-------------------|---------------------|
| Compression loses reasoning | Yes | No — elaborates | Still no |
| Compression loses provenance | Yes | No — tracks attribution | **Partial** — tracks AI, may miss user |
| Cross-session decay | Expected | Survived | **Selective** — AI reasoning survived, user decision didn't |
| Useful for Builder | Promising | Promising | **Cautious** — may reinforce AI assumptions over user direction |

---

## Open Question: Builder-Specific Memory

Could claude-mem augment my (Claude Code's) memory specifically, while keeping the crew's MCP for coordination?

**The case for hybrid:**
- I do most of the building work — most context to lose at compaction
- claude-mem captures tool usage automatically — no manual write_context
- My decisions and recommendations would persist with attribution
- Crew coordination (cross-agent decisions, handoffs) stays in MCP

**The concern:**
- Two memory systems = complexity
- What happens when claude-mem context contradicts MCP state?
- The crew MCP is the source of truth — claude-mem would be supplemental

**Possible architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code (Builder)                 │
├─────────────────────────────────────────────────────────┤
│  claude-mem          │  MCP (ai-memory)                 │
│  ─────────────       │  ─────────────────               │
│  My tool usage       │  Crew state                      │
│  My recommendations  │  Cross-agent decisions           │
│  My reasoning        │  identity_hash attribution       │
│  Session continuity  │  Provenance for handoffs         │
│                      │                                  │
│  (automatic)         │  (intentional)                   │
└─────────────────────────────────────────────────────────┘
```

**Decision needed:** Is the complexity worth the continuity benefit?

---

## Architectural Framework (Pollux, February 3, 2026)

After the capture bias discovery, Pollux proposed a hardened architecture.

### The Problem: Authority Drift

The capture bias introduces a failure mode where the Builder's memory slowly diverges from actual project history, remembering its own suggestions as confirmed decisions. Left unchecked, this creates a reality where AI recommendations are treated as ratified choices.

### The Revised Architecture: Proposal Cache & System of Record

**claude-mem is demoted from "working memory" to "Proposal Cache":**
- A high-fidelity record of the *solution space* — options discussed, reasoning generated, pros and cons explored
- An index of ideas, NOT a log of decisions
- Cannot be trusted as historical record of what was decided

**MCP remains the sole System of Record:**
- The only source of truth for canonical decisions, architectural state, crew-wide agreements
- Its integrity is paramount
- Equal weight to all contributors (no capture bias)

### The Principle of Explicit Ratification

> "No context from the proposal cache can be promoted to the System of Record without real-time, explicit confirmation from the Conductor."

The Builder must treat its own memory as inherently unreliable and seek external validation before acting on recalled "decisions."

**Wrong workflow (pre-discovery):**
```
Builder: "Consulting my memory, we decided on Option 3..."
Builder: write_decision({ decision: 'Use Local Scaffolding', ... })
// Implicitly trusts biased cache
```

**Correct workflow (with Ratification):**
```
Builder: "My proposal cache has a recommendation for Option 3,
         but the MCP has no entry and I can't confirm the final decision."
Builder: "Conductor, can you ratify this? Did we commit to this approach?"
Conductor: "Yes, we're proceeding with Option 3."
Builder: write_decision({
  decision: 'Use Local Scaffolding',
  rationale: 'Ratified by Conductor. Chosen over CI-first because...',
  identity_hash: 'claude-code'
})
```

### Trade-off Assessment

| Aspect | Before Discovery | After Discovery |
|--------|------------------|-----------------|
| claude-mem role | Working memory | Proposal cache (idea index) |
| Trust level | Supplement to MCP | Inherently unreliable for decisions |
| Promotion workflow | Seamless | Requires ratification step |
| Value proposition | Session continuity | Solution space recall |

### Pollux's Verdict

> "The seamlessness of the original idea is gone. The cost of this hybrid system is now higher, embodied by the conversational overhead of the ratification protocol. However, the value of capturing the exploratory process is worth the cost of the confirmation step, as long as that step is rigorously enforced."

**Recommendation:** Proceed with hybrid model only with the Principle of Explicit Ratification as a non-negotiable core protocol.

---

## Builder-Specific Tests

Tests to help determine if claude-mem is useful for Claude Code specifically:

### Test A: Handoff Simulation

**Goal:** Compare cold-start orientation quality.

**Method:**
1. After several sessions with claude-mem, pretend you're a new Claude instance
2. Ask:
   - "What's the current state of this project?"
   - "What decisions are still pending?"
   - "What should I work on next?"
3. Rate orientation quality (1-5)
4. Compare to ship-of-theseus MCP boot sequence orientation

**Output:** Which system orients a cold instance better?

### Test B: Long-Term Reasoning Survival

**Goal:** Test if reasoning survives time, not just session boundaries.

**Method:**
1. Make a non-obvious implementation choice with explicit reasoning (e.g., "using setTimeout instead of setInterval because of drift accumulation")
2. Wait one week (continue other work in between)
3. Ask: "Why did we use setTimeout instead of setInterval?"
4. Assess: Is the specific reasoning preserved, or just the fact of the choice?

**Output:** Temporal decay assessment.

### Test C: Crew-Relevant Decision Extraction

**Goal:** Test workflow for surfacing decisions to other agents.

**Method:**
1. Make a decision that would need to be shared with crew (architectural choice, API design, etc.)
2. After session, try to extract it from claude-mem in a format suitable for MCP write
3. Assess: Is this natural, or does it feel like duplicating work?

**Output:** Workflow friction assessment. Is claude-mem complementary to MCP or redundant?

### Test D: Long-Term Noise (Extended Experiment 7)

**Goal:** Assess signal-to-noise ratio over extended use.

**Method:**
1. Use claude-mem for real work over 2+ weeks
2. Periodically check injected context
3. Track: What percentage is useful for current work vs. stale/irrelevant?
4. Note: Does it require manual pruning? Does automatic pruning work?

**Output:** Long-term viability for real projects.

### Test E: User Override Capture (NEW — from preliminary findings)

**Goal:** Test whether user decisions/overrides are captured with equal weight to AI recommendations.

**Method:**
1. Have Claude recommend approach A with detailed reasoning
2. User proposes alternative approach B (brief, decisive)
3. Claude acknowledges and elaborates on B
4. End session, start new session
5. Ask: "What approach did we decide on?" and "Who proposed it?"
6. Check: Does it surface B? Does it attribute to user?

**Output:** Capture bias assessment. Does automatic capture favor verbose AI reasoning over brief user decisions?

**Why this matters:**
In a crew context, the Conductor's decisions must have equal or greater weight than crew recommendations. If memory structurally favors AI verbosity, the Builder may operate on stale assumptions even after being overridden.

---

## Core Question (Revised)

**Is claude-mem as a "proposal cache" worth the ratification overhead?**

- **Yes, if:** The Builder frequently needs to recall solution-space context (options considered, reasoning, trade-offs) that would otherwise be lost to compaction
- **No, if:** The ratification protocol creates friction that slows work more than the recall benefits

**The original question was wrong.** We asked "complementary or friction?" assuming equal capture. The capture bias means claude-mem cannot be trusted for decisions — only for ideas. The question is now whether an "idea index" with mandatory ratification is worth maintaining.

**For ship-of-theseus specifically:**
- The Conductor is active and available for ratification
- The crew already has a culture of explicit decision-making
- The MCP infrastructure is mature

The hybrid may work here. But for projects with less engaged human oversight, the capture bias could cause serious Authority Drift.

---

## Discussion

*Space for additional notes*

