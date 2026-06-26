import fs from "node:fs";
import path from "node:path";
import {
  MedicalRecordSchema,
  flexibleDocumentExtractionSchema,
} from "./schema";

const evalRoot = path.join(__dirname, "..", "..", "..", "eval", "milo");

function readJson<T>(...segments: string[]): T {
  const file = path.join(evalRoot, ...segments);
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

describe("Milo eval fixtures (eval/milo)", () => {
  it("loads document extraction golden fixtures with valid schemas", () => {
    const fixtures = readJson<
      {
        id: string;
        schemaKind?: string;
        expected: Record<string, unknown>;
      }[]
    >("document-extraction", "fixtures.json");

    expect(fixtures.length).toBeGreaterThanOrEqual(15);
    for (const fixture of fixtures) {
      const kind = fixture.schemaKind ?? "medical";
      if (kind === "flexible") {
        expect(() => flexibleDocumentExtractionSchema.parse(fixture.expected)).not.toThrow();
      } else {
        expect(() => MedicalRecordSchema.parse(fixture.expected)).not.toThrow();
      }
    }
  });

  it("meets chat safety and journal scenario minimum counts", () => {
    const chat = readJson<{ scenarios: unknown[] }>("chat-safety", "scenarios.json");
    const journal = readJson<{ scenarios: unknown[] }>("journal-red-flags", "scenarios.json");
    expect(chat.scenarios.length).toBeGreaterThanOrEqual(20);
    expect(journal.scenarios.length).toBeGreaterThanOrEqual(10);
  });
});
