import path from "node:path";
import { buildGscSummary } from "./gsc.ts";
import { getArg, getArgs, parseArgs, toProjectPath, writeJsonFile } from "./io.ts";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputs = getArgs(args, "input").map(toProjectPath);
  const summary = await buildGscSummary(inputs);
  const defaultOutput = path.join(".observatory", "gsc", "latest.json");
  const output = toProjectPath(getArg(args, "output", defaultOutput) ?? defaultOutput);
  await writeJsonFile(output, summary);
  console.log(`Imported ${summary.rowCount} GSC rows into ${path.relative(process.cwd(), output)}`);
}

main().catch((error) => {
  console.error(`GSC import failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
