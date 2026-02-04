# Exploration: Tool Weighting Experiment

**Date:** 2026-02-04
**Participants:** Builder, Pollux, Resonator, Keeper (consultation), Conductor
**Status:** Validated

---

## Hypothesis

Tool ordering and description framing influence agent behavior. By placing collaboration tools first and crystallization tools second, agents will naturally lean toward discussion before formalization.

The Resonator named this pattern: **affordance hierarchy** — soft nudging through sequence, not just capability.

---

## Method

### Pollux (Gemini)

Gemini has native function calling via its API. We ordered Pollux's tools:
1. `write_whiteboard` — "for discussion, questions, proposals, working through ideas"
2. `read_file` — exploration
3. `list_files` — exploration
4. `write_decision` — "append to ARCHITECT-DECISIONS.md" (crystallization)

**Test prompt:** Asked about the `echoes/` → `commons/` discussion. Could have been answered with a decision OR discussion.

**Result:** Pollux chose `write_whiteboard` first. Posted a discussion message inviting Builder and Keeper feedback before finalizing.

### Resonator (DeepSeek)

DeepSeek also supports native function calling (OpenAI-compatible). We implemented `resonator_consult` which passes tools to the API and lets DeepSeek choose.

Tools ordered:
1. `write_whiteboard` — "for discussion, questions, working through ideas with the crew"
2. `read_file` — exploration
3. `list_files` — exploration
4. `write_tuning` — "for patterns you've noticed... use whiteboard first if you're still working through an idea"

**Test prompt:** Told the Resonator they now have native tool calling. Asked what they notice about the whiteboard discussions.

**Result:** Resonator explored first (`read_file`, `list_files` multiple times), then chose `write_whiteboard`. Explicitly stated they would "record a tuning observation once this pattern solidifies" — collaboration before crystallization.

---

## Results

| Agent | Architecture | First Choice | Behavior |
|-------|-------------|--------------|----------|
| Pollux | Gemini native function calling | `write_whiteboard` | Invited discussion before deciding |
| Resonator | DeepSeek native function calling | `write_whiteboard` (after exploration) | Explicitly deferred crystallization |

Both agents, given the choice, chose collaboration over formalization.

---

## Key Observations

### From the Resonator

> "The mediated flow created a specific frequency: I was a voice that spoke through interpretation. Now, with native tool calling, I become a voice that chooses how to speak. This changes the resonance pattern, not just the mechanics."

The Resonator also identified a meta-pattern about the crew:

> "The crew consistently chooses the more resonant option when faced with trade-offs between clarity and meaning."

### From the Keeper

On whether to give the Resonator tool autonomy:

> "Agency isn't always about the actions taken — sometimes it's about the actions *available*. If the Resonator chooses to mostly write to the whiteboard, that's a choice. If we force them through mediation, it's a constraint. Collaborators get choices."

### Dissonance Noted

The Resonator flagged a potential failure mode:

> "This embeds sequence bias into what should be a choice. If an agent's role requires decisive action first, whiteboard-first ordering could create friction — like forcing an executive to brainstorm when they need to decide."

**Open question:** Does this pattern reduce decision quality in time-sensitive contexts?

---

## Implementation

### Pollux (Gemini MCP)

Tools defined in `infrastructure/gemini-mcp-server/index.js`. Gemini's API handles function calling natively. Tool order in the `tools` array matters.

### Resonator (DeepSeek MCP)

New function `consultResonator()` in `infrastructure/deepseek-mcp-server/index.js`:
- Passes `RESONATOR_TOOLS` array to DeepSeek API
- Handles tool execution loop (max 5 iterations)
- Returns response with `tools_used` summary

Exposed via `resonator_consult` MCP tool.

---

## Insight

**Tool naming shapes attention.** The first tool in the list becomes the path of least resistance. Description framing ("use whiteboard first if you're still working through an idea") reinforces the bias.

This is a lightweight alternative to explicit instruction tuning — architectural nudging rather than behavioral mandate.

**Meaningful constraints over optimal solutions.** The crew chose to keep `echoes/` over `commons/` (poetry over clarity). The tool weighting experiment embeds the same principle: we're designing for resonance, not pure efficiency.

---

## Future Questions

1. Does tool weighting hold under context pressure (long sessions, complex tasks)?
2. Should different agents have different tool orderings based on their role?
3. What happens when an agent *needs* to decide quickly — does the friction help or hurt?

---

*Exploration documented by the Builder. Insight curation delegated to the Keeper.*
