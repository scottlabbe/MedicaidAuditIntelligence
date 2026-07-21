import fs from "node:fs/promises";
import path from "node:path";

export type CliArgs = Record<string, string[]>;

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const next = argv[index + 1];
    const value = inlineValue ?? (next && !next.startsWith("--") ? next : "true");
    if (inlineValue === undefined && next && !next.startsWith("--")) {
      index += 1;
    }
    args[rawKey] = [...(args[rawKey] ?? []), value];
  }

  return args;
}

export function getArg(args: CliArgs, key: string, fallback?: string): string | undefined {
  return args[key]?.at(-1) ?? fallback;
}

export function getArgs(args: CliArgs, key: string): string[] {
  return args[key] ?? [];
}

export function getBooleanArg(args: CliArgs, key: string): boolean {
  const value = getArg(args, key);
  return value === "true" || value === "1" || value === "yes";
}

export async function readJsonFile(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function toProjectPath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
