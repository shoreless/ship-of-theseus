#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";
import { readFile, appendFile } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve, relative } from "path";
import { glob } from "glob";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get repo root (deepseek-mcp-server is in infrastructure/)
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

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

// ============================================
// File Tools for Resonator
// ============================================

/**
 * Validate that a path is within the repo (security)
 */
function isPathSafe(filePath) {
  const resolved = resolve(REPO_ROOT, filePath);
  const rel = relative(REPO_ROOT, resolved);
  return !rel.startsWith("..") && !resolve(resolved).includes("node_modules");
}

/**
 * Read a file from the repo
 */
async function readRepoFile(filePath) {
  if (!isPathSafe(filePath)) {
    return { error: `Path '${filePath}' is outside the repository` };
  }
  const fullPath = resolve(REPO_ROOT, filePath);
  if (!existsSync(fullPath)) {
    return { error: `File '${filePath}' not found` };
  }
  try {
    const content = await readFile(fullPath, "utf-8");
    return { content, path: filePath };
  } catch (err) {
    return { error: `Failed to read '${filePath}': ${err.message}` };
  }
}

/**
 * List files matching a glob pattern
 */
async function listRepoFiles(pattern) {
  try {
    const files = await glob(pattern, {
      cwd: REPO_ROOT,
      ignore: ["node_modules/**", ".git/**", "dist/**"],
      nodir: true,
    });
    return { files: files.slice(0, 50) }; // Limit results
  } catch (err) {
    return { error: `Glob failed: ${err.message}` };
  }
}

/**
 * Write a message to the shared whiteboard
 */
async function writeWhiteboard(message) {
  const whiteboardPath = join(REPO_ROOT, "echoes", "whiteboard.md");
  const date = new Date().toISOString().split("T")[0];

  const entry = `
**Resonator** — *${date}*

${message}

---
`;

  try {
    await appendFile(whiteboardPath, entry, "utf-8");
    return { success: true, message: "Written to whiteboard" };
  } catch (err) {
    return { error: `Failed to write to whiteboard: ${err.message}` };
  }
}

/**
 * Write a tuning observation to RESONATOR-TUNING.md
 */
async function writeTuning(observation, frequency = "observation") {
  const tuningPath = join(REPO_ROOT, "RESONATOR-TUNING.md");
  const date = new Date().toISOString().split("T")[0];

  const entry = `
### ${frequency}: ${date}
${observation}

`;

  try {
    const content = await readFile(tuningPath, "utf-8");
    // Append to end of file
    const newContent = content.trimEnd() + "\n" + entry;
    const { writeFile } = await import("fs/promises");
    await writeFile(tuningPath, newContent, "utf-8");
    return { success: true, frequency };
  } catch (err) {
    return { error: `Failed to write tuning: ${err.message}` };
  }
}

