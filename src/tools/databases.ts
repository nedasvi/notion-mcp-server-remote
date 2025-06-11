import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../utils/upstream-utils";

/**
 * Registers database-related tools with the MCP server
 */
export function registerDatabaseTools(server: McpServer, props: Props) {
  // Query a database
  server.tool(
    "query_database",
    "Query a database with filters and sorts",
    {
      database_id: z.string().describe("The ID of the database to query"),
      filter: z.any().optional().describe("Filter object for the query"),
      sorts: z.array(z.any()).optional().describe("Sort objects for the query"),
      start_cursor: z.string().optional().describe("Cursor for pagination"),
      page_size: z.number().optional().default(100).describe("Number of items to return (max 100)"),
    },
    async ({ database_id, filter, sorts, start_cursor, page_size }) => {
      try {
        const body: any = {};
        if (filter) body.filter = filter;
        if (sorts) body.sorts = sorts;
        if (start_cursor) body.start_cursor = start_cursor;
        if (page_size) body.page_size = page_size;

        const response = await fetch(`https://api.notion.com/v1/databases/${database_id}/query`, {
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
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying database: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Retrieve a database
  server.tool(
    "get_database",
    "Retrieve a database by ID",
    {
      database_id: z.string().describe("The ID of the database to retrieve"),
    },
    async ({ database_id }) => {
      try {
        const response = await fetch(`https://api.notion.com/v1/databases/${database_id}`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to retrieve database: ${response.status} ${errorText}`);
        }

        const database = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(database, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving database: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Create a database
  server.tool(
    "create_database",
    "Create a new database",
    {
      parent_page_id: z.string().describe("ID of the parent page"),
      title: z.string().describe("Title of the database"),
      properties: z.any().describe("Database properties schema"),
    },
    async ({ parent_page_id, title, properties }) => {
      try {
        const body = {
          parent: {
            type: "page_id",
            page_id: parent_page_id,
          },
          title: [
            {
              type: "text",
              text: {
                content: title,
              },
            },
          ],
          properties,
        };

        const response = await fetch("https://api.notion.com/v1/databases", {
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
          throw new Error(`Failed to create database: ${response.status} ${errorText}`);
        }

        const database = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(database, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating database: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Update a database
  server.tool(
    "update_database",
    "Update a database's properties",
    {
      database_id: z.string().describe("The ID of the database to update"),
      title: z.string().optional().describe("New title for the database"),
      properties: z.any().optional().describe("Updated database properties schema"),
    },
    async ({ database_id, title, properties }) => {
      try {
        const body: any = {};
        if (title) {
          body.title = [
            {
              type: "text",
              text: {
                content: title,
              },
            },
          ];
        }
        if (properties) body.properties = properties;

        const response = await fetch(`https://api.notion.com/v1/databases/${database_id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to update database: ${response.status} ${errorText}`);
        }

        const database = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(database, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating database: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
} 