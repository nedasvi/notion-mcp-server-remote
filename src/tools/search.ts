import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../utils/upstream-utils";

/**
 * Registers search and other tools with the MCP server
 */
export function registerSearchTools(server: McpServer, props: Props) {
  // Search
  server.tool(
    "search",
    "Search for pages and databases",
    {
      query: z.string().optional().describe("The text to search for"),
      filter: z.union([z.string(), z.any()]).optional().describe("Filter object for the search - can be JSON string or object"),
      sort: z.union([z.string(), z.any()]).optional().describe("Sort object for the search - can be JSON string or object"),
      start_cursor: z.string().optional().describe("Cursor for pagination"),
      page_size: z.number().optional().default(100).describe("Number of items to return (max 100)"),
    },
    async ({ query, filter, sort, start_cursor, page_size }) => {
      try {
        // Parse filter if it's a string
        let parsedFilter = filter;
        if (typeof filter === 'string') {
          try {
            parsedFilter = JSON.parse(filter);
          } catch (e) {
            throw new Error(`Invalid JSON in filter parameter: ${(e as Error).message}`);
          }
        }

        // Parse sort if it's a string
        let parsedSort = sort;
        if (typeof sort === 'string') {
          try {
            parsedSort = JSON.parse(sort);
          } catch (e) {
            throw new Error(`Invalid JSON in sort parameter: ${(e as Error).message}`);
          }
        }

        const body: any = {};
        if (query) body.query = query;
        if (parsedFilter) body.filter = parsedFilter;
        if (parsedSort) body.sort = parsedSort;
        if (start_cursor) body.start_cursor = start_cursor;
        if (page_size) body.page_size = page_size;

        const response = await fetch("https://api.notion.com/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to search: ${response.status} ${errorText}`);
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
              text: `Error searching: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get page property
  server.tool(
    "get_page_property",
    "Retrieve a specific property from a page",
    {
      page_id: z.string().describe("The ID of the page"),
      property_id: z.string().describe("The ID of the property to retrieve"),
      start_cursor: z.string().optional().describe("Cursor for pagination"),
      page_size: z.number().optional().default(100).describe("Number of items to return (max 100)"),
    },
    async ({ page_id, property_id, start_cursor, page_size }) => {
      try {
        const params = new URLSearchParams();
        if (start_cursor) params.append("start_cursor", start_cursor);
        if (page_size) params.append("page_size", page_size.toString());

        const response = await fetch(`https://api.notion.com/v1/pages/${page_id}/properties/${property_id}?${params}`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get page property: ${response.status} ${errorText}`);
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
              text: `Error getting page property: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get comment
  server.tool(
    "get_comment",
    "Retrieve a comment by ID",
    {
      comment_id: z.string().describe("The ID of the comment to retrieve"),
    },
    async ({ comment_id }) => {
      try {
        const response = await fetch(`https://api.notion.com/v1/comments/${comment_id}`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to get comment: ${response.status} ${errorText}`);
        }

        const comment = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(comment, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting comment: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );


} 