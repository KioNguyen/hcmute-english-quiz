#!/usr/bin/env node
// Sinh data/reading/index.json từ data/reading/passages/*.json
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(ROOT, "data", "reading", "passages");
const passages = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => {
  const p = JSON.parse(readFileSync(join(dir, f), "utf8"));
  return { id: p.id, title: p.title, topic: p.topic || "", questionCount: p.questions.length, notes: p.notes || [] };
});
writeFileSync(join(ROOT, "data", "reading", "index.json"), JSON.stringify({ passages }, null, 2) + "\n");
console.log(`index.json: ${passages.length} passage`);
