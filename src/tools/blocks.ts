import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../utils/upstream-utils";

/**
 * Registers block-related tools with the MCP server
 */
export function registerBlockTools(server: McpServer, props: Props) {
  // Get block children
  server.tool(
    "get_block_children",
    "Retrieve children of a block",
    {
      block_id: z.string().describe("The ID of the block to get children from"),
      start_cursor: z.string().optional().describe("Cursor for pagination"),
      page_size: z.number().optional().default(100).describe("Number of items to return (max 100)"),
    },
    async ({ block_id, start_cursor, page_size }) => {
      try {
        const params = new URLSearchParams();
        if (start_cursor) params.append("start_cursor", start_cursor);
        if (page_size) params.append("page_size", page_size.toString());

        const response = await fetch(`https://api.notion.com/v1/blocks/${block_id}/children?${params}`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get block children: ${response.status} ${errorText}`);
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
              text: `Error getting block children: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Append block children
  server.tool(
    "append_block_children",
    "Append children to a block",
    {
      block_id: z.string().describe("The ID of the block to append children to"),
      children: z.array(z.any()).describe("Array of block objects to append"),
    },
    async ({ block_id, children }) => {
      try {
        const response = await fetch(`https://api.notion.com/v1/blocks/${block_id}/children`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ children }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to append block children: ${response.status} ${errorText}`);
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
              text: `Error appending block children: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Retrieve a block
  server.tool(
    "get_block",
    "Retrieve a block by ID",
    {
      block_id: z.string().describe("The ID of the block to retrieve"),
    },
    async ({ block_id }) => {
      try {
        const response = await fetch(`https://api.notion.com/v1/blocks/${block_id}`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to retrieve block: ${response.status} ${errorText}`);
        }

        const block = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(block, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving block: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Update a block
  server.tool(
    "update_block",
    "Update a block's content",
    {
      block_id: z.string().describe("The ID of the block to update"),
      block_data: z.union([z.string(), z.any()]).describe("The updated block data - can be JSON string or object"),
    },
    async ({ block_id, block_data }) => {
      try {
        // Parse block_data if it's a string
        let parsedBlockData = block_data;
        if (typeof block_data === 'string') {
          try {
            parsedBlockData = JSON.parse(block_data);
          } catch (e) {
            throw new Error(`Invalid JSON in block_data parameter: ${(e as Error).message}`);
          }
        }

        const response = await fetch(`https://api.notion.com/v1/blocks/${block_id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsedBlockData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to update block: ${response.status} ${errorText}`);
        }

        const block = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(block, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating block: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Delete a block
  server.tool(
    "delete_block",
    "Delete a block",
    {
      block_id: z.string().describe("The ID of the block to delete"),
    },
    async ({ block_id }) => {
      try {
        const response = await fetch(`https://api.notion.com/v1/blocks/${block_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to delete block: ${response.status} ${errorText}`);
        }

        const block = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(block, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error deleting block: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
} 