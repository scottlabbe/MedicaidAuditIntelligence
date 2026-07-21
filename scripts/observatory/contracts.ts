import { z } from "zod";

export const sourceRegistryEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  organization: z.string().min(1),
  jurisdiction: z.string().min(1),
  landingPage: z.string().url().refine((value) => value.startsWith("https://"), {
    message: "landingPage must use HTTPS",
  }),
  sourceType: z.enum(["report-index", "filtered-report-index", "search-index", "feed", "sitemap"]),
  priority: z.number().int().positive(),
  reportIdPattern: z.string().min(1),
  knownAccessLimitations: z.string(),
  lastHumanVerificationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  includeTerms: z.array(z.string().min(1)).min(1),
});

export const sourceRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(sourceRegistryEntrySchema).min(1).max(50),
}).superRefine((registry, context) => {
  const ids = new Set<string>();
  const priorities = new Set<number>();

  registry.sources.forEach((source, index) => {
    if (ids.has(source.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sources", index, "id"],
        message: `duplicate source id ${source.id}`,
      });
    }
    if (priorities.has(source.priority)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sources", index, "priority"],
        message: `duplicate priority ${source.priority}`,
      });
    }
    ids.add(source.id);
    priorities.add(source.priority);

    try {
      new RegExp(source.reportIdPattern, "i");
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sources", index, "reportIdPattern"],
        message: "invalid regular expression",
      });
    }
  });
});

export type SourceRegistry = z.infer<typeof sourceRegistrySchema>;
export type SourceRegistryEntry = z.infer<typeof sourceRegistryEntrySchema>;

export interface InputStatus {
  status: "available" | "unavailable" | "skipped";
  detail?: string;
}
