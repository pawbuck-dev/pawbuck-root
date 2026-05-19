import * as fs from "fs";
import * as path from "path";
import { journalTreeSchema, type JournalTree } from "./schema";

export function validateTree(data: unknown): JournalTree {
  return journalTreeSchema.parse(data);
}

export function validateTreeFile(filePath: string): JournalTree {
  const raw = fs.readFileSync(filePath, "utf8");
  return validateTree(JSON.parse(raw));
}

export function loadAllTreesFromDir(dir: string): JournalTree[] {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files.map((f) => validateTreeFile(path.join(dir, f)));
}
