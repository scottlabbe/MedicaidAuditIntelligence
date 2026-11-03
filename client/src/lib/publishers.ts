type PublisherAttribution = {
  publisherKey?: string;
  publisherName?: string;
  auditOrganization?: string;
};

export const PUBLISHER_PENDING_LABEL = "Publisher pending";

export function getPublisherName(report: PublisherAttribution): string {
  return report.publisherName?.trim() || PUBLISHER_PENDING_LABEL;
}

export function getPublisherHref(
  report: PublisherAttribution,
): string | undefined {
  return report.publisherKey
    ? `/agencies/${encodeURIComponent(report.publisherKey)}`
    : undefined;
}

export function hasDistinctAuditOrganization(
  report: PublisherAttribution,
): boolean {
  const auditOrganization = report.auditOrganization?.trim();
  const publisherName = report.publisherName?.trim();
  return Boolean(
    auditOrganization &&
      publisherName &&
      auditOrganization.localeCompare(publisherName, undefined, {
        sensitivity: "base",
      }) !== 0,
  );
}
