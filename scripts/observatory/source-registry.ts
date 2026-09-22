import { sourceRegistrySchema, type SourceRegistry } from "./contracts.ts";
import { readJsonFile } from "./io.ts";
import { STATE_NAMES } from "../../shared/states.ts";

export async function loadSourceRegistry(filePath: string): Promise<SourceRegistry> {
  return sourceRegistrySchema.parse(await readJsonFile(filePath));
}

export function summarizeSourceCoverage(registry: SourceRegistry): {
  registeredSourceCount: number;
  registeredJurisdictions: string[];
  uncoveredStates: string[];
  federalSourceCount: number;
} {
  const registeredJurisdictions = Array.from(new Set(
    registry.sources.map((source) => source.jurisdiction),
  )).sort();
  const registered = new Set(registeredJurisdictions);
  return {
    registeredSourceCount: registry.sources.length,
    registeredJurisdictions,
    uncoveredStates: Object.values(STATE_NAMES).filter((name) => !registered.has(name)).sort(),
    federalSourceCount: registry.sources.filter((source) => source.jurisdiction === "United States").length,
  };
}
