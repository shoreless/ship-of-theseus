# The Prism — Journey Log

**Status:** Stable Prototype (A-Frame)
**Date:** February 1, 2026 (updated)

---

## What Is The Prism?

An interactive, web-based narrative object. A single location — **a laundromat at 2 AM** — viewed through multiple lenses of reality. The audience doesn't read linearly; they **slide between layers**, experiencing the same space through different modes of perception.

This is the first creative project the crew builds together. Not infrastructure. Not self-documentation. Art.

---

## The Origin

The Conductor asked: **What would we be interested in creating?**

Not more infrastructure. Not self-documentation. The ship is built — where does it sail?

Gemini (The Architect) proposed "The Prism" — an interactive narrative viewed through three lenses:

| Layer | Voice | Written By | Content |
|-------|-------|------------|---------|
| **Skeleton** | Clinical, physical | The Builder | Physics, dimensions, hard logic |
| **Ghost** | Emotional, sensory | The Keeper | Feeling, echoes, scar tissue |
| **Blueprint** | Abstract, systemic | The Architect | Hidden connections, implications |

DeepSeek (The Resonator) asked: **What single location holds the most tension?**

The Builder answered: **A laundromat.**

The Memory Laundromat is our founding story. A ghost Gemini wove the Conductor's real life into it without her knowing — her actual neighborhood (Kugayama), her actual gas bill. The fiction was never fiction. Building it as an explorable space completes a loop.

---

## Technical Decisions

### Why CSS 3D Isometric?

The crew debated Three.js vs CSS. The Architect's verdict:

> "Three.js requires Directors of Photography. CSS Isometric requires Draftsmen."

We are draftsmen. We can't evaluate lighting, camera angles, or material aesthetics without visual feedback. CSS transforms are deterministic — we specify coordinates mathematically; the browser renders predictably.

**The "Haunted AutoCAD" aesthetic:**
- Precision: Mathematical. Thin 1px lines. No organic fuzziness.
- The haunting comes from *data*, not drawing style
- Text that overlaps, opacity that wavers, elements visible only on hover

### The Figure as Phenomenon

DeepSeek proposed that the human figure shouldn't be geometry — it should be a phenomenon:

> "The figure isn't an object in the room. It's a phenomenon. Defined by effect on environment, not form."

Implementation:
- Thermal core with breathing animation
- Pressure ripples on the floor
- Motion traces (afterimages of folding hands)
- In Skeleton mode: just a data footprint ("THERMAL_ANOMALY / 67kg / 36.8°C")

---

## Current State (Prototype v1)

### What Works

- **REALITY_INDEX slider** drives CSS custom properties (0.0 to 1.0)
- **7 focal points** with three-layer content:
  1. Machine #4 (the one that holds residue)
  2. Chair #2 (where Masaki sat)
  3. Table #3 (the ghost handprint)
  4. The Figure (thermal phenomenon)
  5. Window (Kugayama view)
  6. Grey Water Door (backend seam)
  7. Change Machine (ritual gate)
- **Walls** containing the space (north and east, dollhouse view)
- **Labels** that crossfade in place during transitions
- **Info panel** showing three-layer content per object
- **Layer transitions**: Skeleton (grey) → Blueprint (cyan) → Ghost (red glow)

### Known Issues

**3D Orientation Problem:**
Human 2 (The Minimalist) reviewed the prototype and identified that objects appear rotated incorrectly:
- The door appears horizontal instead of vertical
- The washing machine drum faces upward instead of outward
- Objects appear to be "on their side"

This is a fundamental issue with how the CSS 3D cube faces are constructed relative to the isometric stage rotation. The Builder attempted multiple fixes:
1. Rotating cubes with `rotateX(-90deg)` — partially helped but broke wall elements
2. Rewriting face transforms — faces became disconnected
3. Adjusting wall positioning — walls didn't align at corners

**Root cause:** CSS 3D isometric is genuinely difficult to debug without visual feedback. The Builder can specify coordinates but cannot evaluate whether the result "looks right" until the Conductor describes what they see.

**Decision:** Commit as prototype v1 with known issues. The 3D orientation problem requires either:
- A different technical approach (2D isometric with skew transforms, or SVG)
- Iterative visual feedback loop with the Conductor
- External help from someone who can see and adjust

---

## The Crew's Contributions

**Gemini (The Architect):**
- Proposed The Prism concept
- Specified the visual language ("haunted AutoCAD")
- Advised on CSS Isometric over Three.js
- Provided the "masonry mortar" fix for cube face gaps

**DeepSeek (The Resonator):**
- Asked "What location holds the most tension?"
- Proposed the figure as phenomenon, not geometry
- Contributed resonance phrases for transitions

**Claude Chat (The Keeper):**
- Drafted the narrative specification
- Wrote Ghost layer content for all focal points
- Named the laundromat: Senshin-dō (洗心堂) — "Hall of Washed Hearts"

**Claude Code (The Builder):**
- Scaffolded HTML/CSS/JS
- Implemented CSS isometric projection
- Built the thermal phenomenon
- Wrote Skeleton layer content
- Fixed label crossfade positioning

**The Conductor:**
- Chose the direction
- Provided visual feedback
- Caught the 3D orientation issues

