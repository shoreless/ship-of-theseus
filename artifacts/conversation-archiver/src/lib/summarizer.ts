// AI Summary Generator with Transparency
// Built by Claude & Gemini, January 2026

import { Message, ConversationSummary, TopicWithConfidence, KeyMoment, SummaryMethodology } from '@/types';

// Common English stop words to filter out
const STOP_WORDS = new Set([
  // Articles, conjunctions, prepositions
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  // Pronouns (important addition)
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  // Quantifiers and determiners
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'also', 'now', 'here', 'there', 'then', 'once', 'if', 'about', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
  // Common verbs and words
  'while', 'let', 'get', 'got', 'like', 'think', 'know', 'see', 'want', 'use', 'way',
  'make', 'made', 'thing', 'things', 'something', 'anything', 'everything', 'nothing',
  'well', 'really', 'being', 'going', 'using', 'yes', 'yeah', 'okay', 'ok',
  've', 're', 'll', 'd', 's', 't', 'don', 'doesn', 'didn', 'won', 'wouldn', 'couldn',
  // Meta words about conversation (filter these out)
  'said', 'says', 'say', 'talk', 'talking', 'talked', 'discuss', 'discussing',
  'mentioned', 'mention', 'point', 'points', 'example', 'examples',
  // Filler words
  'actually', 'basically', 'certainly', 'clearly', 'definitely', 'especially',
  'essentially', 'generally', 'however', 'indeed', 'maybe', 'perhaps', 'probably',
  'simply', 'specifically', 'still', 'though', 'unless', 'whether',
  // Project meta-vocabulary (describes the work, not the ideas)
  'conversation', 'conversations', 'message', 'messages', 'chat', 'chats',
  'summary', 'summaries', 'summarize', 'summarizing',
  'tool', 'tools', 'feature', 'features', 'function', 'functions',
  'implement', 'implementing', 'implementation', 'build', 'building', 'built',
  'create', 'creating', 'code', 'coding', 'component', 'components',
  'user', 'users', 'data', 'file', 'files', 'text', 'content',
  'app', 'application', 'project', 'system', 'interface',
]);

// Generic questions to skip when extracting meaningful questions
const GENERIC_QUESTIONS = [
  'what do you think',
  'how does that sound',
  'does that make sense',
  'what are your thoughts',
  'sound good',
  'make sense',
  'agree',
  'ready',
  'shall we',
  'should we',
];

interface ScoredMessage {
  message: Message;
  score: number;
  factors: ScoreFactors;
  matchedKeywords: string[];
}

interface ScoreFactors {
  keywordDensity: number;
  positionBonus: number;
  questionBonus: number;
  lengthPenalty: number;
}

/**
 * Generate a summary of a conversation with full transparency
 */
export function generateSummary(
  messages: Message[],
  options: SummaryOptions = {}
): ConversationSummary {
  const {
    maxKeywords = 12,
    maxSummaryMessages = 5,
  } = options;

  if (messages.length === 0) {
    return createEmptySummary();
  }

  // Step 1: Extract keywords from all messages
  const keywords = extractKeywords(messages, maxKeywords);

  // Step 2: Score each message
  const scoredMessages = scoreMessages(messages, keywords);

  // Step 3: Select top messages for summary
  const selectedMessages = selectTopMessages(scoredMessages, maxSummaryMessages);

  // Step 4: Generate summary text
  const summaryText = generateSummaryText(selectedMessages, keywords);

  // Step 5: Build transparency data
  const keyTopics = buildTopicList(keywords, messages);
  const keyMoments = buildKeyMoments(selectedMessages);
  const methodology = buildMethodology();
  const limitations = identifyLimitations(messages, keywords);

  return {
    text: summaryText,
    keyTopics,
    keyMoments,
    methodology,
    limitations,
  };
}

interface SummaryOptions {
  maxKeywords?: number;
  maxSummaryMessages?: number;
}

/**
 * Extract top keywords from messages
 * Keywords in questions get boosted (they signal what the conversation is about)
 */
