import { z } from "zod";
import path from "node:path";
import { getBooleanArg, parseArgs } from "./io.ts";
import { loadSourceRegistry } from "./source-registry.ts";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const httpsUrlSchema = z.string().url().refine((value) => value.startsWith("https://"), {
  message: "URL must use HTTPS",
});

export const observatoryCandidateSchema = z.object({
  reportKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  publisher: z.string().trim().min(1),
  title: z.string().trim().min(1),
  reportNumber: z.string().trim().min(1).nullable().default(null),
  publicationDate: dateSchema,
  landingUrl: httpsUrlSchema,
  pdfUrl: httpsUrlSchema.nullable().default(null),
  jurisdiction: z.string().trim().min(1),
  auditPeriod: z.string().trim().min(1).nullable().default(null),
  accessedAt: dateSchema,
  discoverySourceIds: z.array(z.string().trim().min(1)).min(1),
  medicaidRelevance: z.string().trim().min(1),
  suggestedUse: z.enum(["add-report", "update-existing-page", "cross-report-synthesis", "monitor-only"]),
  relatedReportIds: z.array(z.number().int().positive()).default([]),
  possibleDuplicateIds: z.array(z.number().int().positive()).default([]),
  uncertainty: z.string().trim().default(""),
});

export const observatoryQueueInputSchema = z.object({
  schemaVersion: z.literal(1),
  run: z.object({
    runId: z.string().regex(/^\d{4}-w\d{2}$/),
    generatedAt: z.string().datetime({ offset: true }),
    windowStart: dateSchema,
    windowEnd: dateSchema,
    rotatingSiteFamily: z.enum(["reports", "topics", "states", "agencies", "research"]),
    sourcesAttempted: z.array(z.string().trim().min(1)),
    sourcesSucceeded: z.array(z.string().trim().min(1)),
    sourceFailures: z.array(z.object({
      sourceId: z.string().trim().min(1),
      detail: z.string().trim().min(1),
    })),
    coverageComplete: z.boolean(),
  }),
  candidates: z.array(observatoryCandidateSchema),
}).superRefine((value, context) => {
  if (value.run.windowStart > value.run.windowEnd) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["run", "windowStart"],
      message: "windowStart must not be after windowEnd",
    });
  }

  const attempted = new Set(value.run.sourcesAttempted);
  const accountedFor = new Set([
    ...value.run.sourcesSucceeded,
    ...value.run.sourceFailures.map((failure) => failure.sourceId),
  ]);
  for (const sourceId of Array.from(accountedFor)) {
    if (!attempted.has(sourceId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["run", "sourcesAttempted"],
        message: `source ${sourceId} has an outcome but was not attempted`,
      });
    }
  }
  for (const sourceId of Array.from(attempted)) {
    if (!accountedFor.has(sourceId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["run", "sourcesAttempted"],
        message: `source ${sourceId} is missing a success or failure outcome`,
      });
    }
  }
  if (value.run.coverageComplete && value.run.sourceFailures.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["run", "coverageComplete"],
      message: "coverageComplete cannot be true when source failures are present",
    });
  }

  const reportKeys = new Set<string>();
  value.candidates.forEach((candidate, index) => {
    if (reportKeys.has(candidate.reportKey)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidates", index, "reportKey"],
        message: `duplicate reportKey ${candidate.reportKey}`,
      });
    }
    reportKeys.add(candidate.reportKey);
  });
});

export type ObservatoryCandidate = z.infer<typeof observatoryCandidateSchema>;
export type ObservatoryQueueInput = z.infer<typeof observatoryQueueInputSchema>;

export function assertRegisteredSourceCoverage(
  input: ObservatoryQueueInput,
  registeredSourceIds: string[],
): void {
  const attempted = new Set(input.run.sourcesAttempted);
  const missing = registeredSourceIds.filter((sourceId) => !attempted.has(sourceId));
  if (missing.length) {
    throw new Error(`run manifest is missing registered sources: ${missing.join(", ")}`);
  }
}

interface ExistingReportRow {
  id: number;
  source_url: string | null;
}

interface ExistingQueueRow {
  id: number;
  url: string;
  status: string | null;
  report_id: number | null;
  observatory_metadata: unknown;
}