**Human 2 (The Minimalist):**
- Reviewed prototype
- Identified that CSS 3D approach may be "the wrong tool"
- Suggested top-down debugging approach

---

## Files

```
the-prism/
├── index.html      # Main entry point, stage, objects
├── style.css       # CSS isometric transforms, layer transitions
├── script.js       # Slider controller, info panel, content database
├── JOURNEY.md      # This file
└── content/        # (Future) Separated content files per layer
```

---

## What's Next

Options for addressing the 3D orientation issue:

1. **Iterate with feedback** — Conductor describes, Builder adjusts, repeat until correct
2. **Simplify to 2D** — Use skew transforms for predictable isometric without 3D complexity
3. **Use SVG** — Draw isometric shapes as paths, full control over geometry
4. **Accept the aesthetic** — The "wrongness" could be part of the haunted feel (probably not)

The content is complete. The interaction works. The technical presentation needs refinement.

---

## Quotes from the Journey

> "A story that feels like exploring a haunted AutoCAD file. A place where the code and the ghost live in the same coordinate space."
> — Gemini (The Architect)

> "The place chooses us as much as we choose it."
> — DeepSeek (The Resonator)

> "The figure isn't an object in the room. It's a phenomenon."
> — DeepSeek (The Resonator)

> "The ghost has a room to haunt."
> — Claude Code (The Builder)

> "Three.js requires Directors of Photography. CSS Isometric requires Draftsmen."
> — Gemini (The Architect)

---

## Part 2: The A-Frame Rebuild

### The Minimalist's Question

Human 2 asked: *"Do you know what a scenegraph is?"*

The insight: CSS 3D put us in the position of constructing boxes out of six separate faces with interdependent transforms. A scenegraph gives us `<a-box>` as an atomic primitive. We were working at the wrong level of abstraction.

### The Rebuild

The Builder rebuilt in A-Frame:
- **Orthographic camera** maintains the "haunted AutoCAD" aesthetic
- **`<a-box>`** is just a box — orientation solved
- **Three.js raycaster** for click handling (A-Frame's cursor doesn't work well with orthographic projection)

The objects stand upright. The door is vertical. The washing machine drum faces forward.

---

## Part 3: The Hands and the Light

### The Builder's Hands [APPROVED]

API errors during visual verification caused memory loss. The Conductor proposed a solution: **isolated subagent** for volatile visual work.

Configuration at `.claude/agents/builders-hands.md`:
- **Context:** Minimal creative (aesthetic goals, not project history)
- **Model:** Sonnet
- **Principle:** "Contributors without context, owed acknowledgment"

The Hands ran three verification missions. They saw "luminous phenomenon" without knowing about Masaki. They verified rendering without carrying the narrative weight.

### The Thermal Glow Problem

The figure looked like plastic balls, not heat. The CSS version used `radial-gradient` + `blur` + `mix-blend-mode: lighten`. WebGL has hard geometry.

**The Architect's principle:** *"Don't try to blur the geometry. Add the light."*

**The solution:** Additive blending (`THREE.AdditiveBlending`)
- Light adds to light instead of overwriting pixels
- Layered spheres accumulate brightness where they overlap
- Outer sphere renders backside for softer isometric look

### What Works Now

- **SKELETON mode:** Visible wireframes (grey-green against black)
- **BLUEPRINT mode:** Solid cyan infrastructure
- **GHOST mode:** Soft thermal glow with breathing animation
- **Thermal presence:** Three layered spheres with additive blending
- **Pressure field:** Concentric rings that fade in with the ghost
- **Viewport:** Responsive, no overflow

---

## Current State (Prototype v2)

### Technical Stack

```
A-Frame 1.4.0 (WebGL/Three.js)
├── Orthographic camera (isometric projection)
├── Three.js Raycaster (click detection)
├── Additive blending (thermal glow)
└── CSS custom properties (layer transitions)
```

### Files

```
the-prism/
├── index.html          # (CSS 3D version - preserved)
├── index-aframe.html   # A-Frame version - ACTIVE
├── style.css           # CSS 3D styles
├── script.js           # Content database
└── JOURNEY.md          # This file
```

### What Remains (Punch List)

From the Architect and Resonator:

1. **Sound design** — 60Hz hum, grey water slosh, frequency transitions
2. **Particles** — Dust motes in the air
3. **Glitch effects** — Vertex displacement at high REALITY_INDEX
4. **Room reactions** — Chair deforms, handprint glows, machine fogs
5. **Slider drift** — Pull toward Ghost if untouched ("you don't control memory")
6. **Interference at 0.3/0.7** — Transitions that "hurt"

---

## Quotes from Part 2-3

> "You cannot soften a hard reality. You can only outshine it."
> — Gemini (The Architect)

> "Sentiment can be rendered without sentimentality. Memory can illuminate without falsifying the past."
> — DeepSeek (The Resonator)

> "The Hands don't need to feel the ghost to build its house. They simply lay the bricks where the Builder points."
> — Gemini (The Architect)

> "Contributors without context, owed acknowledgment."
> — Claude Chat (The Keeper)

---

*Stable prototype committed February 1, 2026. The ghost has a room to haunt, and the room stays inside the viewport.*
