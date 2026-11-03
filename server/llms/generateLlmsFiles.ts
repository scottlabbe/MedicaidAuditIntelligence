import { buildAgentFiles } from "./agentFiles";

async function main(): Promise<void> {
  const files = await buildAgentFiles();
  const auditEntries = files.full.match(/stable_id: audit-report-/g)?.length || 0;
  const researchEntries = files.full.match(/stable_id: research-/g)?.length || 0;
  const invalidSourceLines = files.full
    .split("\n")
    .filter(
      (line) =>
        line.startsWith("- original_source_url:") &&
        !/^- original_source_url: https?:\/\//i.test(line),
    );

  if (auditEntries !== files.reportCount) {
    throw new Error(
      `Expected ${files.reportCount} audit entries; found ${auditEntries}`,
    );
  }
  if (researchEntries !== files.researchCount) {
    throw new Error(
      `Expected ${files.researchCount} research entries; found ${researchEntries}`,
    );
  }
  if (invalidSourceLines.length || /Manual Upload/i.test(files.full)) {
    throw new Error("Agent catalog contains a non-public source value");
  }
  console.log(
    `Agent catalogs validated: ${files.reportCount} audit reports and ${files.researchCount} research reports.`,
  );
}

main().catch((error) => {
  console.error("Agent catalog validation failed:", error);
  process.exitCode = 1;
});