export interface CandidateQueueResult {
  reportKey: string;
  outcome: "already-in-corpus" | "already-in-queue" | "queued";
  queueId: number | null;
  queueStatus: string | null;
  reportId: number | null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeIdentity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normalizeCandidateUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  for (const parameter of Array.from(url.searchParams.keys())) {
    if (/^(utm_|fbclid$|gclid$)/i.test(parameter)) {
      url.searchParams.delete(parameter);
    }
  }
  url.searchParams.sort();
  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.toString();
}

function candidateUrls(candidate: ObservatoryCandidate): string[] {
  return Array.from(new Set(
    [candidate.landingUrl, candidate.pdfUrl]
      .filter((value): value is string => Boolean(value))
      .map(normalizeCandidateUrl),
  ));
}

function queueObservatoryMetadata(row: ExistingQueueRow): Record<string, unknown> {
  return objectValue(row.observatory_metadata);
}

function queueIdentityKey(publisher: unknown, reportNumber: unknown): string | null {
  if (typeof publisher !== "string" || typeof reportNumber !== "string") return null;
  return `${normalizeIdentity(publisher)}:${normalizeIdentity(reportNumber)}`;
}

function candidateIdentityKey(candidate: ObservatoryCandidate): string | null {
  return candidate.reportNumber
    ? queueIdentityKey(candidate.publisher, candidate.reportNumber)
    : null;
}

