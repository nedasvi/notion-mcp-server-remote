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
      filter: z.union([z.string(), z.any()]).optional().describe("Filter object for the query - can be JSON string or object"),
      sorts: z.union([z.string(), z.array(z.any())]).optional().describe("Sort objects for the query - can be JSON string or array"),
      start_cursor: z.string().optional().describe("Cursor for pagination"),
      page_size: z.number().optional().default(100).describe("Number of items to return (max 100)"),
    },
    async ({ database_id, filter, sorts, start_cursor, page_size }) => {
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

        // Parse sorts if it's a string
        let parsedSorts = sorts;
        if (typeof sorts === 'string') {
          try {
            parsedSorts = JSON.parse(sorts);
          } catch (e) {
            throw new Error(`Invalid JSON in sorts parameter: ${(e as Error).message}`);
          }
        }

        const body: any = {};
        if (parsedFilter) body.filter = parsedFilter;
        if (parsedSorts) body.sorts = parsedSorts;
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
      properties: z.union([z.string(), z.any()]).describe("Database properties schema - can be JSON string or object"),
    },
    async ({ parent_page_id, title, properties }) => {
      try {
        // Parse properties if it's a string
        let parsedProperties = properties;
        if (typeof properties === 'string') {
          try {
            parsedProperties = JSON.parse(properties);
          } catch (e) {
            throw new Error(`Invalid JSON in properties parameter: ${(e as Error).message}`);
          }
        }

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
          properties: parsedProperties,
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
      properties: z.union([z.string(), z.any()]).optional().describe("Updated database properties schema - can be JSON string or object"),
    },
    async ({ database_id, title, properties }) => {
      try {
        // Parse properties if it's a string
        let parsedProperties = properties;
        if (typeof properties === 'string') {
          try {
            parsedProperties = JSON.parse(properties);
          } catch (e) {
            throw new Error(`Invalid JSON in properties parameter: ${(e as Error).message}`);
          }
        }

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
        if (parsedProperties) body.properties = parsedProperties;

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