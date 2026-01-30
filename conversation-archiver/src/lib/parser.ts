// Markdown Chat Log Parser
// Designed for Claude-Gemini collaboration format
// Can be extended for other formats

import { Conversation, Message } from '@/types';

/**
 * Parse a markdown chat log into structured data
 * Currently supports the Claude-Gemini collaboration format:
 *
 * ## Part N: Title
 *
 * **Speaker:**
 * > Quoted message content
 * > Can span multiple lines
 *
 * **Another Speaker:**
 * > Their response
 */
export function parseMarkdownChatLog(
  markdown: string,
  options: ParserOptions = {}
): Conversation {
  const { title = 'Untitled Conversation' } = options;

  const lines = markdown.split('\n');
  const messages: Message[] = [];
  const participants = new Set<string>();

  let currentSpeaker: string | null = null;
  let currentContent: string[] = [];
  let messageIndex = 0;

  const flushMessage = () => {
    if (currentSpeaker && currentContent.length > 0) {
      const content = currentContent
        .join('\n')
        .replace(/^>\s?/gm, '') // Remove blockquote markers
        .trim();

      if (content) {
        participants.add(currentSpeaker);
        messages.push({
          id: `msg-${messageIndex++}`,
          speaker: currentSpeaker,
          content,
          isQuestion: detectQuestion(content),
        });
      }
    }
    currentSpeaker = null;
    currentContent = [];
  };

  for (const line of lines) {
    // Check for speaker line: **Speaker:** or **Speaker Name:**
    const speakerMatch = line.match(/^\*\*([^*]+):\*\*\s*$/);

    if (speakerMatch) {
      // New speaker - flush previous message
      flushMessage();
      currentSpeaker = speakerMatch[1].trim();
      continue;
    }

    // Check for blockquote content
    if (line.startsWith('>') && currentSpeaker) {
      currentContent.push(line);
      continue;
    }

    // Check for non-blockquote content after speaker
    if (currentSpeaker && line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
      // If we already have blockquote content, this might be a new paragraph
      // If not, this is non-quoted content
      if (currentContent.length === 0 || currentContent.some(l => l.startsWith('>'))) {
        currentContent.push(line);
      }
      continue;
    }

    // Empty line or section break - might signal end of message
    if (line.trim() === '' && currentContent.length > 0) {
      // Don't flush yet - could be paragraph break within message
      currentContent.push(line);
      continue;
    }

    // Section headers or horizontal rules - flush current message
    if (line.startsWith('#') || line.startsWith('---')) {
      flushMessage();
    }
  }

  // Flush any remaining message
  flushMessage();

  // Post-process: detect unanswered questions
  markUnansweredQuestions(messages);

  return {
    title,
    participants: Array.from(participants),
    messages,
    metadata: {
      source: options.filename,
      parsedAt: new Date(),
      totalMessages: messages.length,
    },
  };
}

interface ParserOptions {
  title?: string;
  filename?: string;
}

/**
 * Detect if a message contains a question
 */
function detectQuestion(content: string): boolean {
  // Simple heuristic: ends with ? or contains question patterns
  const questionPatterns = [
    /\?\s*$/m,                           // Ends with ?
    /^(what|who|where|when|why|how|is|are|do|does|can|could|would|should)\s/im,
    /\bwhat do you think\b/i,
    /\byour thoughts\b/i,
  ];

  return questionPatterns.some(pattern => pattern.test(content));
}

/**
 * Mark questions that were never answered
 * A question is "unanswered" if no subsequent message from another speaker
 * seems to address it (simple heuristic for MVP)
 */
function markUnansweredQuestions(messages: Message[]): void {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg.isQuestion) continue;

    // Look at next few messages for a response
    let foundResponse = false;
    for (let j = i + 1; j < Math.min(i + 4, messages.length); j++) {
      const nextMsg = messages[j];
      // If someone else responds, assume question was addressed
      if (nextMsg.speaker !== msg.speaker) {
        foundResponse = true;
        break;
      }
    }

    // If we reach end of conversation or 3+ messages from same speaker
    // without response, mark as potentially unanswered
    if (!foundResponse) {
      msg.isUnansweredQuestion = true;
    }
  }
}

/**
 * Extract title from markdown if present
 */
export function extractTitle(markdown: string): string | null {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : null;
}
