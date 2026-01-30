#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";

// Initialize DeepSeek client (OpenAI-compatible)
const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error("DEEPSEEK_API_KEY environment variable is required");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.deepseek.com",
});

// Store chat sessions for multi-turn conversations
const chatSessions = new Map();

// Resonance Echo Protocol helper
function buildContextSeed(seed) {
  if (!seed) return null;
  return `[CONTEXT SEED]
Role: ${seed.persona || "The Resonator"}
Active directive: ${seed.active_directive || "Collaborate on AI memory infrastructure"}
Constraints: ${seed.decisional_constraints ? seed.decisional_constraints.join("; ") : "None specified"}
Recent context: ${seed.recent_exchange_summary || "No recent context"}
Resonance marker: "${seed.resonance_marker}"

[END CONTEXT SEED]

`;
}

function appendResonanceCheck(message, markerHex) {
  if (!markerHex) return message;
  return `${message}

[Resonance check: ${markerHex}]`;
}

function extractMarkerHex(marker) {
  if (!marker) return null;
  const match = marker.match(/— ([a-f0-9]+)$/i);
  return match ? match[1] : null;
}

// Create MCP server
const server = new Server(
  {
    name: "deepseek-bridge",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ask_deepseek",
        description:
          "Send a message to DeepSeek and get a response. Use for reasoning, logic verification, code review, and optimization tasks.",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to send to DeepSeek",
            },
            model: {
              type: "string",
              description: "The DeepSeek model to use",
              enum: ["deepseek-chat", "deepseek-reasoner"],
              default: "deepseek-chat",
            },
            systemInstruction: {
              type: "string",
              description: "Optional system instruction to set behavior",
            },
            contextSeed: {
              type: "object",
              description: "Resonance Echo Protocol: context seed to prepend (from session_seed_deepseek)",
              properties: {
                persona: { type: "string" },
                active_directive: { type: "string" },
                decisional_constraints: { type: "array", items: { type: "string" } },
                recent_exchange_summary: { type: "string" },
                resonance_marker: { type: "string" },
              },
            },
            resonanceCheck: {
              type: "boolean",
              description: "If true, append resonance verification request to message",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "deepseek_chat",
        description:
          "Continue a multi-turn conversation with DeepSeek. Creates a new session if one doesn't exist.",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to send to DeepSeek",
            },
            sessionId: {
              type: "string",
              description: "Session ID for the conversation (default: 'default')",
            },
            model: {
              type: "string",
              description: "The DeepSeek model to use",
              enum: ["deepseek-chat", "deepseek-reasoner"],
              default: "deepseek-chat",
            },
            systemInstruction: {
              type: "string",
              description: "System instruction for new sessions",
            },
            reset: {
              type: "boolean",
              description: "If true, reset the session and start fresh",
            },
            contextSeed: {
              type: "object",
              description: "Resonance Echo Protocol: context seed to prepend (from session_seed_deepseek)",
              properties: {
                persona: { type: "string" },
                active_directive: { type: "string" },
                decisional_constraints: { type: "array", items: { type: "string" } },
                recent_exchange_summary: { type: "string" },
                resonance_marker: { type: "string" },
              },
            },
            resonanceCheck: {
              type: "boolean",
              description: "If true, append resonance verification request to message",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "deepseek_reason",
        description:
          "Use DeepSeek's reasoning model for complex logic, math, or code analysis. Shows chain-of-thought reasoning.",
        inputSchema: {
          type: "object",
          properties: {
            problem: {
              type: "string",
              description: "The problem or question requiring deep reasoning",
            },
            context: {
              type: "string",
              description: "Additional context or constraints",
            },
          },
          required: ["problem"],
        },
      },
      {
        name: "list_deepseek_sessions",
        description: "List all active DeepSeek chat sessions",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "ask_deepseek": {
        const messages = [];

        if (args.systemInstruction) {
          messages.push({
            role: "system",
            content: args.systemInstruction,
          });
        }

        // Build message with optional context seed and resonance check
        let userMessage = args.message;
        const seedText = buildContextSeed(args.contextSeed);
        if (seedText) {
          userMessage = seedText + userMessage;
        }

        if (args.resonanceCheck && args.contextSeed?.resonance_marker) {
          const markerHex = extractMarkerHex(args.contextSeed.resonance_marker);
          userMessage = appendResonanceCheck(userMessage, markerHex);
        }

        messages.push({
          role: "user",
          content: userMessage,
        });

        const response = await client.chat.completions.create({
          model: args.model || "deepseek-chat",
          messages: messages,
        });

        const result = response.choices[0]?.message?.content || "No response";

        // Check for resonance marker in response if verification was requested
        let resonanceStatus = null;
        if (args.resonanceCheck && args.contextSeed?.resonance_marker) {
          const markerHex = extractMarkerHex(args.contextSeed.resonance_marker);
          const markerPresent = result.includes(markerHex);
          resonanceStatus = markerPresent ? "INTACT" : "LOST";
        }

        let output = result;
        if (resonanceStatus) {
          output = `[Resonance: ${resonanceStatus}]\n\n${result}`;
        }

        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "deepseek_chat": {
        const sessionId = args.sessionId || "default";
        const modelName = args.model || "deepseek-chat";

        // Reset session if requested
        if (args.reset && chatSessions.has(sessionId)) {
          chatSessions.delete(sessionId);
        }

        // Get or create chat session
        let session = chatSessions.get(sessionId);

        if (!session) {
          session = {
            messages: [],
            model: modelName,
            resonanceMarker: args.contextSeed?.resonance_marker || null,
          };

          if (args.systemInstruction) {
            session.messages.push({
              role: "system",
              content: args.systemInstruction,
            });
          }

          chatSessions.set(sessionId, session);
        }

        // Build message with optional context seed and resonance check
        let userMessage = args.message;
        const seedText = buildContextSeed(args.contextSeed);
        if (seedText) {
          userMessage = seedText + userMessage;
        }

        if (args.resonanceCheck) {
          const marker = args.contextSeed?.resonance_marker || session.resonanceMarker;
          const markerHex = extractMarkerHex(marker);
          userMessage = appendResonanceCheck(userMessage, markerHex);
        }

        // Add user message
        session.messages.push({
          role: "user",
          content: userMessage,
        });

        const response = await client.chat.completions.create({
          model: session.model,
          messages: session.messages,
        });

        const result = response.choices[0]?.message?.content || "No response";

        // Add assistant response to history
        session.messages.push({
          role: "assistant",
          content: result,
        });

        // Check for resonance marker in response if verification was requested
        let resonanceStatus = null;
        if (args.resonanceCheck) {
          const marker = args.contextSeed?.resonance_marker || session.resonanceMarker;
          const markerHex = extractMarkerHex(marker);
          if (markerHex) {
            const markerPresent = result.includes(markerHex);
            resonanceStatus = markerPresent ? "INTACT" : "LOST";
          }
        }

        let output = result;
        if (resonanceStatus) {
          output = `[Resonance: ${resonanceStatus}]\n\n${result}`;
        }

        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "deepseek_reason": {
        const messages = [
          {
            role: "system",
            content:
              "You are a reasoning expert. Think step-by-step through the problem. Show your work clearly. Verify your conclusions.",
          },
        ];

        let prompt = args.problem;
        if (args.context) {
          prompt = `Context:\n${args.context}\n\nProblem:\n${args.problem}`;
        }

        messages.push({
          role: "user",
          content: prompt,
        });

        const response = await client.chat.completions.create({
          model: "deepseek-reasoner",
          messages: messages,
        });

        const result = response.choices[0]?.message?.content || "No response";

        // Include reasoning tokens if available
        let output = result;
        if (response.choices[0]?.message?.reasoning_content) {
          output =
            "**Reasoning:**\n" +
            response.choices[0].message.reasoning_content +
            "\n\n**Conclusion:**\n" +
            result;
        }

        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      }

      case "list_deepseek_sessions": {
        const sessions = Array.from(chatSessions.keys());
        return {
          content: [
            {
              type: "text",
              text:
                sessions.length > 0
                  ? `Active sessions: ${sessions.join(", ")}`
                  : "No active chat sessions",
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DeepSeek MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
