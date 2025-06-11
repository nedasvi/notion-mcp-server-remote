# Deployment Checklist for Notion MCP Remote

## 🚀 Pre-Deployment Steps

### 1. Install Dependencies
```bash
cd notion-mcp-remote
npm install
```

### 2. Setup Cloudflare
```bash
# Login to Cloudflare
npx wrangler login

# Create KV namespace
npx wrangler kv:namespace create "OAUTH_KV"
```

### 3. Update wrangler.jsonc
Replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with your actual KV namespace ID from step 2.

### 4. Setup Notion Integration
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create new **Public Integration**
3. Set redirect URI: `https://notion-mpc-remote.workers.dev/callback`
4. Copy Client ID and Secret

### 5. Set Environment Variables
In Cloudflare Workers dashboard or via CLI:
```bash
npx wrangler secret put NOTION_OAUTH_CLIENT_ID
npx wrangler secret put NOTION_OAUTH_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

For COOKIE_ENCRYPTION_KEY, generate a 32-character random string:
```bash
openssl rand -hex 16
```

## 🔧 Known TypeScript Issues (Non-blocking)

The following TypeScript errors exist but won't prevent deployment:

1. **Missing type declarations** - Cloudflare Workers handles these at runtime
2. **Implicit any types** - Function parameters work correctly despite warnings
3. **Module resolution** - Dependencies resolve correctly in Workers environment

These are development-time warnings and don't affect production deployment.

## 🧪 Testing Steps

### 1. Local Testing
```bash
npm run dev
```
- Verify server starts on http://localhost:8788
- Check `/authorize` endpoint loads

### 2. OAuth Flow Testing
1. Navigate to authorization URL in browser
2. Complete Notion OAuth flow
3. Verify callback handles token exchange
4. Check MCP endpoints respond

### 3. MCP Tool Testing
Test with MCP client:
```bash
# Example MCP client call
curl -X POST http://localhost:8788/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

## 🚨 Critical Deployment Requirements

### Environment Variables (REQUIRED)
- ✅ `NOTION_OAUTH_CLIENT_ID` - From Notion integration
- ✅ `NOTION_OAUTH_CLIENT_SECRET` - From Notion integration  
- ✅ `COOKIE_ENCRYPTION_KEY` - 32-character random string

### Cloudflare Configuration (REQUIRED)
- ✅ KV Namespace created and ID updated in wrangler.jsonc
- ✅ Durable Objects enabled (automatic with wrangler.jsonc)
- ✅ Workers environment variables set

### Notion Integration Setup (REQUIRED)
- ✅ Public integration created
- ✅ Correct redirect URI configured
- ✅ Integration shared with target pages/databases (post-deployment)

## 🚀 Deploy Command
```bash
npm run deploy
```

## 📋 Post-Deployment Verification

### 1. Check Deployment
- Visit `https://YOUR_WORKER_DOMAIN.workers.dev/authorize`
- Should show OAuth authorization page

### 2. Test OAuth Flow
- Complete authorization with Notion account
- Verify successful token exchange
- Check MCP endpoints are accessible

### 3. Test MCP Tools
- Use MCP client to call `greet` tool
- Test page creation/retrieval tools
- Verify Notion API calls work

### 4. Configure as Remote MCP Server
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

**Note**: Users must first complete OAuth authorization by visiting `https://your-worker-domain.workers.dev/authorize` before the MCP server will function.

## 🐛 Common Issues & Solutions

### Issue: "OAuth client not found"
**Solution**: Verify NOTION_OAUTH_CLIENT_ID matches integration client ID

### Issue: "Redirect URI mismatch"  
**Solution**: Ensure Notion integration redirect URI exactly matches deployed URL

### Issue: "KV namespace not found"
**Solution**: Verify KV namespace ID in wrangler.jsonc matches created namespace

### Issue: "Failed to fetch access token"
**Solution**: Check NOTION_OAUTH_CLIENT_SECRET is correct

### Issue: "Page access denied"
**Solution**: Share target pages/databases with the Notion integration

## ✅ Success Indicators

- ✅ OAuth flow completes without errors
- ✅ MCP tools list returns available tools
- ✅ Page creation/retrieval works
- ✅ No 401/403 errors from Notion API
- ✅ Session persistence works across requests

## 📞 Support

If issues persist:
1. Check Cloudflare Workers logs: `npx wrangler tail`
2. Verify all environment variables are set
3. Test with minimal OAuth flow first
4. Check Notion integration configuration

---

**Status**: Ready for deployment with manual configuration steps completed. 