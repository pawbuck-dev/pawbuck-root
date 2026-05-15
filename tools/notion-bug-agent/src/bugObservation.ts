import type {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";

export const DEFAULT_NOTION_DATABASE_ID =
  "34f5d2e4-a5ff-8076-b561-cee6ec0eb8c9";

export type BugObservation = {
  id: string;
  url: string;
  title: string;
  status: string | null;
  severity: string | null;
  area: string | null;
  reporter: string | null;
  createdAt: string | null;
  lastEditedAt: string | null;
  description: string | null;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  platform: string | null;
  reviewNotes: string | null;
  rawProperties: Record<string, string | string[] | null>;
};

type NotionPropertyValue =
  | { type: "title"; title: Array<{ plain_text: string }> }
  | { type: "rich_text"; rich_text: Array<{ plain_text: string }> }
  | { type: "select"; select: { name: string } | null }
  | { type: "multi_select"; multi_select: Array<{ name: string }> }
  | { type: "status"; status: { name: string } | null }
  | { type: "people"; people: Array<{ name?: string | null }> }
  | { type: "date"; date: { start: string } | null }
  | { type: "url"; url: string | null }
  | { type: "checkbox"; checkbox: boolean }
  | { type: string };

function isFullPage(
  page: PageObjectResponse | PartialPageObjectResponse
): page is PageObjectResponse {
  return "properties" in page && page.properties !== undefined;
}

function richText(
  blocks: Array<{ plain_text: string }> | undefined
): string | null {
  if (!blocks?.length) return null;
  const text = blocks.map((b) => b.plain_text).join("").trim();
  return text || null;
}

function extractPropertyValue(
  property: NotionPropertyValue
): string | string[] | null {
  switch (property.type) {
    case "title":
      return richText((property as { title: Array<{ plain_text: string }> }).title);
    case "rich_text":
      return richText(
        (property as { rich_text: Array<{ plain_text: string }> }).rich_text
      );
    case "select":
      return (
        (property as { select: { name: string } | null }).select?.name ?? null
      );
    case "status":
      return (
        (property as { status: { name: string } | null }).status?.name ?? null
      );
    case "multi_select":
      return (
        property as { multi_select: Array<{ name: string }> }
      ).multi_select.map((item: { name: string }) => item.name);
    case "people":
      return (property as { people: Array<{ name?: string | null }> }).people
        .map((person: { name?: string | null }) => person.name?.trim())
        .filter((name: string | null | undefined): name is string =>
          Boolean(name)
        );
    case "date":
      return (property as { date: { start: string } | null }).date?.start ?? null;
    case "url":
      return (property as { url: string | null }).url;
    case "checkbox":
      return (property as { checkbox: boolean }).checkbox ? "true" : "false";
    default:
      return null;
  }
}

function firstMatch(
  properties: Record<string, string | string[] | null>,
  candidates: string[]
): string | null {
  for (const candidate of candidates) {
    const exact = properties[candidate];
    if (typeof exact === "string" && exact.trim()) return exact.trim();

    const fuzzyKey = Object.keys(properties).find((key) =>
      candidates.some((candidateName) =>
        key.toLowerCase().includes(candidateName.toLowerCase())
      )
    );
    if (!fuzzyKey) continue;

    const value = properties[fuzzyKey];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length > 0) return value.join(", ");
  }

  return null;
}

export function pageToBugObservation(
  page: PageObjectResponse | PartialPageObjectResponse
): BugObservation {
  if (!isFullPage(page)) {
    throw new Error(`Page ${page.id} is missing properties`);
  }

  const rawProperties: Record<string, string | string[] | null> = {};
  for (const [name, property] of Object.entries(page.properties)) {
    rawProperties[name] = extractPropertyValue(
      property as NotionPropertyValue
    );
  }

  const title =
    firstMatch(rawProperties, ["Name", "Title", "Bug", "Observation"]) ??
    "Untitled bug";

  return {
    id: page.id,
    url: page.url,
    title,
    status: firstMatch(rawProperties, ["Status", "State", "Triage"]),
    severity: firstMatch(rawProperties, ["Severity", "Priority", "Impact"]),
    area: firstMatch(rawProperties, [
      "Area",
      "Component",
      "Feature",
      "Module",
      "App",
    ]),
    reporter: firstMatch(rawProperties, ["Reporter", "Submitted by", "Owner"]),
    createdAt: page.created_time,
    lastEditedAt: page.last_edited_time,
    description: firstMatch(rawProperties, [
      "Description",
      "Summary",
      "Details",
      "Observation",
    ]),
    stepsToReproduce: firstMatch(rawProperties, [
      "Steps to reproduce",
      "Steps",
      "Repro steps",
    ]),
    expectedBehavior: firstMatch(rawProperties, [
      "Expected behavior",
      "Expected",
    ]),
    actualBehavior: firstMatch(rawProperties, [
      "Actual behavior",
      "Actual",
      "What happened",
    ]),
    platform: firstMatch(rawProperties, [
      "Platform",
      "Device",
      "OS",
      "Environment",
    ]),
    reviewNotes: firstMatch(rawProperties, [
      "Review notes",
      "Engineering review",
      "Triage notes",
      "Agent review",
    ]),
    rawProperties,
  };
}

