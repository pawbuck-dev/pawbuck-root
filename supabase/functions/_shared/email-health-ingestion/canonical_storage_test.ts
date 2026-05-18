import {
  assertEquals,
} from "jsr:@std/assert@1";
import {
  buildCanonicalDocumentStoragePath,
  extensionFromFilename,
} from "./canonicalPaths.ts";
Deno.test("buildCanonicalDocumentStoragePath uses pet folder and document id", () => {
  const path = buildCanonicalDocumentStoragePath(
    { id: "pet-uuid", name: "Fluffy!", user_id: "user-uuid" },
    "doc-uuid",
    "report.pdf",
  );
  assertEquals(
    path,
    "user-uuid/pet_Fluffy__pet-uuid/documents/doc-uuid.pdf",
  );
});

Deno.test("extensionFromFilename falls back to bin", () => {
  assertEquals(extensionFromFilename("noext"), "bin");
  assertEquals(extensionFromFilename("a.PDF"), "pdf");
});
