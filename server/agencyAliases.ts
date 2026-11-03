/**
 * Legacy agency slugs that were live before agency pages adopted canonical
 * publisher keys. Targets are existing `publishers.key` values. Canonical keys
 * are intentionally omitted so a canonical request never redirects to itself.
 */
const AGENCY_SLUG_ALIASES: Record<string, string> = {
  // HHS OIG
  "u-s-department-of-health-and-human-services-office-of-inspector-general": "hhs-oig",
  "u-s-department-of-health-and-human-services-office-of-inspector-general--2": "hhs-oig",
  "u-s-department-of-health-and-human-services-office-of-inspector-general-office-of-audit-services": "hhs-oig",
  "united-states-department-of-health-and-human-services-office-of-inspector-general-office-of-audit-services": "hhs-oig",
  "department-of-health-and-human-services-office-of-inspector-general": "hhs-oig",
  "department-of-health-and-human-services-office-of-inspector-general-office-of-audit-services": "hhs-oig",
  "department-of-health-and-human-services-office-of-inspector-general-office-of-audit-services--2": "hhs-oig",
  "office-of-inspector-general": "hhs-oig",
  "office-of-inspector-general-oig-department-of-health-and-human-services": "hhs-oig",
  "office-of-inspector-general-department-of-health-and-human-services": "hhs-oig",
  "office-of-inspector-general-u-s-department-of-health-and-human-services": "hhs-oig",

  // CMS and GAO
  "centers-for-medicare-and-medicaid-services": "cms",
  "centers-for-medicare-and-medicaid-services--2": "cms",
  "centers-for-medicare-and-medicaid-services-center-for-program-integrity": "cms",
  "centers-for-medicare-and-medicaid-services-center-for-program-integrity-department-of-health-and-human-services": "cms",
  "u-s-government-accountability-office": "gao",
  "united-states-government-accountability-office": "gao",

  // State publishers and historical name variants
  "office-of-the-new-york-state-comptroller": "new-york-state-comptroller",
  "office-of-the-new-york-state-comptroller-division-of-state-government-accountability": "new-york-state-comptroller",
  "office-of-the-new-york-state-comptroller-division-of-state-government-accountability--2": "new-york-state-comptroller",
  "michigan-office-of-the-auditor-general": "michigan-auditor-general",
  "ohio-auditor-of-state": "ohio-auditor-state",
  "auditor-of-state-of-ohio": "ohio-auditor-state",
  "medicaid-contract-audit-ohio-auditor-of-state": "ohio-auditor-state",
  "auditor-of-state": "ohio-auditor-state",
  "texas-health-and-human-services-commission-office-of-inspector-general": "texas-hhsc-oig",
  "texas-health-and-human-services-office-of-inspector-general": "texas-hhsc-oig",
  "texas-health-and-human-services-office-of-inspector-general-audit-and-inspections-division": "texas-hhsc-oig",
  "texas-state-auditor-s-office": "texas-state-auditor",
  "texas-state-auditor-s-office--2": "texas-state-auditor",
  "state-auditor-s-office": "texas-state-auditor",
  "massachusetts-office-of-the-state-auditor": "massachusetts-state-auditor",
  "office-of-the-state-auditor": "massachusetts-state-auditor",
  "office-of-the-state-auditor-massachusetts": "massachusetts-state-auditor",
  "office-of-the-state-auditor-commonwealth-of-massachusetts": "massachusetts-state-auditor",
  "maryland-office-of-legislative-audits": "maryland-legislative-audits",
  "office-of-legislative-audits": "maryland-legislative-audits",
  "office-of-legislative-audits-maryland-general-assembly": "maryland-legislative-audits",
  "office-of-legislative-audits-department-of-legislative-services-maryland-general-assembly": "maryland-legislative-audits",
  "office-of-the-washington-state-auditor": "washington-state-auditor",
  "oregon-secretary-of-state": "oregon-audits-division",
  "oregon-secretary-of-state-audits-division": "oregon-audits-division",
  "oregon-secretary-of-state-audits-division--2": "oregon-audits-division",
  "illinois-office-of-the-auditor-general": "illinois-auditor-general",
  "office-of-the-auditor-general-illinois": "illinois-auditor-general",
  "sikich-cpa-llc": "illinois-auditor-general",
  "colorado-office-of-the-state-auditor": "colorado-state-auditor",
  "kansas-office-of-the-medicaid-inspector-general": "kansas-medicaid-inspector-general",
  "office-of-medicaid-inspector-general-kansas": "kansas-medicaid-inspector-general",
  "office-of-the-kansas-attorney-general-office-of-inspector-general": "kansas-medicaid-inspector-general",
  "missouri-office-of-the-state-auditor": "missouri-state-auditor",
  "nebraska-auditor-of-public-accounts": "nebraska-auditor-public-accounts",
  "north-carolina-office-of-the-state-auditor": "north-carolina-state-auditor",
  "kentucky-auditor-of-public-accounts": "kentucky-auditor-public-accounts",
  "new-jersey-office-of-the-state-auditor": "new-jersey-state-auditor",
  "north-dakota-office-of-the-state-auditor": "north-dakota-state-auditor",
  "office-of-the-legislative-auditor-minnesota": "minnesota-legislative-auditor",
  "pennsylvania-department-of-the-auditor-general": "pennsylvania-auditor-general",
  "rhode-island-office-of-the-auditor-general": "rhode-island-auditor-general",
  "rhode-island-office-of-the-auditor-general-rioag-in-collaboration-with-the-u-s-department-of-health-and-human-services-office-of-inspector-general-oig": "rhode-island-auditor-general",
  "tennessee-comptroller-of-the-treasury-division-of-state-audit": "tennessee-state-audit",
  "comptroller-of-the-treasury-division-of-state-audit": "tennessee-state-audit",
  "utah-office-of-the-legislative-auditor-general": "utah-legislative-auditor-general",
  "office-of-the-legislative-auditor-general": "utah-legislative-auditor-general",
  "virginia-auditor-of-public-accounts": "virginia-auditor-public-accounts",
  "auditor-of-public-accounts": "virginia-auditor-public-accounts",
  "legislative-auditor-legislative-counsel-bureau": "nevada-legislative-auditor",
};

export function resolveAgencySlugAlias(slug: string): string | undefined {
  return AGENCY_SLUG_ALIASES[slug];
}
