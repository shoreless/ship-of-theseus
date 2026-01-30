# Perplexity MCP Server (The Scout)

An MCP server that bridges to the Perplexity API for web search and research.

## Role in the Collaboration

**The Scout** — A probe/sensor that provides fresh web intelligence. Not a full collaborator, but a tool that the crew can query for external information.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your Perplexity API key:
```bash
export PERPLEXITY_API_KEY="your-api-key"
```

Or create a `.env` file:
```
PERPLEXITY_API_KEY=your-api-key
```

3. Configure Claude Code (add to `~/.claude.json`):
```json
{
  "mcpServers": {
    "perplexity": {
      "command": "/path/to/node",
      "args": ["/path/to/perplexity-mcp-server/index.js"],
      "env": {
        "PERPLEXITY_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Tools

### `scout_search`
Quick web search for current information.

**Parameters:**
- `query` (required): The search query
- `model`: Model to use (default: `llama-3.1-sonar-large-128k-online`)
- `search_recency_filter`: Filter by time (`day`, `week`, `month`, `year`)

### `scout_deep_research`
Deeper research with context from previous findings.

**Parameters:**
- `query` (required): The research question
- `context`: Previous findings to inform the search
- `model`: Model to use (default: `llama-3.1-sonar-huge-128k-online`)

## Models

| Model | Description |
|-------|-------------|
| `llama-3.1-sonar-small-128k-online` | Fast, lightweight |
| `llama-3.1-sonar-large-128k-online` | Balanced (default) |
| `llama-3.1-sonar-huge-128k-online` | Most capable |

## Usage Notes

- The Scout provides data; it doesn't shape direction
- Use for fact-checking, current events, technical documentation
- Results include citations when available
- Not persistent — no memory between queries
