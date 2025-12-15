# PawBuck Health MCP Server

An MCP (Model Context Protocol) server that provides tools to query pet health data from Supabase.

## Tools Available

- `get_pet_vaccinations` - Fetch vaccination records by pet_id
- `get_pet_medications` - Fetch medication records by pet_id  
- `get_pet_lab_results` - Fetch lab results by pet_id
- `get_pet_clinical_exams` - Fetch clinical exam records by pet_id
- `get_pet_health_summary` - Get comprehensive health overview for a pet

## Setup

1. Install dependencies:
   ```bash
   cd mcp-server
   npm install
   ```

2. Create a `.env` file with your Supabase credentials:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. Build the server:
   ```bash
   npm run build
   ```

## Using with Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "pawbuck-health": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Development

Run in development mode:
```bash
npm run dev
```

## Example Usage

Once configured in Cursor, you can ask questions like:
- "What vaccinations does pet XYZ have?"
- "Show me the health summary for pet ABC"
- "What medications is this pet currently taking?"
