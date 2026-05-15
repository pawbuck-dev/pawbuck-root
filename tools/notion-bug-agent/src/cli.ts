#!/usr/bin/env node

import { buildReviewPrompt } from "./bugObservation.js";
import { createNotionBugClient } from "./notionClient.js";

type CliOptions = {
  status?: string;
  limit: number;
  onlyUnreviewed: boolean;
  pageId?: string;
  schemaOnly: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    limit: 10,
    onlyUnreviewed: true,
    schemaOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--status":
        options.status = next;
        index += 1;
        break;
      case "--limit":
        options.limit = Number(next);
        index += 1;
        break;
      case "--all":
        options.onlyUnreviewed = false;
        break;
      case "--page-id":
        options.pageId = next;
        index += 1;
        break;
      case "--schema":
        options.schemaOnly = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`PawBuck Notion bug review CLI

Usage:
  pnpm --filter @pawbuck/notion-bug-agent review [options]

Options:
  --status <value>     Filter by Notion status
  --limit <number>     Number of bugs to include (default: 10)
  --all                Include bugs that already have review notes
  --page-id <id>       Review a single bug by Notion page id
  --schema             Print the Notion database schema and exit
  --help               Show this help message

Environment:
  NOTION_API_KEY              Internal integration token
  NOTION_BUG_DATABASE_ID      Optional override for the bug database id
`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const client = createNotionBugClient();

  if (options.schemaOnly) {
    const schema = await client.getDatabaseSchema();
    console.log(JSON.stringify(schema, null, 2));
    return;
  }

  if (options.pageId) {
    const text = await client.getBugObservationText(options.pageId);
    console.log(buildReviewPrompt([await client.getBugObservation(options.pageId)]));
    console.log("\n---\n");
    console.log(text);
    return;
  }

  const bugs = await client.listBugObservations({
    status: options.status,
    limit: options.limit,
    onlyUnreviewed: options.onlyUnreviewed,
  });

  console.log(buildReviewPrompt(bugs));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`notion-bug-review failed: ${message}`);
  process.exit(1);
});
