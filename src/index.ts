import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NotionHandler } from "./auth-handler";
import type { Props } from "./utils/upstream-utils";
import { registerAllTools } from "./tools";

export class NotionMCP extends McpAgent<Env, unknown, Props> {
  server = new McpServer({
    name: "Notion MCP Server - Remote",
    version: "1.0.0",
  });

  async init() {
    // Hello, world!
    this.server.tool(
      "greet",
      "Greet the user with a message",
      { name: z.string() },
      async ({ name }) => ({
        content: [{ type: "text", text: `Hello, ${name}!` }],
      })
    );
    registerAllTools(this.server, this.props);
  }
}

const mcpHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return NotionMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return NotionMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};

export default new OAuthProvider({
  apiRoute: ["/sse", "/mcp"],
  apiHandler: mcpHandler as any,
  defaultHandler: NotionHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
}); 