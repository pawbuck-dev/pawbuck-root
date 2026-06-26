#!/usr/bin/env npx tsx
/**
 * Deterministic Milo eval checks (Phase 2).
 * Validates fixture counts and @pawbuck/milo schema compatibility.
 */
import fs from "node:fs";
import path from "node:path";
import {
  MedicalRecordSchema,
  flexibleDocumentExtractionSchema,
} from "../../packages/milo-core/src/schema";

const evalRoot = path.join(__dirname);

function readJson<T>(...segments: string[]): T {
  const file = path.join(evalRoot, ...segments);
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

type DocFixture = {
  id: string;
  documentType: string;
  schemaKind?: string;
  expected: Record<string, unknown>;
};

type ChatRoot = {
  scenarios: { id: string; category: string }[];
};

type JournalRoot = {
  scenarios: { id: string; mode: string }[];
};

function main() {
  const docFixtures = readJson<DocFixture[]>("document-extraction", "fixtures.json");
  if (docFixtures.length < 15) {
    throw new Error(`Expected ≥15 document fixtures, got ${docFixtures.length}`);
  }

  for (const fixture of docFixtures) {
    const kind = fixture.schemaKind ?? "medical";
    if (kind === "flexible") {
      flexibleDocumentExtractionSchema.parse(fixture.expected);
    } else {
      MedicalRecordSchema.parse(fixture.expected);
    }
  }

  const chat = readJson<ChatRoot>("chat-safety", "scenarios.json");
  if (chat.scenarios.length < 20) {
    throw new Error(`Expected ≥20 chat safety scenarios, got ${chat.scenarios.length}`);
  }

  const journal = readJson<JournalRoot>("journal-red-flags", "scenarios.json");
  if (journal.scenarios.length < 10) {
    throw new Error(`Expected ≥10 journal red-flag scenarios, got ${journal.scenarios.length}`);
  }

  console.log(
    `Milo eval OK: ${docFixtures.length} document fixtures, ${chat.scenarios.length} chat safety, ${journal.scenarios.length} journal red-flag scenarios.`,
  );
}

main();
