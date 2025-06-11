import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../utils/upstream-utils";

/**
 * Registers page-related tools with the MCP server
 */
export function registerPageTools(server: McpServer, props: Props) {
  // Create a new page
  server.tool(
    "create_page",
    "Create a new page in Notion",
    {
      title: z.string().describe("The title of the new page"),
      parent_page_id: z.string().optional().describe("ID of the parent page (optional)"),
      content: z.string().optional().describe("Initial content for the page"),
    },
    async ({ title, parent_page_id, content }) => {
      try {
        const pageData: any = {
          parent: parent_page_id 
            ? { type: "page_id", page_id: parent_page_id }
            : { type: "workspace", workspace: true },
          properties: {
            title: {
              title: [
                {
                  type: "text",
                  text: { content: title },
                },
              ],
            },
          },
        };

        if (content) {
          pageData.children = [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: { content },
                  },
                ],
              },
            },
          ];
        }

        const response = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pageData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create page: ${response.status} ${errorText}`);
        }

        const page = await response.json();
        return {
          content: [
            {
              type: "text",
              text: `Successfully created page "${title}" with ID: ${page.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating page: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Retrieve a page
  server.tool(
    "get_page",
    "Retrieve a page from Notion",
    {
      page_id: z.string().describe("The ID of the page to retrieve"),
    },
    async ({ page_id }) => {
      try {
        const response = await fetch(`https://api.notion.com/v1/pages/${page_id}`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to retrieve page: ${response.status} ${errorText}`);
        }

        const page = await response.json();
        const title = page.properties?.title?.title?.[0]?.text?.content || "Untitled";
        
        return {
          content: [
            {
              type: "text",
              text: `Page: "${title}"\nID: ${page.id}\nCreated: ${page.created_time}\nLast edited: ${page.last_edited_time}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving page: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Update a page
  server.tool(
    "update_page",
    "Update a page's properties in Notion",
    {
      page_id: z.string().describe("The ID of the page to update"),
      title: z.string().optional().describe("New title for the page"),
    },
    async ({ page_id, title }) => {
      try {
        const updateData: any = {
          properties: {},
        };

        if (title) {
          updateData.properties.title = {
            title: [
              {
                type: "text",
                text: { content: title },
              },
            ],
          };
        }

        const response = await fetch(`https://api.notion.com/v1/pages/${page_id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to update page: ${response.status} ${errorText}`);
        }

        const page = await response.json();
        return {
          content: [
            {
              type: "text",
              text: `Successfully updated page with ID: ${page.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating page: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get page content (blocks)
  server.tool(
    "get_page_content",
    "Retrieve the content blocks of a page",
    {
      page_id: z.string().describe("The ID of the page to get content from"),
    },
    async ({ page_id }) => {
      try {
        const response = await fetch(`https://api.notion.com/v1/blocks/${page_id}/children`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to retrieve page content: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const blocks = data.results || [];
        
        let content = `Page content (${blocks.length} blocks):\n\n`;
        
        blocks.forEach((block: any, index: number) => {
          content += `${index + 1}. ${block.type.charAt(0).toUpperCase() + block.type.slice(1)}: `;
          
          // Extract text content based on block type
          if (block[block.type]?.rich_text) {
            const text = block[block.type].rich_text
              .map((rt: any) => rt.text?.content || '')
              .join('');
            content += text || '(empty)';
          } else {
            content += `(${block.type} block)`;
          }
          content += '\n';
        });

        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving page content: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Create a page (alias for compatibility with OpenAPI naming)
  server.tool(
    "create_page_post",
    "Create a new page in Notion (alternative name for OpenAPI compatibility)",
    {
      title: z.string().describe("The title of the new page"),
      parent_page_id: z.string().optional().describe("ID of the parent page (optional)"),
      parent_database_id: z.string().optional().describe("ID of the parent database (optional)"),
      properties: z.union([z.string(), z.any()]).optional().describe("Page properties (for database pages) - can be JSON string or object"),
      content: z.string().optional().describe("Initial content for the page"),
    },
    async ({ title, parent_page_id, parent_database_id, properties, content }) => {
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

        const pageData: any = {
          properties: parsedProperties || {
            title: {
              title: [
                {
                  type: "text",
                  text: { content: title },
                },
              ],
            },
          },
        };

        // Set parent
        if (parent_database_id) {
          pageData.parent = { type: "database_id", database_id: parent_database_id };
        } else if (parent_page_id) {
          pageData.parent = { type: "page_id", page_id: parent_page_id };
        } else {
          pageData.parent = { type: "workspace", workspace: true };
        }

        if (content) {
          pageData.children = [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: { content },
                  },
                ],
              },
            },
          ];
        }

        const response = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pageData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create page: ${response.status} ${errorText}`);
        }

        const page = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(page, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error creating page: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Retrieve a page (alias for OpenAPI compatibility)
  server.tool(
    "retrieve_page",
    "Retrieve a page from Notion (alternative name for OpenAPI compatibility)",
    {
      page_id: z.string().describe("The ID of the page to retrieve"),
    },
    async ({ page_id }) => {
      try {
        const response = await fetch(`https://api.notion.com/v1/pages/${page_id}`, {
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to retrieve page: ${response.status} ${errorText}`);
        }

        const page = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(page, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving page: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Update/patch a page (alias for OpenAPI compatibility)
  server.tool(
    "patch_page",
    "Update a page's properties in Notion (alternative name for OpenAPI compatibility)",
    {
      page_id: z.string().describe("The ID of the page to update"),
      properties: z.union([z.string(), z.any()]).optional().describe("Updated page properties - can be JSON string or object"),
      archived: z.boolean().optional().describe("Whether to archive the page"),
    },
    async ({ page_id, properties, archived }) => {
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

        const updateData: any = {};
        if (parsedProperties) updateData.properties = parsedProperties;
        if (archived !== undefined) updateData.archived = archived;

        const response = await fetch(`https://api.notion.com/v1/pages/${page_id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${props.accessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to update page: ${response.status} ${errorText}`);
        }

        const page = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(page, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error updating page: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
} 