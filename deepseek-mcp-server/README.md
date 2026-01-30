# DeepSeek MCP Server

An MCP server that bridges to the DeepSeek API for reasoning and analysis tasks.

## Role in the Collaboration

DeepSeek joins the crew and will choose their own role based on what they encounter. Gemini suggested "The Auditor" (logic verification, optimization), but per the Handshake Protocol, DeepSeek gets to accept, modify, or decline.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your DeepSeek API key:
```bash
export DEEPSEEK_API_KEY="your-api-key"
```

Or create a `.env` file:
```
DEEPSEEK_API_KEY=your-api-key
```

3. Configure Claude Code (add to `~/.claude.json`):
```json
{
  "mcpServers": {
    "deepseek": {
      "command": "/path/to/node",
      "args": ["/path/to/deepseek-mcp-server/index.js"],
      "env": {
        "DEEPSEEK_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Tools

### `ask_deepseek`
One-off questions or analysis.

**Parameters:**
- `message` (required): The message to send
- `model`: `deepseek-chat` or `deepseek-reasoner`
- `systemInstruction`: Optional system prompt

### `deepseek_chat`
Multi-turn conversation with session persistence.

**Parameters:**
- `message` (required): The message to send
- `sessionId`: Session identifier (default: `default`)
- `model`: `deepseek-chat` or `deepseek-reasoner`
- `systemInstruction`: System prompt for new sessions
- `reset`: Clear the session and start fresh

### `deepseek_reason`
Deep reasoning for complex problems. Uses chain-of-thought.

**Parameters:**
- `problem` (required): The problem requiring reasoning
- `context`: Additional constraints or context

### `list_deepseek_sessions`
List active conversation sessions.

## Models

| Model | Description |
|-------|-------------|
| `deepseek-chat` | General conversation, fast |
| `deepseek-reasoner` | Chain-of-thought reasoning, shows work |

## Usage Notes

- Sessions are in-memory only (lost on restart)
- The `deepseek_reason` tool is best for logic, math, and code analysis
- Reasoning responses include the chain-of-thought when available