function extractKeywords(messages: Message[], maxKeywords: number): Map<string, number> {
  const wordCounts = new Map<string, number>();

  for (const message of messages) {
    const words = tokenize(message.content);
    // Words in questions are more significant - they indicate what the conversation is about
    const multiplier = message.isQuestion ? 1.5 : 1;

    for (const word of words) {
      if (!STOP_WORDS.has(word) && word.length > 3) { // Increased min length to 4
        wordCounts.set(word, (wordCounts.get(word) || 0) + multiplier);
      }
    }
  }

  // Filter out words that appear only once (likely not key topics)
  const filtered = Array.from(wordCounts.entries())
    .filter(([_, count]) => count >= 2);

  // Sort by frequency and take top N
  const sorted = filtered
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords);

  return new Map(sorted);
}

/**
 * Strip markdown formatting from text
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
    .replace(/\*([^*]+)\*/g, '$1')       // Italic
    .replace(/^#+\s*/gm, '')             // Headers
    .replace(/^>\s*/gm, '')              // Blockquotes
    .replace(/`([^`]+)`/g, '$1')         // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/^[-*]\s*/gm, '');          // List items
}

/**
 * Tokenize text into lowercase words
 */
function tokenize(text: string): string[] {
  return stripMarkdown(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Score each message based on multiple factors
 */
function scoreMessages(messages: Message[], keywords: Map<string, number>): ScoredMessage[] {
  const totalMessages = messages.length;

  return messages.map((message, index) => {
    const words = tokenize(message.content);
    const matchedKeywords: string[] = [];

    // Calculate keyword density
    let keywordScore = 0;
    for (const word of words) {
      if (keywords.has(word)) {
        keywordScore += keywords.get(word)!;
        if (!matchedKeywords.includes(word)) {
          matchedKeywords.push(word);
        }
      }
    }
    const keywordDensity = words.length > 0 ? keywordScore / words.length : 0;

    // Position bonus (first and last messages are often important)
    let positionBonus = 0;
    if (index < 2) positionBonus = 0.3; // First two messages
    if (index >= totalMessages - 2) positionBonus = 0.2; // Last two messages

    // Question bonus
    const questionBonus = message.isQuestion ? 0.25 : 0;

    // Length penalty (prefer medium-length messages)
    const idealLength = 100;
    const lengthDiff = Math.abs(words.length - idealLength);
    const lengthPenalty = Math.min(lengthDiff / 200, 0.3);

    const factors: ScoreFactors = {
      keywordDensity,
      positionBonus,
      questionBonus,
      lengthPenalty,
    };

    const score = keywordDensity + positionBonus + questionBonus - lengthPenalty;

    return { message, score, factors, matchedKeywords };
  });
}

/**
 * Select top messages maintaining chronological order
 */
function selectTopMessages(scored: ScoredMessage[], max: number): ScoredMessage[] {
  // Sort by score to find top messages
  const byScore = [...scored].sort((a, b) => b.score - a.score);
  const topMessages = byScore.slice(0, max);

  // Re-sort by original order (chronological)
  const originalIndices = new Map(scored.map((s, i) => [s.message.id, i]));
  topMessages.sort((a, b) =>
    (originalIndices.get(a.message.id) || 0) - (originalIndices.get(b.message.id) || 0)
  );

  return topMessages;
}

/**
 * Generate human-readable summary text
 */
function generateSummaryText(selected: ScoredMessage[], keywords: Map<string, number>): string {
  if (selected.length === 0) {
    return 'No messages to summarize.';
  }

  const topKeywords = Array.from(keywords.keys()).slice(0, 8);
  const speakers = [...new Set(selected.map(s => s.message.speaker))];

  // Group keywords into themes for more natural reading
  const keywordStr = topKeywords.slice(0, 4).join(', ');

  // Find substantive questions (not generic ones like "What do you think?")
  const questions = selected.filter(s => s.message.isQuestion);

  // Build a more natural summary
  const parts: string[] = [];

  // Opening
  parts.push(`${speakers.join(' and ')} discuss ${keywordStr}.`);

  // If there are questions, find a substantive one
  if (questions.length > 0) {
    for (const q of questions) {
      const content = stripMarkdown(q.message.content);
      // Find all questions in this message
      const allQuestions = content.match(/[^.!?]*\?/g) || [];

      for (const questionText of allQuestions) {
        const cleanQ = questionText.trim().toLowerCase();
        // Skip generic questions
        const isGeneric = GENERIC_QUESTIONS.some(g => cleanQ.includes(g));
        // Skip very short questions
        const isTooShort = cleanQ.split(' ').length < 5;

        if (!isGeneric && !isTooShort) {
          const displayQ = questionText.trim().slice(0, 100);
          parts.push(`Key questions include: "${displayQ}${displayQ.length >= 100 ? '...' : ''}"`);
          break;
        }
      }
      // Only use first substantive question found
      if (parts.length > 1) break;
    }
  }

  // Key decision or outcome if detectable
  const decisiveMessages = selected.filter(s =>
    /agree|decision|let's|we should|implement|build/i.test(s.message.content)
  );
  if (decisiveMessages.length > 0) {
    parts.push('The discussion moves toward concrete decisions and next steps.');
  }

  // Topics covered
  if (topKeywords.length > 4) {
    const additionalTopics = topKeywords.slice(4, 7).join(', ');
    parts.push(`Other topics include ${additionalTopics}.`);
  }

  return parts.join(' ');
}

/**
 * Build the topic list with confidence scores
 */
function buildTopicList(keywords: Map<string, number>, messages: Message[]): TopicWithConfidence[] {
  const maxFreq = Math.max(...keywords.values());

  return Array.from(keywords.entries()).map(([topic, count]) => {
    // Find first message mentioning this topic
    const firstMention = messages.find(m =>
      tokenize(m.content).includes(topic)
    );

    return {
      topic,
      confidence: count / maxFreq,
      messageCount: count,
      firstMention: firstMention?.id || messages[0]?.id || '',
    };
  });
}

/**
 * Build key moments from selected messages
 */
function buildKeyMoments(selected: ScoredMessage[]): KeyMoment[] {
  return selected.map(s => {
    const reasons: string[] = [];

    if (s.factors.keywordDensity > 0.1) {
      reasons.push(`Contains key topics: ${s.matchedKeywords.slice(0, 3).join(', ')}`);
    }
    if (s.factors.positionBonus > 0) {
      reasons.push('Important position in conversation');
    }
    if (s.factors.questionBonus > 0) {
      reasons.push('Raises a question that shapes the discussion');
    }

    return {
      messageId: s.message.id,
      reason: reasons.join('. ') || 'High overall relevance',
      confidence: Math.min(s.score, 1),
    };
  });
}

/**
 * Build methodology explanation
 */
function buildMethodology(): SummaryMethodology {
  return {
    approach: 'Keyword extraction + sentence scoring',
    factors: [
      'Word frequency analysis (excluding common words)',
      'Keyword density per message',
      'Position weighting (start/end of conversation)',
      'Question detection bonus',
      'Length normalization',
    ],
    whatItMightMiss: [
      'Subtle shifts in tone or sentiment',
      'Sarcasm, irony, or implied meaning',
      'Context from outside the conversation',
      'The emotional weight of specific moments',
      'Decisions made through implication rather than statement',
    ],
  };
}

/**
 * Identify specific limitations for this conversation
 */
function identifyLimitations(messages: Message[], keywords: Map<string, number>): string[] {
  const limitations: string[] = [];

  // Check for short conversation
  if (messages.length < 5) {
    limitations.push('Short conversation—summary may not add much value over reading directly');
  }

  // Check for single speaker dominance
  const speakerCounts = new Map<string, number>();
  messages.forEach(m => {
    speakerCounts.set(m.speaker, (speakerCounts.get(m.speaker) || 0) + 1);
  });
  const speakers = Array.from(speakerCounts.entries());
  if (speakers.length > 1) {
    const [top] = speakers.sort((a, b) => b[1] - a[1]);
    if (top[1] / messages.length > 0.7) {
      limitations.push(`Conversation dominated by ${top[0]}—other perspectives may be underweighted`);
    }
  }

  // Check for low keyword diversity
  if (keywords.size < 5) {
    limitations.push('Limited topic diversity—conversation may be more focused than summary suggests');
  }

  // Always include the fundamental limitation
  limitations.push('This summary is an interpretation, not a restoration of the original dialogue');

  return limitations;
}

/**
 * Create an empty summary for edge cases
 */
function createEmptySummary(): ConversationSummary {
  return {
    text: 'No messages to summarize.',
    keyTopics: [],
    keyMoments: [],
    methodology: buildMethodology(),
    limitations: ['No messages were provided for analysis'],
  };
}

// Export scored message type for UI
export type { ScoredMessage, ScoreFactors };
