import type {
  JurisdictionRef,
  JurisdictionScopeType,
  ReportListItem,
} from "@/lib/types";

export function formatScopeType(scope: JurisdictionScopeType): string {
  switch (scope) {
    case "single_jurisdiction":
      return "Single jurisdiction";
    case "multi_jurisdiction":
      return "Multi-jurisdiction";
    case "national":
      return "National";
    default:
      return "Scope not available";
  }
}

export function formatSourceJurisdiction(report: ReportListItem): string {
  return report.sourceJurisdiction?.name || "Source authority not available";
}

export function formatSubjectJurisdictions(
  report: Pick<ReportListItem, "jurisdictionScopeType" | "subjectJurisdictions">,
  compact = true,
): string {
  if (report.jurisdictionScopeType === "national") return "National scope";

  const subjects = report.subjectJurisdictions;
  if (subjects.length === 0) return "No public subject assignment";
  if (!compact || subjects.length <= 2) {
    return subjects.map((jurisdiction) => jurisdiction.name).join(", ");
  }

  return `${subjects.length} jurisdictions · ${subjects
    .slice(0, 2)
    .map((jurisdiction) => jurisdiction.name)
    .join(", ")} + ${subjects.length - 2} more`;
}

export function jurisdictionHref(jurisdiction: JurisdictionRef): string {
  return jurisdiction.kind === "federal"
    ? "/federal"
    : `/states/${jurisdiction.slug}`;
}