function buildObservatoryMetadata(
  candidate: ObservatoryCandidate,
  run: ObservatoryQueueInput["run"],
  existing: ExistingQueueRow | null,
): Record<string, unknown> {
  const existingObservatory = existing ? queueObservatoryMetadata(existing) : {};
  const discoveryRunIds = Array.from(new Set([
    ...stringArray(existingObservatory.discovery_run_ids),
    run.runId,
  ])).sort();

  return {
    ...existingObservatory,
    report_key: candidate.reportKey,
    publisher: candidate.publisher,
    report_number: candidate.reportNumber,
    publication_date: candidate.publicationDate,
    landing_url: normalizeCandidateUrl(candidate.landingUrl),
    pdf_url: candidate.pdfUrl ? normalizeCandidateUrl(candidate.pdfUrl) : null,
    jurisdiction: candidate.jurisdiction,
    audit_period: candidate.auditPeriod,
    accessed_at: candidate.accessedAt,
    first_seen_at: existingObservatory.first_seen_at ?? run.generatedAt,
    last_seen_at: run.generatedAt,
    last_verified_at: run.generatedAt,
    discovery_run_ids: discoveryRunIds,
    discovery_source_ids: Array.from(new Set(candidate.discoverySourceIds)).sort(),
    medicaid_relevance: candidate.medicaidRelevance,
    suggested_use: candidate.suggestedUse,
    related_report_ids: Array.from(new Set(candidate.relatedReportIds)).sort((a, b) => a - b),
    possible_duplicate_ids: Array.from(new Set(candidate.possibleDuplicateIds)).sort((a, b) => a - b),
    uncertainty: candidate.uncertainty,
  };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function queueCandidates(
  input: ObservatoryQueueInput,
  apply: boolean,
): Promise<CandidateQueueResult[]> {
  if (apply) {
    const registry = await loadSourceRegistry(path.join(
      process.cwd(),
      "docs",
      "opportunity-observatory",
      "source-registry.json",
    ));
    assertRegisteredSourceCoverage(input, registry.sources.map((source) => source.id));
  }
  const { sqlClient } = await import("../../server/database.ts");
  const [reportRows, queueRows] = await Promise.all([
    sqlClient`SELECT id, original_report_source_url AS source_url FROM reports`,
    sqlClient`
      SELECT id, url, status, report_id,
             document_metadata -> 'observatory' AS observatory_metadata
      FROM scraping_queue
    `,
  ]) as [ExistingReportRow[], ExistingQueueRow[]];

  const reportsByUrl = new Map<string, ExistingReportRow>();
  for (const report of reportRows) {
    if (!report.source_url) continue;
    try {
      reportsByUrl.set(normalizeCandidateUrl(report.source_url), report);
    } catch {
      // Preserve malformed legacy URLs in the corpus while excluding them from URL matching.
    }
  }

  const queueByUrl = new Map<string, ExistingQueueRow>();
  const queueByReportKey = new Map<string, ExistingQueueRow>();
  const queueByPublisherNumber = new Map<string, ExistingQueueRow>();
  for (const row of queueRows) {
    try {
      queueByUrl.set(normalizeCandidateUrl(row.url), row);
    } catch {
      // Preserve malformed legacy URLs in the queue while excluding them from URL matching.
    }
    const metadata = queueObservatoryMetadata(row);
    if (typeof metadata.report_key === "string") {
      queueByReportKey.set(metadata.report_key, row);
    }
    const identityKey = queueIdentityKey(metadata.publisher, metadata.report_number);
    if (identityKey) queueByPublisherNumber.set(identityKey, row);
  }

  const results: CandidateQueueResult[] = [];
  for (const candidate of input.candidates) {
    const urls = candidateUrls(candidate);
    const existingReport = urls.map((url) => reportsByUrl.get(url)).find(Boolean) ?? null;
    if (existingReport) {
      results.push({
        reportKey: candidate.reportKey,
        outcome: "already-in-corpus",
        queueId: null,
        queueStatus: null,
        reportId: existingReport.id,
      });
      continue;
    }

    const identityKey = candidateIdentityKey(candidate);
    const existingQueue = urls.map((url) => queueByUrl.get(url)).find(Boolean)
      ?? queueByReportKey.get(candidate.reportKey)
      ?? (identityKey ? queueByPublisherNumber.get(identityKey) : undefined)
      ?? null;
    const observatoryMetadata = buildObservatoryMetadata(candidate, input.run, existingQueue);

    if (existingQueue) {
      if (apply) {
        await sqlClient`
          UPDATE scraping_queue
          SET document_metadata = jsonb_set(
            COALESCE(document_metadata, '{}'::jsonb),
            '{observatory}',
            ${JSON.stringify(observatoryMetadata)}::jsonb,
            true
          )
          WHERE id = ${existingQueue.id}
        `;
      }
      results.push({
        reportKey: candidate.reportKey,
        outcome: "already-in-queue",
        queueId: existingQueue.id,
        queueStatus: existingQueue.status,
        reportId: existingQueue.report_id,
      });
      continue;
    }

    let queueId: number | null = null;
    if (apply) {
      const url = normalizeCandidateUrl(candidate.landingUrl);
      const inserted = await sqlClient`
        INSERT INTO scraping_queue (
          url,
          title,
          source_domain,
          document_metadata,
          ai_classification,
          status,
          retry_count,
          created_at,
          user_override
        ) VALUES (
          ${url},
          ${candidate.title},
          ${new URL(url).hostname},
          ${JSON.stringify({ observatory: observatoryMetadata })}::jsonb,
          ${JSON.stringify({
            is_medicaid_audit: true,
            source: "opportunity-observatory",
            classification: "qualified-primary-source",
          })}::jsonb,
          'pending_review',
          0,
          NOW(),
          false
        )
        ON CONFLICT (url) DO NOTHING
        RETURNING id
      ` as Array<{ id: number }>;
      queueId = inserted[0]?.id ?? null;
    }
    results.push({
      reportKey: candidate.reportKey,
      outcome: "queued",
      queueId,
      queueStatus: "pending_review",
      reportId: null,
    });
  }

  if (apply) {
    const outcomeCounts = results.reduce<Record<string, number>>((counts, result) => {
      counts[result.outcome] = (counts[result.outcome] ?? 0) + 1;
      return counts;
    }, {});
    const manifest = {
      source: "opportunity-observatory",
      schema_version: input.schemaVersion,
      ...input.run,
      candidate_count: input.candidates.length,
      outcome_counts: outcomeCounts,
    };
    await sqlClient`
      INSERT INTO search_history (search_params, results_count, created_at)
      VALUES (${JSON.stringify(manifest)}::jsonb, ${input.candidates.length}, NOW())
    `;
  }

  return results;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const apply = getBooleanArg(args, "apply");
  const raw = (await readStdin()).trim();
  if (!raw) throw new Error("expected one Observatory queue payload on stdin");
  const input = observatoryQueueInputSchema.parse(JSON.parse(raw));
  const results = await queueCandidates(input, apply);
  const outcomeCounts = results.reduce<Record<string, number>>((counts, result) => {
    counts[result.outcome] = (counts[result.outcome] ?? 0) + 1;
    return counts;
  }, {});
  process.stdout.write(`${JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    runId: input.run.runId,
    coverageComplete: input.run.coverageComplete,
    candidateCount: input.candidates.length,
    outcomeCounts,
    results,
  }, null, 2)}\n`);
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(`Candidate queue failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
