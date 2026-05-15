# PawBuck Notion Bug Agent

Fetch bug observations from the team's Notion database and review them in Cursor.

**Notion database:** [Please add your bug observations here](https://www.notion.so/Please-add-your-bug-observations-here-34f5d2e4a5ff8076b561cee6ec0eb8c9)

## What it does

- **MCP server** — Cursor tools to list bugs, fetch details, build review prompts, and (with your approval) write review notes back to Notion
- **CLI** — print a structured review prompt for unreviewed bugs (useful before starting a Cursor session)

**Review-only by default.** The agent triages bugs and reports findings. It does **not** auto-commit code, auto-fix bugs, or write to Notion without your explicit approval.

## One-time setup

### 1. Create a Notion integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create an **internal** integration
3. Copy the **Internal Integration Secret** → this is `NOTION_API_KEY`

### 2. Share the bug database with the integration

1. Open the [bug observations database](https://www.notion.so/Please-add-your-bug-observations-here-34f5d2e4a5ff8076b561cee6ec0eb8c9)
2. Click **⋯** → **Connections** → add your integration

### 3. Install and build

```bash
pnpm install
pnpm --filter @pawbuck/notion-bug-agent build
```

### 4. Configure Cursor MCP

Add to `.cursor/mcp.json` (repo root or your user config):

```json
{
  "mcpServers": {
    "pawbuck-notion-bugs": {
      "command": "node",
      "args": ["tools/notion-bug-agent/dist/index.js"],
      "env": {
        "NOTION_API_KEY": "secret_..."
      }
    }
  }
}
```

Restart Cursor after saving.

## Recommended Notion fields

The agent maps fields flexibly, but these names work best:

| Field | Type | Purpose |
|-------|------|---------|
| Name | Title | Bug title |
| Status | Status or Select | Open, Triaged, Needs info, Fixed |
| Severity | Select | Low, Medium, High, Critical |
| Description | Text | What happened |
| Steps to reproduce | Text | Repro steps |
| Platform | Select | iOS, Android, Web |
| Review notes | Text | Engineering triage output (written by agent) |

## Usage in Cursor

After MCP is configured, try prompts like:

- "List unreviewed bug observations from Notion"
- "Review the top 5 open bugs and suggest fixes"
- "Triage bug `<page-id>` against the current codebase"
- "Post the approved review to Notion for bug `<page-id>`" *(only after you approve the notes)*

The agent will **not** commit code or push fixes unless you explicitly ask. Reviews are presented for your approval first.

### MCP tools

| Tool | Description |
|------|-------------|
| `list_bug_observations` | List bugs with optional status / unreviewed filters |
| `get_bug_observation` | Full details for one bug |
| `get_bug_database_schema` | Property names and types in your database |
| `build_bug_review_prompt` | Structured prompt for batch review |
| `update_bug_review` | Save review notes to Notion — **only after user approves the text** |

## CLI

```bash
# Print review prompt for up to 10 unreviewed bugs
pnpm notion:bug-review

# Filter by status
pnpm notion:bug-review -- --status Open --limit 5

# Review one bug
pnpm notion:bug-review -- --page-id <notion-page-id>

# Inspect database schema
pnpm notion:bug-review -- --schema
```

Requires `NOTION_API_KEY` in your environment (or `.env` loaded by your shell).

## Environment variables

| Variable | Required | Default |
|----------|----------|---------|
| `NOTION_API_KEY` | Yes | — |
| `NOTION_BUG_DATABASE_ID` | No | `34f5d2e4-a5ff-8076-b561-cee6ec0eb8c9` |

## Development

```bash
pnpm --filter @pawbuck/notion-bug-agent dev      # MCP server (stdio)
pnpm --filter @pawbuck/notion-bug-agent test
pnpm --filter @pawbuck/notion-bug-agent build
```
