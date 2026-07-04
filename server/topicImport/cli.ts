import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { verifyBundleIntegrity } from "./integrity";
import { recordTopicImportPreview } from "./preview";
import {
  activateTopicTaxonomy,
  publishTopicImport,
} from "./publish";
import { validateTopicImport } from "./validation";

function option(name: string, required = true): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (required && (!value || value.startsWith("--"))) {
    throw new Error(`Missing required option --${name}`);
  }
  return value;
}

async function preview(): Promise<void> {
  const bundlePath = resolve(option("bundle")!);
  const publicKeyPath = resolve(option("public-key")!);
  const actor = option("actor")!;
  const expectedKeyId = option("key-id", false);
  const [bundleJson, publicKeyPem] = await Promise.all([
    readFile(bundlePath, "utf8"),
    readFile(publicKeyPath, "utf8"),
  ]);
  const bundle = verifyBundleIntegrity(
    JSON.parse(bundleJson),
    publicKeyPem,
    expectedKeyId,
  );
  const validation = await validateTopicImport(bundle);
  const record = await recordTopicImportPreview(bundle, validation, actor);
  console.log(
    JSON.stringify(
      {
        bundleId: bundle.bundleId,
        importRunId: record.importRunId,
        status: record.status,
        idempotent: record.idempotent,
        taxonomyStatus: validation.taxonomyStatus,
        reports: validation.reports.length,
        assignments: validation.assignmentCount,
        totals: validation.reports.reduce(
          (totals, report) => ({
            added: totals.added + report.diff.added.length,
            changed: totals.changed + report.diff.changed.length,
            removed: totals.removed + report.diff.removed.length,
          }),
          { added: 0, changed: 0, removed: 0 },
        ),
      },
      null,
      2,
    ),
  );
}

async function loadAndValidateBundle() {
  const bundlePath = resolve(option("bundle")!);
  const publicKeyPath = resolve(option("public-key")!);
  const expectedKeyId = option("key-id", false);
  const [bundleJson, publicKeyPem] = await Promise.all([
    readFile(bundlePath, "utf8"),
    readFile(publicKeyPath, "utf8"),
  ]);
  const bundle = verifyBundleIntegrity(
    JSON.parse(bundleJson),
    publicKeyPem,
    expectedKeyId,
  );
  return { bundle, validation: await validateTopicImport(bundle) };
}

async function activate(): Promise<void> {
  const version = option("version")!;
  const sha256 = option("sha256")!;
  const taxonomyId = await activateTopicTaxonomy(version, sha256);
  console.log(
    JSON.stringify({ taxonomyId, version, status: "active" }, null, 2),
  );
}

async function publish(): Promise<void> {
  const { bundle, validation } = await loadAndValidateBundle();
  const result = await publishTopicImport(bundle, validation);
  console.log(
    JSON.stringify(
      {
        bundleId: bundle.bundleId,
        importRunId: result.importRunId,
        status: result.status,
        idempotent: result.idempotent,
        reports: validation.reports.length,
        assignments: validation.assignmentCount,
      },
      null,
      2,
    ),
  );
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "preview") {
    await preview();
    return;
  }
  if (command === "activate-taxonomy") {
    await activate();
    return;
  }
  if (command === "publish") {
    await publish();
    return;
  }
  throw new Error(
    "Usage: topic:import <preview|activate-taxonomy|publish> [options]",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
