/**
 * Legacy agency slugs that were live (indexed/linked) before agency names were
 * normalized in the database (scripts/normalize-agency-names.ts). HTML requests
 * for these 301 to the canonical slug so existing links and indexed URLs keep
 * working.
 */
const HHS_OIG_SLUG =
  "u-s-department-of-health-and-human-services-office-of-inspector-general";

const AGENCY_SLUG_ALIASES: Record<string, string> = {
  // HHS OIG variants
  "department-of-health-and-human-services-office-of-inspector-general": HHS_OIG_SLUG,
  "office-of-inspector-general": HHS_OIG_SLUG,
  "office-of-inspector-general-oig-department-of-health-and-human-services": HHS_OIG_SLUG,
  "office-of-inspector-general-department-of-health-and-human-services": HHS_OIG_SLUG,
  "office-of-inspector-general-u-s-department-of-health-and-human-services": HHS_OIG_SLUG,
  [`${HHS_OIG_SLUG}--2`]: HHS_OIG_SLUG,
  // CMS
  "centers-for-medicare-and-medicaid-services-center-for-program-integrity":
    "centers-for-medicare-and-medicaid-services",
  "centers-for-medicare-and-medicaid-services-center-for-program-integrity-department-of-health-and-human-services":
    "centers-for-medicare-and-medicaid-services",
  // GAO
  "united-states-government-accountability-office":
    "u-s-government-accountability-office",
  // Texas
  "state-auditor-s-office": "texas-state-auditor-s-office",
  "texas-state-auditor-s-office--2": "texas-state-auditor-s-office",
  // Massachusetts
  "office-of-the-state-auditor": "massachusetts-office-of-the-state-auditor",
  "office-of-the-state-auditor-massachusetts":
    "massachusetts-office-of-the-state-auditor",
  "office-of-the-state-auditor-commonwealth-of-massachusetts":
    "massachusetts-office-of-the-state-auditor",
  // Maryland
  "office-of-legislative-audits": "maryland-office-of-legislative-audits",
  "office-of-legislative-audits-maryland-general-assembly":
    "maryland-office-of-legislative-audits",
  "office-of-legislative-audits-department-of-legislative-services-maryland-general-assembly":
    "maryland-office-of-legislative-audits",
  // Missouri
  "missouri-office-of-the-state-auditor": "missouri-state-auditor",
  // Oregon (new canonical name slugifies to the same slug as the old Audits Division one)
  "oregon-secretary-of-state": "oregon-secretary-of-state-audits-division",
  // Ohio
  "auditor-of-state": "ohio-auditor-of-state",
  // Virginia
  "auditor-of-public-accounts": "virginia-auditor-of-public-accounts",
  // Illinois
  "office-of-the-auditor-general-illinois": "illinois-office-of-the-auditor-general",
  // Utah
  "office-of-the-legislative-auditor-general":
    "utah-office-of-the-legislative-auditor-general",
  // Tennessee
  "comptroller-of-the-treasury-division-of-state-audit":
    "tennessee-comptroller-of-the-treasury-division-of-state-audit",
  // Nevada
  "legislative-auditor-legislative-counsel-bureau": "nevada-legislative-auditor",
  // Kansas
  "office-of-medicaid-inspector-general-kansas":
    "kansas-office-of-the-medicaid-inspector-general",
  "office-of-the-kansas-attorney-general-office-of-inspector-general":
    "kansas-office-of-the-medicaid-inspector-general",
  // Rhode Island
  "rhode-island-office-of-the-auditor-general-rioag-in-collaboration-with-the-u-s-department-of-health-and-human-services-office-of-inspector-general-oig":
    "rhode-island-office-of-the-auditor-general",
};

export function resolveAgencySlugAlias(slug: string): string | undefined {
  return AGENCY_SLUG_ALIASES[slug];
}
