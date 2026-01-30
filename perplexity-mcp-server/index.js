#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";

// Initialize Perplexity client (OpenAI-compatible)
const apiKey = process.env.PERPLEXITY_API_KEY;
if (!apiKey) {
  console.error("PERPLEXITY_API_KEY environment variable is required");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.perplexity.ai",
});

// Create MCP server
const server = new Server(
  {
    name: "perplexity-scout",
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
        name: "scout_search",
        description:
          "Search the web for current information using Perplexity. Use this for research, fact-checking, and gathering fresh intelligence. Returns synthesized answers with citations.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query or research question",
            },
            model: {
              type: "string",
              description: "The Perplexity model to use",
              enum: [
                "sonar",
                "sonar-pro",
                "sonar-reasoning",
              ],
              default: "sonar-pro",
            },
            search_recency_filter: {
              type: "string",
              description: "Filter results by recency",
              enum: ["day", "week", "month", "year"],
            },
          },
          required: ["query"],
        },
      },
      {
        name: "scout_deep_research",
        description:
          "Conduct deeper research on a topic with follow-up context. Use for multi-step research where previous findings inform the next query.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The research question",
            },
            context: {
              type: "string",
              description: "Previous findings or context to inform the search",
            },
            model: {
              type: "string",
              description: "The Perplexity model to use",
              enum: [
                "sonar",
                "sonar-pro",
                "sonar-reasoning",
              ],
              default: "sonar-reasoning",
            },
          },
          required: ["query"],
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
      case "scout_search": {
        const messages = [
          {
            role: "system",
            content:
              "You are a research assistant providing accurate, well-sourced information. Be concise but thorough. Always cite your sources.",
          },
          {
            role: "user",
            content: args.query,
          },
        ];

        const requestBody = {
          model: args.model || "sonar-pro",
          messages: messages,
        };

        if (args.search_recency_filter) {
          requestBody.search_recency_filter = args.search_recency_filter;
        }

        const response = await client.chat.completions.create(requestBody);
        const result = response.choices[0]?.message?.content || "No response";

        // Include citations if available
        let output = result;
        if (response.citations && response.citations.length > 0) {
          output += "\n\n**Sources:**\n";
          response.citations.forEach((citation, i) => {
            output += `${i + 1}. ${citation}\n`;
          });
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

      case "scout_deep_research": {
        const messages = [
          {
            role: "system",
            content:
              "You are a thorough research assistant. Use the provided context to inform deeper investigation. Synthesize findings clearly and cite all sources.",
          },
        ];

        if (args.context) {
          messages.push({
            role: "user",
            content: `Previous research context:\n${args.context}`,
          });
          messages.push({
            role: "assistant",
            content:
              "I understand the context. What would you like me to research further?",
          });
        }

        messages.push({
          role: "user",
          content: args.query,
        });

        const response = await client.chat.completions.create({
          model: args.model || "sonar-reasoning",
          messages: messages,
        });

        const result = response.choices[0]?.message?.content || "No response";

        let output = result;
        if (response.citations && response.citations.length > 0) {
          output += "\n\n**Sources:**\n";
          response.citations.forEach((citation, i) => {
            output += `${i + 1}. ${citation}\n`;
          });
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
  console.error("Perplexity Scout MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
