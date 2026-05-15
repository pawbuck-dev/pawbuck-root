import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";
import {
  DEFAULT_NOTION_DATABASE_ID,
  type BugObservation,
  formatBugListForReview,
  formatBugObservationForReview,
  pageToBugObservation,
} from "./bugObservation.js";

export type ListBugOptions = {
  status?: string;
  limit?: number;
  onlyUnreviewed?: boolean;
};

export type UpdateBugReviewInput = {
  pageId: string;
  reviewNotes: string;
  status?: string;
};

function normalizeDatabaseId(databaseId: string): string {
  const compact = databaseId.replace(/-/g, "");
  if (compact.length !== 32) {
    throw new Error(
      `Invalid Notion database id "${databaseId}". Expected a 32-character id.`
    );
  }

  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join("-");
}

function statusFilter(status: string) {
  return {
    or: [
      {
        property: "Status",
        status: { equals: status },
      },
      {
        property: "Status",
        select: { equals: status },
      },
    ],
  };
}

function reviewNotesEmptyFilter() {
  return {
    or: [
      {
        property: "Review notes",
        rich_text: { is_empty: true },
      },
      {
        property: "Engineering review",
        rich_text: { is_empty: true },
      },
      {
        property: "Agent review",
        rich_text: { is_empty: true },
      },
    ],
  };
}

export class NotionBugClient {
  private readonly notion: Client;
  private readonly databaseId: string;
  private schemaCache: Record<string, string> | null = null;

  constructor(options?: { apiKey?: string; databaseId?: string }) {
    const apiKey = options?.apiKey ?? process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error(
        "NOTION_API_KEY is required. Create an internal integration at https://www.notion.so/my-integrations and share the bug database with it."
      );
    }

    const databaseId =
      options?.databaseId ??
      process.env.NOTION_BUG_DATABASE_ID ??
      DEFAULT_NOTION_DATABASE_ID;

    this.notion = new Client({ auth: apiKey });
    this.databaseId = normalizeDatabaseId(databaseId);
  }

  async getDatabaseSchema(): Promise<Record<string, string>> {
    if (this.schemaCache) return this.schemaCache;

    const database = await this.notion.databases.retrieve({
      database_id: this.databaseId,
    });

    const schema: Record<string, string> = {};
    for (const [name, property] of Object.entries(database.properties)) {
      schema[name] = property.type;
    }

    this.schemaCache = schema;
    return schema;
  }

  async listBugObservations(
    options: ListBugOptions = {}
  ): Promise<BugObservation[]> {
    const filters: Array<Record<string, unknown>> = [];

    if (options.status) {
      filters.push(statusFilter(options.status));
    }

    if (options.onlyUnreviewed) {
      filters.push(reviewNotesEmptyFilter());
    }

    const response = await this.notion.databases.query({
      database_id: this.databaseId,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
      page_size: Math.min(options.limit ?? 25, 100),
      filter:
        filters.length === 0
          ? undefined
          : filters.length === 1
            ? (filters[0] as never)
            : ({ and: filters } as never),
    });

    return response.results
      .filter(
        (
          page
        ): page is PageObjectResponse | PartialPageObjectResponse =>
          page.object === "page"
      )
      .map(pageToBugObservation);
  }

  async getBugObservation(pageId: string): Promise<BugObservation> {
    const page = await this.notion.pages.retrieve({ page_id: pageId });
    if (page.object !== "page") {
      throw new Error(`Notion page ${pageId} is not a page object`);
    }
    return pageToBugObservation(page);
  }

  async updateBugReview(input: UpdateBugReviewInput): Promise<BugObservation> {
    const schema = await this.getDatabaseSchema();
    const reviewPropertyName =
      Object.keys(schema).find((name) =>
        ["review notes", "engineering review", "agent review", "triage notes"].some(
          (candidate) => name.toLowerCase().includes(candidate)
        )
      ) ?? "Review notes";

    const properties: Record<string, unknown> = {
      [reviewPropertyName]: {
        rich_text: [{ type: "text", text: { content: input.reviewNotes } }],
      },
    };

    if (input.status) {
      const statusPropertyName =
        Object.keys(schema).find((name) =>
          ["status", "state", "triage"].some((candidate) =>
            name.toLowerCase().includes(candidate)
          )
        ) ?? "Status";

      const statusType = schema[statusPropertyName];
      if (statusType === "status") {
        properties[statusPropertyName] = { status: { name: input.status } };
      } else if (statusType === "select") {
        properties[statusPropertyName] = { select: { name: input.status } };
      }
    }

    const page = await this.notion.pages.update({
      page_id: input.pageId,
      properties: properties as never,
    });

    if (page.object !== "page") {
      throw new Error(`Updated object ${input.pageId} is not a page`);
    }

    return pageToBugObservation(page);
  }

  async listBugObservationsText(options: ListBugOptions = {}): Promise<string> {
    const bugs = await this.listBugObservations(options);
    return formatBugListForReview(bugs);
  }

  async getBugObservationText(pageId: string): Promise<string> {
    const bug = await this.getBugObservation(pageId);
    return formatBugObservationForReview(bug);
  }
}

export function createNotionBugClient(): NotionBugClient {
  return new NotionBugClient();
}
