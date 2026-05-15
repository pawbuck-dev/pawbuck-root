#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { buildReviewPrompt } from "./bugObservation.js";
import { createNotionBugClient } from "./notionClient.js";

const server = new Server(
  {
    name: "pawbuck-notion-bugs",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_bug_observations",
        description:
          "List bug observations from the PawBuck Notion bug database. Returns title, status, severity, URL, and count.",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description:
                "Optional status filter, e.g. Open, New, In progress, Done.",
            },
            limit: {
              type: "number",
              description: "Maximum number of bugs to return (default 25).",
            },
            only_unreviewed: {
              type: "boolean",
              description:
                "When true, only return bugs without engineering review notes.",
            },
          },
        },
      },
      {
        name: "get_bug_observation",
        description:
          "Fetch one bug observation by Notion page id and return formatted details for review.",
        inputSchema: {
          type: "object",
          properties: {
            page_id: {
              type: "string",
              description: "Notion page id for the bug observation.",
            },
          },
          required: ["page_id"],
        },
      },
      {
        name: "get_bug_database_schema",
        description:
          "Return the Notion database property names and types so the agent can map fields correctly.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "build_bug_review_prompt",
        description:
          "Fetch multiple bug observations and return a structured prompt for codebase review.",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "Optional status filter.",
            },
            limit: {
              type: "number",
              description: "Maximum number of bugs to include (default 10).",
            },
            only_unreviewed: {
              type: "boolean",
              description:
                "When true, only include bugs without engineering review notes.",
            },
          },
        },
      },
      {
        name: "update_bug_review",
        description:
          "Write engineering review notes back to a Notion bug observation. Only use after the user has explicitly approved the review text. Optionally update status.",
        inputSchema: {
          type: "object",
          properties: {
            page_id: {
              type: "string",
              description: "Notion page id for the bug observation.",
            },
            review_notes: {
              type: "string",
              description: "Engineering review notes to store in Notion.",
            },
            status: {
              type: "string",
              description:
                "Optional new status, e.g. Triaged, Needs info, Duplicate, Fixed.",
            },
          },
          required: ["page_id", "review_notes"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const client = createNotionBugClient();

    switch (name) {
      case "list_bug_observations": {
        const input = (args ?? {}) as {
          status?: string;
          limit?: number;
          only_unreviewed?: boolean;
        };
        const text = await client.listBugObservationsText({
          status: input.status,
          limit: input.limit,
          onlyUnreviewed: input.only_unreviewed,
        });
        return { content: [{ type: "text", text }] };
      }

      case "get_bug_observation": {
        const { page_id } = args as { page_id: string };
        const text = await client.getBugObservationText(page_id);
        return { content: [{ type: "text", text }] };
      }

      case "get_bug_database_schema": {
        const schema = await client.getDatabaseSchema();
        const text = [
          "# Notion bug database schema",
          "",
          ...Object.entries(schema).map(
            ([propertyName, propertyType]) =>
              `- ${propertyName}: ${propertyType}`
          ),
        ].join("\n");
        return { content: [{ type: "text", text }] };
      }

      case "build_bug_review_prompt": {
        const input = (args ?? {}) as {
          status?: string;
          limit?: number;
          only_unreviewed?: boolean;
        };
        const bugs = await client.listBugObservations({
          status: input.status,
          limit: input.limit ?? 10,
          onlyUnreviewed: input.only_unreviewed ?? true,
        });
        const text = buildReviewPrompt(bugs);
        return { content: [{ type: "text", text }] };
      }

      case "update_bug_review": {
        const input = args as {
          page_id: string;
          review_notes: string;
          status?: string;
        };
        const bug = await client.updateBugReview({
          pageId: input.page_id,
          reviewNotes: input.review_notes,
          status: input.status,
        });
        return {
          content: [
            {
              type: "text",
              text: `Updated review for "${bug.title}" (${bug.url}).`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PawBuck Notion Bug Agent MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