export function formatBugObservationForReview(bug: BugObservation): string {
  const lines = [
    `# ${bug.title}`,
    "",
    `- ID: ${bug.id}`,
    `- URL: ${bug.url}`,
    `- Status: ${bug.status ?? "unknown"}`,
    `- Severity: ${bug.severity ?? "unknown"}`,
    `- Area: ${bug.area ?? "unknown"}`,
    `- Reporter: ${bug.reporter ?? "unknown"}`,
    `- Created: ${bug.createdAt ?? "unknown"}`,
    `- Last edited: ${bug.lastEditedAt ?? "unknown"}`,
    `- Platform: ${bug.platform ?? "unknown"}`,
    "",
    "## Description",
    bug.description ?? "_No description provided._",
    "",
    "## Steps to reproduce",
    bug.stepsToReproduce ?? "_No repro steps provided._",
    "",
    "## Expected behavior",
    bug.expectedBehavior ?? "_Not specified._",
    "",
    "## Actual behavior",
    bug.actualBehavior ?? "_Not specified._",
    "",
    "## Existing review notes",
    bug.reviewNotes ?? "_No review notes yet._",
  ];

  const extraProperties = Object.entries(bug.rawProperties).filter(
    ([name, value]) => {
      const normalized = name.toLowerCase();
      const covered = [
        "name",
        "title",
        "status",
        "severity",
        "priority",
        "area",
        "component",
        "reporter",
        "description",
        "steps",
        "expected",
        "actual",
        "platform",
        "review",
        "triage",
      ];
      if (covered.some((token) => normalized.includes(token))) return false;
      if (value === null) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === "string" && !value.trim()) return false;
      return true;
    }
  );

  if (extraProperties.length > 0) {
    lines.push("", "## Additional fields");
    for (const [name, value] of extraProperties) {
      lines.push(
        `- ${name}: ${
          Array.isArray(value) ? value.join(", ") : String(value)
        }`
      );
    }
  }

  return lines.join("\n");
}

export function formatBugListForReview(bugs: BugObservation[]): string {
  if (bugs.length === 0) {
    return "No bug observations matched the current filters.";
  }

  const lines = [
    `# Bug observations (${bugs.length})`,
    "",
    ...bugs.map((bug, index) => {
      const status = bug.status ?? "unknown";
      const severity = bug.severity ?? "unknown";
      return `${index + 1}. [${status}] ${bug.title} (${severity}) — ${bug.url}`;
    }),
  ];

  return lines.join("\n");
}

export function buildReviewPrompt(bugs: BugObservation[]): string {
  const header = [
    "Review the following PawBuck bug observations from Notion.",
    "",
    "IMPORTANT: This is a read-only triage pass. Do NOT commit code, push changes,",
    "implement fixes, or write back to Notion unless the user explicitly approves.",
    "",
    "For each bug:",
    "1. Validate whether it still reproduces in the current codebase.",
    "2. Identify likely root cause and affected files.",
    "3. Suggest severity adjustment if the current label is wrong.",
    "4. Recommend next action: fix now, backlog, duplicate, or needs more info.",
    "5. Note any missing repro details the reporter should add.",
    "",
    "Present findings for human review. Wait for approval before fixing or recording.",
    "",
  ].join("\n");

  const body = bugs.map(formatBugObservationForReview).join("\n\n---\n\n");
  return `${header}\n${body}`;
}
