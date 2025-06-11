import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../utils/upstream-utils";

/**
 * Registers user-related tools with the MCP server
 */
export function registerUserTools(server: McpServer, props: Props) {
  // Get user by ID
  server.tool(
    "get_user",
    "Retrieve a user by ID",
    {
      user_id: z.string().describe("The ID of the user to retrieve"),
    },
    async ({ user_id }) => {
      try {
        const response = await fetch(`https://api.notion.com/v1/users/${user_id}`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to retrieve user: ${response.status} ${errorText}`);
        }

        const user = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving user: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // List all users
  server.tool(
    "get_users",
    "List all users in the workspace",
    {
      start_cursor: z.string().optional().describe("Cursor for pagination"),
      page_size: z.number().optional().default(100).describe("Number of items to return (max 100)"),
    },
    async ({ start_cursor, page_size }) => {
      try {
        const params = new URLSearchParams();
        if (start_cursor) params.append("start_cursor", start_cursor);
        if (page_size) params.append("page_size", page_size.toString());

        const response = await fetch(`https://api.notion.com/v1/users?${params}`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to list users: ${response.status} ${errorText}`);
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
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing users: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get current bot user
  server.tool(
    "get_self",
    "Retrieve information about the current bot user",
    {},
    async () => {
      try {
        const response = await fetch("https://api.notion.com/v1/users/me", {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to retrieve bot user: ${response.status} ${errorText}`);
        }

        const user = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving bot user: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
} 