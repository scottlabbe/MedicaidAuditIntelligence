import path from "node:path";
import type { InputStatus } from "./contracts.ts";
import { auditSite } from "./audit-site.ts";
import { inventoryCorpus, inventoryOperations } from "./inventory-corpus.ts";
import { getArg, getBooleanArg, parseArgs, toProjectPath, writeJsonFile, errorMessage } from "./io.ts";
import { loadSourceRegistry, summarizeSourceCoverage } from "./source-registry.ts";

interface Captured<T> {
  input: InputStatus;
  value: T | null;
}

async function capture<T>(operation: () => Promise<T>): Promise<Captured<T>> {
  try {
    return { input: { status: "available" }, value: await operation() };
  } catch (error) {
    return { input: { status: "unavailable", detail: errorMessage(error) }, value: null };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const skipNetwork = getBooleanArg(args, "skip-network");
  const siteUrl = getArg(args, "site-url", process.env.SITE_URL ?? "https://www.medicaidintelligence.com")
    ?? "https://www.medicaidintelligence.com";
  const siteLimit = Number(getArg(args, "site-limit", "15"));
  if (!Number.isInteger(siteLimit) || siteLimit < 0) {
    throw new Error("--site-limit must be a non-negative integer");
  }

  const docs = path.join(process.cwd(), "docs", "opportunity-observatory");
  const registryPath = path.join(docs, "source-registry.json");
  const registry = await loadSourceRegistry(registryPath);

  const [corpus, operations, site] = await Promise.all([
    capture(() => inventoryCorpus(process.cwd())),
    capture(() => inventoryOperations()),
    skipNetwork
      ? Promise.resolve<Captured<unknown>>({ input: { status: "skipped", detail: "--skip-network" }, value: null })
      : capture(() => auditSite(siteUrl, siteLimit)),
  ]);

  const context = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inputs: {
      corpus: corpus.input,
      operations: operations.input,
      liveSite: site.input,
    },
    corpus: corpus.value,
    operations: operations.value,
    liveSite: site.value,
    sourceRegistry: registry,
    sourceCoverage: summarizeSourceCoverage(registry),
  };

  const output = toProjectPath(getArg(args, "output", ".observatory/context.json") ?? ".observatory/context.json");
  await writeJsonFile(output, context);
  const unavailable = Object.entries(context.inputs)
    .filter(([, input]) => input.status === "unavailable")
    .map(([name]) => name);
  console.log(`Wrote observatory context to ${path.relative(process.cwd(), output)}`);
  if (unavailable.length) {
    console.log(`Unavailable optional inputs: ${unavailable.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(`Context build failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
