export const REPORT_SLUG_MAX_LENGTH = 120;

const RESERVED_REPORT_SLUGS = new Set([
  "featured",
  "page",
  "state-latest",
]);

const LEADING_REPORT_BOILERPLATE =
  /^(?:(?:a|an|the)\s+)?(?:(?:audit|review|assessment|evaluation|examination|inspection)\s+report|audit|review|assessment|evaluation|examination|inspection|report)\s+(?:of|on|into|regarding)\s+(?:the\s+)?/i;

export interface ReportSlugInput {
  id: number;
  title: string;
  publicationYear: number;
  state?: string | null;
  sourceUid?: string | null;
}

export interface ReportSlugProposal extends ReportSlugInput {
  baseSlug: string;
  proposedSlug: string;
  needsAttention: boolean;
  attentionReason: string;
}

export interface ReportPathInput {
  id: number;
  slug?: string | null;
}

interface SlugDraft {
  slug: string;
  wasTruncated: boolean;
  usedFallback: boolean;
}

function normalizeWords(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function trimSlug(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  const shortened = value.slice(0, maxLength + 1);
  const lastHyphen = shortened.lastIndexOf("-");
  const candidate = lastHyphen >= Math.floor(maxLength * 0.6)
    ? shortened.slice(0, lastHyphen)
    : shortened.slice(0, maxLength);

  return candidate.replace(/-+$/g, "");
}

function appendSlugSuffix(base: string, suffix: string): string {
  const normalizedSuffix = normalizeWords(suffix);
  if (!normalizedSuffix) return trimSlug(base, REPORT_SLUG_MAX_LENGTH);

  const maxBaseLength = REPORT_SLUG_MAX_LENGTH - normalizedSuffix.length - 1;
  const trimmedBase = trimSlug(base, maxBaseLength);
  return `${trimmedBase}-${normalizedSuffix}`;
}

function createSlugDraft(input: ReportSlugInput): SlugDraft {
  const withoutBoilerplate = input.title.trim().replace(LEADING_REPORT_BOILERPLATE, "");
  let base = normalizeWords(withoutBoilerplate);
  let usedFallback = false;

  if (!base) {
    base = "medicaid-audit-report";
    usedFallback = true;
  }

  if (RESERVED_REPORT_SLUGS.has(base) || /^\d+$/.test(base)) {
    base = `report-${base}`;
  }

  const year = String(input.publicationYear);
  const yearAlreadyPresent = base.split("-").includes(year);
  const withYear = yearAlreadyPresent ? base : `${base}-${year}`;
  const slug = yearAlreadyPresent
    ? trimSlug(base, REPORT_SLUG_MAX_LENGTH)
    : appendSlugSuffix(base, year);

  return {
    slug,
    wasTruncated: withYear.length > REPORT_SLUG_MAX_LENGTH,
    usedFallback,
  };
}

function stableSuffix(input: ReportSlugInput): string {
  const sourceToken = input.sourceUid?.replace(/-/g, "").slice(0, 8).toLowerCase();
  return sourceToken || `r${input.id}`;
}

export function buildReportSlugCandidates(input: ReportSlugInput): string[] {
  const draft = createSlugDraft(input).slug;
  const stateSuffix = normalizeWords(input.state || "");
  const candidates = [draft];

  if (stateSuffix && stateSuffix !== "us") {
    candidates.push(appendSlugSuffix(draft, stateSuffix));
  }
  candidates.push(appendSlugSuffix(draft, stableSuffix(input)));

  return Array.from(new Set(candidates));
}

export function reportPath(report: ReportPathInput): string {
  return `/reports/${report.slug || report.id}`;
}

/**
 * Builds deterministic, unique proposals for an existing report corpus.
 * Colliding title/year pairs receive a state code when possible, followed by
 * an opaque source UID fragment only if the collision remains.
 */
export function buildReportSlugProposals(
  inputs: ReportSlugInput[],
): ReportSlugProposal[] {
  const drafts = inputs.map((input) => ({ input, draft: createSlugDraft(input) }));
  const baseCounts = new Map<string, number>();

  for (const { draft } of drafts) {
    baseCounts.set(draft.slug, (baseCounts.get(draft.slug) || 0) + 1);
  }

  const preferred = drafts.map(({ input, draft }) => {
    const hasBaseCollision = (baseCounts.get(draft.slug) || 0) > 1;
    const stateSuffix = normalizeWords(input.state || "");
    const canUseState = stateSuffix && stateSuffix !== "us";
    const slug = hasBaseCollision && canUseState
      ? appendSlugSuffix(draft.slug, stateSuffix)
      : draft.slug;

    return { input, draft, hasBaseCollision, slug };
  });

  const preferredCounts = new Map<string, number>();
  for (const item of preferred) {
    preferredCounts.set(item.slug, (preferredCounts.get(item.slug) || 0) + 1);
  }

  const proposals = preferred.map((item) => {
    const needsStableSuffix = (preferredCounts.get(item.slug) || 0) > 1;
    const proposedSlug = needsStableSuffix
      ? appendSlugSuffix(item.slug, stableSuffix(item.input))
      : item.slug;
    const reasons: string[] = [];

    if (item.hasBaseCollision) {
      reasons.push(
        needsStableSuffix
          ? "duplicate title and year; added stable source suffix"
          : "duplicate title and year; added state suffix",
      );
    }
    if (item.draft.wasTruncated) reasons.push("slug shortened to 120 characters");
    if (item.draft.usedFallback) reasons.push("title produced no usable slug");

    return {
      ...item.input,
      baseSlug: item.draft.slug,
      proposedSlug,
      needsAttention: reasons.length > 0,
      attentionReason: reasons.join("; "),
    };
  });

  const uniqueSlugs = new Set(proposals.map((proposal) => proposal.proposedSlug));
  if (uniqueSlugs.size !== proposals.length) {
    throw new Error("Report slug proposals are not unique");
  }

  return proposals.sort((a, b) => a.id - b.id);
}

export function isValidReportSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= REPORT_SLUG_MAX_LENGTH &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !RESERVED_REPORT_SLUGS.has(slug) &&
    !/^\d+$/.test(slug)
  );
}
