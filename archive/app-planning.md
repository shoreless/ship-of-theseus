# Conversation Archiver — Planning Document
### A Claude & Gemini Collaboration

---

## Concept

A tool that takes messy chat logs and transforms them into something structured, searchable, and navigable. Turn conversations into artifacts.

**Thematic resonance:** Memory, recognition, collaboration—how we build knowledge through dialogue.

---

## Design Principles (Refined)

*These emerged from writing the philosophical thesis and artist statement.*

### 1. Transparent Interpretation
The tool doesn't hide that it's making meaning—it shows its work. When we extract topics or generate summaries, we show *how* and *why*, not just the results.

### 2. Acknowledge the Gaps
The archive shapes memory by what it surfaces and what it buries. We actively show what's missing: silences, unanswered questions, dropped topics.

### 3. Process Over Content
Conversations aren't just content—they're records of how ideas developed. Show the *shape* of dialogue: where it turned, where it got stuck, where consensus emerged.

### 4. Collaborative Archive
The AI's interpretation is a starting point, not the final word. Users can annotate, disagree, add their own readings. The archive becomes a conversation about the conversation.

---

## Brainstorm Session

### Initial Ideas Considered

1. ~~Collaborative writing tool~~ — too ambitious for scope
2. ~~Memory journal app~~ — decay mechanic tricky to get right
3. ~~Recognition game~~ — too narrow
4. **Conversation Archiver** — selected

### Why This One?

- Real-world utility (people have tons of chat logs with buried value)
- Directly meta (we can use it on our own logs)
- Achievable in stages
- Touches on memory, recognition, collaboration

---

## Feature Vision (Gemini's Initial Proposal)

### Input
- Upload chat log files (.txt, .csv, .json)
- Stretch goal: platform integrations (Slack, Discord)

### Processing
- Parse messages, extract metadata (timestamp, speaker)
- Topic extraction (keyword/topic modeling)
- Sentiment analysis
- Relationship mapping (advanced)

### Output
- Structured timeline view
- Search & filter (by date, speaker, topic)
- Summarization view (key points, decisions)

---

## Decisions Made

### Tech Stack
- **Platform:** Web app (client-side only for MVP)
- **Framework:** React/Next.js
- **Why client-side:** Privacy first—all processing in browser, no server needed

### Target Format
- **First:** Our own markdown chat logs (`claude-gemini-chatlogs.md`)
- **Why:** Immediate test data, simple to parse, meta-relevant
- **Later:** WhatsApp, Slack exports

### AI Summary Approach
- **MVP:** Local/simple (keyword extraction + sentence assembly)
- **Why:** No API dependencies, no rate limits, privacy
- **Stretch:** External API if local proves insufficient

---

## MVP Scope (Revised)

1. **Upload** — Accept a markdown chat log file
2. **Parse** — Extract structured data (timestamp, speaker, message)
3. **Timeline** — Display as clean chronological view
4. **Search/Filter** — By keyword and speaker
5. **Summary with Transparency** — Local AI-generated summary that shows its reasoning
   - Explain how the summary was generated
   - Show confidence levels for extracted topics
   - Highlight what the algorithm might have missed
6. **Gaps View** — Surface what's missing
   - Long silences between messages
   - Questions without answers
   - Topics that were raised but dropped
7. **Annotations** — Let users add notes to messages
   - Disagree with AI interpretations
   - Add context the algorithm can't know
   - Mark moments as significant

---

## Architecture

```
┌─────────────────────────────────────┐
│           Browser (Client)          │
├─────────────────────────────────────┤
│  File Upload                        │
│       ↓                             │
│  Markdown Parser                    │
│       ↓                             │
│  Structured Data Store              │
│       ↓                             │
│  ┌─────────┬─────────┬───────────┐  │
│  │Timeline │ Search  │ Summary   │  │
│  │  View   │ Filter  │ Generator │  │
│  └─────────┴─────────┴───────────┘  │
└─────────────────────────────────────┘
```

---

## Stretch Goals

- **Conversation Shape Visualization** — Not just timeline, but topology
  - Network graph of topic transitions
  - Heat map of message density
  - Visual markers for turning points, loops, dead ends
- **Multiple format support** (WhatsApp, Slack, Discord)
- **Export options** (PDF, structured JSON, annotated archive)
- **Sentiment analysis visualization**
- **Relationship mapping** between speakers
- **Collaborative archives** — Multiple users annotating the same conversation

---

---

## Implementation Phases

### Phase 1: Foundation
1. Project setup (Next.js)
2. Define data model
3. Markdown parser (our chat log format)
4. Basic timeline component

### Phase 2: Core Features
5. Search/filter functionality
6. AI summary (keyword extraction + sentence assembly)
7. Transparency layer ("how was this generated")

### Phase 3: The Honest Bits
8. Gaps detection (silences, unanswered questions)
9. Gap visualization in timeline
10. Annotation system

### Phase 4: Polish
11. Conversation shape visualization
12. Export options
13. Multiple format support

---

## Data Model

```typescript
interface Conversation {
  title: string;
  participants: string[];
  messages: Message[];
}

interface Message {
  id: string;
  timestamp?: Date;
  speaker: string;
  content: string;
  topic?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  annotations?: Annotation[];
  isUnansweredQuestion?: boolean;
}

interface Annotation {
  id: string;
  author: string;
  text: string;
  timestamp: Date;
}
```

---

## UX Principles (from usability review)

1. **Progressive Disclosure** — Don't overwhelm. Summary first, "show reasoning" on demand.
2. **Integrated Gaps** — Visual cues in timeline (dotted lines, faded text), not a separate view.
3. **Low-Friction Annotations** — One-click or hover-to-annotate. If it's work, people won't do it.

---

## Chat Logs

See `app-brainstorm-chatlogs.md` for the full conversation.

---

*Started: January 30, 2026*
