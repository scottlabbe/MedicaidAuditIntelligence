import { sourceRegistrySchema, type SourceRegistry } from "./contracts.ts";
import { readJsonFile } from "./io.ts";

export async function loadSourceRegistry(filePath: string): Promise<SourceRegistry> {
  const parsed = sourceRegistrySchema.parse(await readJsonFile(filePath));
  return {
    ...parsed,
    sources: [...parsed.sources].sort((left, right) => left.priority - right.priority),
  };
}

export interface SourceCheck {
  id: string;
  organization: string;
  url: string;
  status: number | null;
  finalUrl: string | null;
  ok: boolean;
  checkedAt: string;
  error: string | null;
}

async function checkSource(source: SourceRegistry["sources"][number]): Promise<SourceCheck> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(source.landingPage, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "MedicaidAuditIntelligence-OpportunityObservatory/1.0" },
    });
    return {
      id: source.id,
      organization: source.organization,
      url: source.landingPage,
      status: response.status,
      finalUrl: response.url,
      ok: response.ok,
      checkedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    return {
      id: source.id,
      organization: source.organization,
      url: source.landingPage,
      status: null,
      finalUrl: null,
      ok: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkSourceRegistry(registry: SourceRegistry): Promise<SourceCheck[]> {
  return Promise.all(registry.sources.map(checkSource));
}
