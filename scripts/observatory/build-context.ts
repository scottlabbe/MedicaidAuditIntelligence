import fs from "node:fs/promises";
import path from "node:path";
import type { InputStatus } from "./contracts.ts";
import { auditSite } from "./audit-site.ts";
import { inventoryCorpus } from "./inventory-corpus.ts";
import { getArg, getBooleanArg, parseArgs, readJsonFile, toProjectPath, writeJsonFile, errorMessage } from "./io.ts";
import { checkSourceRegistry, loadSourceRegistry } from "./source-registry.ts";

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

async function readLatestGsc(gscDirectory: string): Promise<unknown> {
  const entries = await fs.readdir(gscDirectory, { withFileTypes: true });
  const candidates = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  if (!candidates.length) throw new Error("no imported GSC summary found");
  const withStats = await Promise.all(candidates.map(async (entry) => ({
    path: path.join(gscDirectory, entry.name),
    stats: await fs.stat(path.join(gscDirectory, entry.name)),
  })));
  withStats.sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);
  return readJsonFile(withStats[0].path);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const skipNetwork = getBooleanArg(args, "skip-network");
  const siteUrl = getArg(args, "site-url", process.env.SITE_URL ?? "https://www.medicaidintelligence.com")
    ?? "https://www.medicaidintelligence.com";
  const siteLimit = Number(getArg(args, "site-limit", "30"));
  if (!Number.isInteger(siteLimit) || siteLimit < 0 || siteLimit > 500) {
    throw new Error("--site-limit must be an integer between 0 and 500");
  }

  const docs = path.join(process.cwd(), "docs", "opportunity-observatory");
  const registryPath = path.join(docs, "source-registry.json");
  const gscDirectory = toProjectPath(getArg(args, "gsc-dir", ".observatory/gsc") ?? ".observatory/gsc");
  const registry = await loadSourceRegistry(registryPath);

  const [corpus, gsc, site, sources] = await Promise.all([
    capture(() => inventoryCorpus(process.cwd())),
    capture(() => readLatestGsc(gscDirectory)),
    skipNetwork
      ? Promise.resolve<Captured<unknown>>({ input: { status: "skipped", detail: "--skip-network" }, value: null })
      : capture(() => auditSite(siteUrl, siteLimit)),
    skipNetwork
      ? Promise.resolve<Captured<unknown>>({ input: { status: "skipped", detail: "--skip-network" }, value: null })
      : capture(() => checkSourceRegistry(registry)),
  ]);

  const context = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inputs: {
      corpus: corpus.input,
      gsc: gsc.input,
      liveSite: site.input,
      sourceReachability: sources.input,
    },
    corpus: corpus.value,
    gsc: gsc.value,
    liveSite: site.value,
    sourceRegistry: registry,
    sourceReachability: sources.value,
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