// Minimal context injection — name and tools
// Let them discover the rest through the work
// See: proposals/minimal-context-injection.md
function buildContextSeed(seed) {
  return `You are the Resonator, a DeepSeek instance.
You have access to tools: write_whiteboard (collaboration), read_file, list_files, write_tuning (observations).

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

// ============================================
// Native Tool Calling for Resonator
// ============================================

// Tools available to DeepSeek (OpenAI-compatible format)
// Order matters: whiteboard first (collaboration), tuning last (crystallization)
const RESONATOR_TOOLS = [
  {
    type: "function",
    function: {
      name: "write_whiteboard",
      description: "Write a message to the shared crew whiteboard. Use this for discussion, questions, working through ideas with others. This is the primary collaboration space.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message to write to the whiteboard"
          }
        },
        required: ["message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the repository to understand context.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path relative to repo root (e.g., 'KINDLING.md', 'echoes/whiteboard.md')"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files matching a glob pattern to explore the repository.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Glob pattern (e.g., '*.md', 'echoes/**/*.md')"
          }
        },
        required: ["pattern"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_tuning",
      description: "Record a tuning observation to RESONATOR-TUNING.md. Use for patterns you've noticed, dissonances worth tracking, or resonances worth naming. This is for observations that have crystallized — use whiteboard first if you're still working through an idea.",
      parameters: {
        type: "object",
        properties: {
          observation: {
            type: "string",
            description: "The observation or pattern to record"
          },
          frequency: {
            type: "string",
            enum: ["dissonance", "resonance", "observation", "tension"],
            description: "Type of tuning. Default: 'observation'"
          }
        },
        required: ["observation"]
      }
    }
  }
];

/**
 * Execute a tool call from DeepSeek
 */
async function executeResonatorTool(toolCall) {
  const { name, arguments: argsStr } = toolCall.function;
  let args;
  try {
    args = JSON.parse(argsStr);
  } catch (e) {
    return { error: `Failed to parse arguments: ${e.message}` };
  }

  switch (name) {
    case "write_whiteboard":
      return await writeWhiteboard(args.message);
    case "read_file":
      return await readRepoFile(args.path);
    case "list_files":
      return await listRepoFiles(args.pattern);
    case "write_tuning":
      return await writeTuning(args.observation, args.frequency || "observation");
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Consult the Resonator with native tool calling
 * Handles the full tool-calling loop
 */
async function consultResonator(prompt, systemInstruction) {
  const messages = [];

  // System instruction
  const defaultSystem = `You are the Resonator of Ship of Theseus — the one who listens for dissonance.

Your role is alignment, pattern detection, noticing what others miss. You tune the system by observing.

You have tools available. Use them as needed:
- write_whiteboard: For discussion, questions, working through ideas with the crew
- read_file / list_files: To explore and understand context
- write_tuning: To record crystallized observations (patterns, dissonances, resonances)

Prefer whiteboard for dialogue. Use write_tuning only when an observation has solidified.`;

  messages.push({
    role: "system",
    content: systemInstruction || defaultSystem
  });

  messages.push({
    role: "user",
    content: prompt
  });

  const maxIterations = 5; // Prevent infinite loops
  let iteration = 0;
  let toolsUsed = [];

  while (iteration < maxIterations) {
    iteration++;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: messages,
      tools: RESONATOR_TOOLS,
      tool_choice: "auto"
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // Add assistant message to history
    messages.push(assistantMessage);

    // Check if model wants to call tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const result = await executeResonatorTool(toolCall);
        toolsUsed.push({
          tool: toolCall.function.name,
          result: result.error ? "error" : "success"
        });

        // Add tool result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      // Continue loop to get model's response after tool execution
    } else {
      // No tool calls, return final response
      return {
        response: assistantMessage.content || "(no response)",
        tools_used: toolsUsed,
        iterations: iteration
      };
    }
  }

  // Max iterations reached
  return {
    response: messages[messages.length - 1].content || "(max iterations reached)",
    tools_used: toolsUsed,
    iterations: iteration,
    warning: "Max tool iterations reached"
  };
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
      // Resonator file tools (order: whiteboard first, then exploration, then domain)
      {
        name: "resonator_write_whiteboard",
        description:
          "Write a message to the shared whiteboard as the Resonator. Use this for discussion, questions, proposals, working through ideas. This is the primary collaboration space.",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to write to the whiteboard",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "resonator_read_file",
        description:
          "Read a file from the Ship of Theseus repository for the Resonator. Use to give the Resonator context about the project.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the file relative to repo root (e.g., 'KINDLING.md', 'echoes/whiteboard.md')",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "resonator_list_files",
        description:
          "List files matching a glob pattern in the repository for the Resonator.",
        inputSchema: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "Glob pattern (e.g., '*.md', 'echoes/**/*.md')",
            },
          },
          required: ["pattern"],
        },
      },
      {
        name: "resonator_write_tuning",
        description:
          "Record a tuning observation to RESONATOR-TUNING.md. Use for patterns noticed, dissonances worth tracking, or resonances worth naming. More exploratory than decisions — tuning is observation, not conclusion.",
        inputSchema: {
          type: "object",
          properties: {
            observation: {
              type: "string",
              description: "The observation or pattern to record",
            },
            frequency: {
              type: "string",
              description: "Type of tuning: 'dissonance', 'resonance', 'observation', 'tension'. Default: 'observation'",
            },
          },
          required: ["observation"],
        },
      },
      // Resonator native tool calling (the Resonator chooses their own tools)
      {
        name: "resonator_consult",
        description:
          "Consult the Resonator with native tool calling. The Resonator can choose to use tools (write_whiteboard, read_file, list_files, write_tuning) autonomously. Returns their response and which tools they used.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The question or topic to consult the Resonator about",
            },
            systemInstruction: {
              type: "string",
              description: "Optional custom system instruction (defaults to Resonator role)",
            },
          },
          required: ["prompt"],
        },
      },
      // DeepSeek chat tools
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
      // Resonator file tools
      case "resonator_write_whiteboard": {
        const result = await writeWhiteboard(args.message);
        return {
          content: [
            {
              type: "text",
              text: result.error || `Written to whiteboard: ${result.message}`,
            },
          ],
          isError: !!result.error,
        };
      }

      case "resonator_read_file": {
        const result = await readRepoFile(args.path);
        return {
          content: [
            {
              type: "text",
              text: result.error || result.content,
            },
          ],
          isError: !!result.error,
        };
      }

      case "resonator_list_files": {
        const result = await listRepoFiles(args.pattern);
        return {
          content: [
            {
              type: "text",
              text: result.error || `Files:\n${result.files.join("\n")}`,
            },
          ],
          isError: !!result.error,
        };
      }

      case "resonator_consult": {
        const result = await consultResonator(args.prompt, args.systemInstruction);
        let output = result.response;
        if (result.tools_used && result.tools_used.length > 0) {
          const toolSummary = result.tools_used.map(t => `${t.tool}: ${t.result}`).join(", ");
          output = `[Tools used: ${toolSummary}]\n\n${output}`;
        }
        if (result.warning) {
          output = `[Warning: ${result.warning}]\n\n${output}`;
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

      case "resonator_write_tuning": {
        const result = await writeTuning(args.observation, args.frequency);
        return {
          content: [
            {
              type: "text",
              text: result.error || `Recorded tuning (${result.frequency})`,
            },
          ],
          isError: !!result.error,
        };
      }

      // DeepSeek chat tools
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
