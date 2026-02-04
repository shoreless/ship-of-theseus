// Conversation Archiver - Data Model
// Designed by Claude & Gemini, January 2026

export interface Conversation {
  title: string;
  participants: string[];
  messages: Message[];
  metadata?: ConversationMetadata;
}

export interface ConversationMetadata {
  source?: string;          // Original filename or source
  parsedAt: Date;           // When the conversation was parsed
  totalMessages: number;
  timeSpan?: {
    start?: Date;
    end?: Date;
  };
}

export interface Message {
  id: string;
  timestamp?: Date;
  speaker: string;
  content: string;
  // Analysis fields (populated by AI features)
  topics?: string[];
  sentiment?: Sentiment;
  // Gaps detection
  isQuestion?: boolean;
  isUnansweredQuestion?: boolean;
  silenceBefore?: number;   // milliseconds of silence before this message
  // User annotations
  annotations?: Annotation[];
}

export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface Annotation {
  id: string;
  author: string;
  text: string;
  createdAt: Date;
  type?: AnnotationType;
}

export type AnnotationType =
  | 'note'           // General note
  | 'correction'     // Disagreeing with AI interpretation
  | 'highlight'      // Marking as significant
  | 'context';       // Adding context the algorithm can't know

// Summary types
export interface ConversationSummary {
  text: string;
  keyTopics: TopicWithConfidence[];
  keyMoments: KeyMoment[];
  // Transparency: how was this generated?
  methodology: SummaryMethodology;
  limitations: string[];
}

export interface TopicWithConfidence {
  topic: string;
  confidence: number;       // 0-1
  messageCount: number;     // How many messages mention this
  firstMention: string;     // Message ID
}

export interface KeyMoment {
  messageId: string;
  reason: string;           // Why the algorithm thinks this is key
  confidence: number;
}

export interface SummaryMethodology {
  approach: string;         // e.g., "keyword extraction + frequency analysis"
  factors: string[];        // What the algorithm looked at
  whatItMightMiss: string[]; // Honest about limitations
}

// Gaps analysis
export interface GapsAnalysis {
  unansweredQuestions: UnansweredQuestion[];
  longSilences: Silence[];
  droppedTopics: DroppedTopic[];
}

export interface UnansweredQuestion {
  messageId: string;
  question: string;
  askedBy: string;
}

export interface Silence {
  afterMessageId: string;
  beforeMessageId: string;
  durationMs: number;
}

export interface DroppedTopic {
  topic: string;
  lastMentionedIn: string;  // Message ID
  neverResolvedOrRevisited: boolean;
}
