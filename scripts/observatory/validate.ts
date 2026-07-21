import path from "node:path";
import { loadSourceRegistry } from "./source-registry.ts";

async function main(): Promise<void> {
  const docs = path.join(process.cwd(), "docs", "opportunity-observatory");
  const registry = await loadSourceRegistry(path.join(docs, "source-registry.json"));
  console.log(`Source registry valid: ${registry.sources.length} sources`);
}

main().catch((error) => {
  console.error(`Observatory validation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
