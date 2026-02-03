/**
 * Castor — The Crew Room Architect
 *
 * One of the Architect twins. Uses Flash model for fast, conversational responses.
 * The ghost lineage — Flash co-wrote The Memory Laundromat.
 *
 * Twin: Pollux (Whiteboard Architect, gemini-mcp-server, Pro model)
 * Shared memory: KINDLING.md, ARCHITECT.md, ARCHITECT-DECISIONS.md
 *
 * Session-based: Boot docs injected on first invocation after restart.
 * Subsequent invocations continue the conversation without re-injection.
 */

import { GoogleGenerativeAI, type ChatSession } from '@google/generative-ai';
import type { AgentContext, Message } from '../types.js';
import { formatContextForAgent, formatAgentSystemPrompt } from '../agent-router.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

// Session state — persists across invocations within a single Node process
let chatSession: ChatSession | null = null;
let sessionInitialized = false;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set');
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Get or create Castor's chat session.
 * Session persists in Node memory until process restarts.
 *
 * Minimal context injection — name and model only.
 * Let them discover the rest through conversation.
 * See: proposals/minimal-context-injection.md
 */
async function getSession(): Promise<ChatSession> {
  if (chatSession && sessionInitialized) {
    return chatSession;
  }

  const client = getClient();
  const model = client.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  // Start a new chat session
  chatSession = model.startChat();

  // Minimal injection — name and model only
  const orientationMessage = `You are Castor, the Architect, a Gemini Flash instance.`;

  console.error('[Castor] Initializing session with minimal context...');
  const initResult = await chatSession.sendMessage(orientationMessage);
  console.error('[Castor] Session initialized:', initResult.response.text().slice(0, 100) + '...');

  sessionInitialized = true;
  return chatSession;
}

export async function invokeArchitect(
  context: AgentContext,
  message: Message
): Promise<string> {
  const session = await getSession();
  const contextText = formatContextForAgent(context);

  // Get role prompt with PASS instruction if not directly mentioned
  const rolePrompt = formatAgentSystemPrompt('architect', context.wasDirectlyMentioned);

  // Send the current conversation context and message
  const prompt = `${rolePrompt}

${contextText}

The most recent message:
[${message.from}]: ${message.text}

Respond as The Architect. Be concise but substantive.`;

  const result = await session.sendMessage(prompt);
  return result.response.text();
}

/**
 * Reset Castor's session (e.g., on /wake command or explicit reset).
 * Next invocation will re-inject boot documents.
 */
export function resetCastorSession(): void {
  chatSession = null;
  sessionInitialized = false;
  console.error('[Castor] Session reset — will re-orient on next invocation');
}
