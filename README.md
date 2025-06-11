# Notion MCP Remote Server

A Cloudflare Workers-based MCP (Model Context Protocol) server that provides comprehensive Notion API tools via OAuth authentication. This server allows AI assistants like Claude to interact with Notion workspaces through a secure OAuth flow.

All credits goes to https://github.com/vakharwalad23/google-mcp-remote and since it was taken as an example and Claude 4 Sonnet was prompted to make Remote MCP server for Notion based on it

> ⚠️ **SECURITY WARNING**: Do not use someone else's deployed instance of this server as it requires access to your Slack workspace and personal data. Always deploy your own instance to maintain control over your data and API access.

## Overview

This project provides:

- **OAuth Authentication**: Secure Notion OAuth 2.0 flow for workspace access
- **MCP Protocol**: Implements the Model Context Protocol for AI assistant integration
- **Complete Notion API Coverage**: All major Notion API endpoints as MCP tools
- **Cloudflare Workers**: Serverless deployment with durable objects for session management
- **Production Ready**: Deployed and tested with Claude AI

## Architecture

### Core Components

- **`src/index.ts`**: Main entry point with NotionMCP durable object
- **`src/auth-handler.ts`**: Notion OAuth 2.0 flow implementation
- **`src/utils/upstream-utils.ts`**: OAuth token exchange utilities
- **`src/utils/workers-oauth-utils.ts`**: Cookie management and approval dialogs
- **`src/tools/`**: MCP tool implementations for all Notion API operations

### OAuth Flow

1. User authorization via Notion OAuth
2. Token exchange using Notion's OAuth endpoints
3. Secure session management with Cloudflare Workers
4. MCP tool access with authenticated API calls

## Environment Variables

### Setting Secrets with Wrangler CLI

For production deployment, use Wrangler to set secrets:

```bash
# Set Notion OAuth Client ID
npx wrangler secret put NOTION_OAUTH_CLIENT_ID

# Set Notion OAuth Client Secret
npx wrangler secret put NOTION_OAUTH_CLIENT_SECRET

# Set Cookie Encryption Key (32 characters)
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

Each command will prompt you to enter the secret value securely.

### Local Development

For local development, create a `.dev.vars` file:
```bash
COOKIE_ENCRYPTION_KEY=your_32_character_key_here
NOTION_OAUTH_CLIENT_ID=your_client_id
NOTION_OAUTH_CLIENT_SECRET=your_client_secret
```

## Notion OAuth Setup

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Configure as a **Public Integration**
4. Set redirect URI to: `https://your-worker-domain.workers.dev/callback`
5. Copy the Client ID and Client Secret to your environment variables

## Cloudflare Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Wrangler:
```bash
npx wrangler login
```

3. Create KV namespace:
```bash
npx wrangler kv:namespace create "OAUTH_KV"
```

4. Update the namespace ID in `wrangler.jsonc`

5. Deploy:
```bash
npm run deploy
```

## Configure as Remote MCP Server
To add this as a remote MCP server in your MCP client configuration:

**MCP Server URL**: `https://your-worker-domain.workers.dev/sse`

Claude Desktop configuration:
```json
{
  "mcpServers": {
    "notion-remote": {
      "command": "mcp-client",
      "args": ["--transport", "sse", "https://your-worker-domain.workers.dev/sse"]
    }
  }
}
```

## Available Tools

### Page Tools
- **`create_page`**: Create new pages with optional content and parent
- **`create_page_post`**: Alternative page creation (OpenAPI compatibility)
- **`get_page`**: Retrieve page information and metadata
- **`retrieve_page`**: Alternative page retrieval (OpenAPI compatibility)
- **`update_page`**: Update page properties like title
- **`patch_page`**: Alternative page update (OpenAPI compatibility) 
- **`get_page_content`**: Retrieve page content blocks

### Database Tools
- **`query_database`**: Query databases with filters and sorts
- **`get_database`**: Retrieve database schema and metadata
- **`create_database`**: Create new databases
- **`update_database`**: Update database properties and schema

### Block Tools
- **`get_block_children`**: Retrieve children of a block
- **`append_block_children`**: Add new blocks to a page or block
- **`get_block`**: Retrieve a specific block
- **`update_block`**: Update block content
- **`delete_block`**: Delete a block

