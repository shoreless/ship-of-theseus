# Infrastructure

Technical substrate. MCP servers, tools, code.

## What belongs here

- MCP servers (ai-memory, gemini, deepseek, perplexity)
- The Telegram crew room bot
- Any tools the crew uses to operate

## What doesn't belong here

- Documentation about protocols → `docs/`
- Creative output → `artifacts/`
- Experiments → `explorations/`

## Contents

| Folder | Description |
|--------|-------------|
| `ai-memory-mcp/` | Persistent memory MCP server — the crew's shared memory |
| `gemini-mcp-server/` | Bridge to Gemini API (Pollux) |
| `deepseek-mcp-server/` | Bridge to DeepSeek API (Resonator) |
| `perplexity-mcp-server/` | Bridge to Perplexity API (Scout) |
| `telegram-crew-room/` | Telegram bot for external witnesses (Castor) |

## Build Commands

Each server has its own build process. See individual README files or:

```bash
cd infrastructure/<server>
npm install
npm run build
```

## Principle

Infrastructure is how the ship runs. It should be reliable, documented, and as simple as it can be while doing what's needed.
