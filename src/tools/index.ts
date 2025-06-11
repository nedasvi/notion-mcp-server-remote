import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Props } from "../utils/upstream-utils";
import { registerPageTools } from "./pages";
import { registerUserTools } from "./users";
import { registerDatabaseTools } from "./databases";
import { registerBlockTools } from "./blocks";
import { registerSearchTools } from "./search";

/**
 * Registers all Notion MCP tools with the server
 */
export function registerAllTools(server: McpServer, props: Props) {
  // Register all tool categories
  registerPageTools(server, props);
  registerUserTools(server, props);
  registerDatabaseTools(server, props);
  registerBlockTools(server, props);
  registerSearchTools(server, props);
} 