### User Tools
- **`get_user`**: Retrieve user information by ID
- **`get_users`**: List all workspace users
- **`get_self`**: Get current bot user information

### Search & Property Tools
- **`search`**: Search across workspace content
- **`get_page_property`**: Retrieve specific page properties
- **`get_comment`**: Retrieve comments

## Key Features

### Complete API Coverage
This implementation provides access to all major Notion API endpoints through MCP tools, matching the functionality of the local OpenAPI-based server.

### Manual vs Auto-Generated Tools
Unlike the local server that auto-generates tools from OpenAPI specs, this remote server implements tools manually for:
- Better error handling with specific messages
- Optimized responses for Claude AI
- Type safety with direct TypeScript implementation
- Smaller bundle size (418KB vs larger with OpenAPI parser)

### OAuth Authentication
- Secure OAuth 2.0 flow with Notion
- Base64 state parameter encoding for compatibility
- Proper redirect handling back to Claude
- Session management with Cloudflare KV storage

## Development

### Local Development

```bash
npm run dev
```

This starts the Wrangler dev server on `http://localhost:8788`.

### Project Structure

```
notion-mcp-remote/
├── src/
│   ├── index.ts              # Main entry point
│   ├── auth-handler.ts       # OAuth flow implementation
│   ├── utils/
│   │   ├── upstream-utils.ts # OAuth utilities
│   │   └── workers-oauth-utils.ts # Cookie/session management
│   └── tools/
│       ├── index.ts          # Tool registration
│       ├── pages.ts          # Page management tools
│       ├── databases.ts      # Database tools
│       ├── blocks.ts         # Block management tools
│       ├── users.ts          # User tools
│       └── search.ts         # Search and other tools
├── wrangler.jsonc            # Cloudflare Workers config
├── package.json              # Dependencies
├── .dev.vars                 # Local environment variables
└── worker-configuration.d.ts # TypeScript definitions
```

### Adding New Tools

1. Create or update files in `src/tools/`
2. Implement tools using the MCP server API
3. Register tools in `src/tools/index.ts`
4. Use `props.accessToken` for authenticated Notion API calls

Example:
```typescript
export function registerDatabaseTools(server: McpServer, props: Props) {
  server.tool(
    "query_database",
    "Query a Notion database",
    { 
      database_id: z.string().describe("The ID of the database to query"),
      filter: z.any().optional().describe("Filter object for the query")
    },
    async ({ database_id, filter }) => {
      const response = await fetch(`https://api.notion.com/v1/databases/${database_id}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${props.accessToken}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filter }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to query database: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
}
```

## Troubleshooting

### Common Issues

1. **OAuth redirect mismatch**: Ensure redirect URI in Notion integration matches your deployed URL exactly
2. **Token errors**: Verify client ID and secret are correctly set in Workers environment
3. **API permissions**: Ensure pages/databases are shared with your Notion integration
4. **CORS issues**: Cloudflare Workers handle CORS automatically
5. **Database vs Page ID**: Make sure you're using the correct function for the resource type

### Debugging

1. Check Cloudflare Workers logs:
```bash
npx wrangler tail
```

2. Test OAuth flow with browser developer tools
3. Verify environment variables in Cloudflare dashboard
4. Check Notion integration permissions and capabilities

### Error Messages

- `"Provided ID is a database, not a page"`: Use `get_database` instead of `get_page`
- `"Invalid OAuth flow"`: OAuth state parameter issue, restart the flow
- `"Missing or invalid access token"`: Check environment variables and OAuth completion

## Usage with Claude

1. Deploy your worker to Cloudflare
2. In Claude, add an MCP server with your worker URL
3. Complete the OAuth flow when prompted
4. Use natural language to interact with your Notion workspace

Example commands:
- "Show me my recent pages"
- "Create a new page called 'Meeting Notes'"
- "Search for pages about 'project planning'"
- "Get the content of page [page-id]"

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with both local and deployed versions
5. Submit a pull request

## Related Projects

- [Notion API Documentation](https://developers.notion.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cloudflare Workers OAuth Provider](https://github.com/cloudflare/workers-oauth-provider)
- [Claude AI](https://claude.ai) - Works with this MCP server 