/**
 * One-off data cleanup: collapse variant `audit_organization` spellings into
 * one canonical name per agency so /agencies pages stop splitting into
 * near-duplicate slugs. Safe to re-run (idempotent).
 *
 * Run with: node --env-file=.env --import tsx scripts/normalize-agency-names.ts
 * Pass --dry-run to preview without writing.
 */
import { db } from "../server/database";
import { sql } from "drizzle-orm";

const HHS_OIG =
  "U.S. Department of Health and Human Services, Office of Inspector General";
const CMS = "Centers for Medicare & Medicaid Services";

// Old exact string -> canonical name. Ambiguous generic names were verified
// against each report's state / source URL before being mapped.
const AGENCY_RENAMES: Record<string, string> = {
  // HHS Office of Inspector General (6 variants)
  "Department of Health and Human Services Office of Inspector General": HHS_OIG,
  "Office of Inspector General": HHS_OIG,
  "Office of Inspector General (OIG), Department of Health and Human Services": HHS_OIG,
  "Office of Inspector General, Department of Health and Human Services": HHS_OIG,
  "Office of Inspector General, U.S. Department of Health and Human Services": HHS_OIG,
  "U.S. Department of Health and Human Services Office of Inspector General": HHS_OIG,
  // CMS (Center for Program Integrity is a CMS subunit)
  "Centers for Medicare & Medicaid Services, Center for Program Integrity": CMS,
  "Centers for Medicare & Medicaid Services, Center for Program Integrity, Department of Health and Human Services": CMS,
  // GAO
  "United States Government Accountability Office":
    "U.S. Government Accountability Office",
  // Texas (curly vs straight apostrophe; bare "State Auditor’s Office" rows are TX)
  "Texas State Auditor’s Office": "Texas State Auditor's Office",
  "State Auditor’s Office": "Texas State Auditor's Office",
  // Massachusetts (bare "Office of the State Auditor" row is MA)
  "Office of the State Auditor": "Massachusetts Office of the State Auditor",
  "Office of the State Auditor (Massachusetts)":
    "Massachusetts Office of the State Auditor",
  "Office of the State Auditor, Commonwealth of Massachusetts":
    "Massachusetts Office of the State Auditor",
  // Maryland
  "Office of Legislative Audits": "Maryland Office of Legislative Audits",
  "Office of Legislative Audits, Department of Legislative Services, Maryland General Assembly":
    "Maryland Office of Legislative Audits",
  "Office of Legislative Audits, Maryland General Assembly":
    "Maryland Office of Legislative Audits",
  // Missouri
  "Missouri Office of the State Auditor": "Missouri State Auditor",
  // Oregon
  "Oregon Secretary of State": "Oregon Secretary of State, Audits Division",
  "Oregon Secretary of State Audits Division":
    "Oregon Secretary of State, Audits Division",
  // Ohio (report #19; source URL is auditor.state.oh.us)
  "Auditor of State": "Ohio Auditor of State",
  // Virginia (report #86 is VA)
  "Auditor of Public Accounts": "Virginia Auditor of Public Accounts",
  // Illinois
  "Office of the Auditor General (Illinois)":
    "Illinois Office of the Auditor General",
  // Utah (report #125 is UT)
  "Office of the Legislative Auditor General":
    "Utah Office of the Legislative Auditor General",
  // Tennessee (report #70 is TN)
  "Comptroller of the Treasury, Division of State Audit":
    "Tennessee Comptroller of the Treasury, Division of State Audit",
  // Nevada (report #107 is NV)
  "Legislative Auditor, Legislative Counsel Bureau": "Nevada Legislative Auditor",
  // Kansas Medicaid OIG (housed in the Attorney General's office)
  "Office of Medicaid Inspector General (Kansas)":
    "Kansas Office of the Medicaid Inspector General",
  "Office of the Kansas Attorney General, Office of Inspector General":
    "Kansas Office of the Medicaid Inspector General",
  // Rhode Island (collaboration detail belongs to the report, not the agency)
  "Rhode Island Office of the Auditor General (RIOAG) in collaboration with the U.S. Department of Health and Human Services Office of Inspector General (OIG)":
    "Rhode Island Office of the Auditor General",
};

const dryRun = process.argv.includes("--dry-run");

let totalUpdated = 0;
for (const [from, to] of Object.entries(AGENCY_RENAMES)) {
  const found = await db.execute(
    sql`SELECT id FROM reports WHERE audit_organization = ${from}`,
  );
  const ids = (found.rows as any[]).map((r) => r.id);
  if (!ids.length) continue;
  console.log(`${dryRun ? "[dry-run] " : ""}"${from}" -> "${to}" (reports: ${ids.join(", ")})`);
  if (!dryRun) {
    await db.execute(
      sql`UPDATE reports SET audit_organization = ${to} WHERE audit_organization = ${from}`,
    );
  }
  totalUpdated += ids.length;
}

// Report #19 has state "US" but is an Ohio Auditor of State report.
const r19 = await db.execute(
  sql`SELECT id FROM reports WHERE id = 19 AND state = 'US'`,
);
if ((r19.rows as any[]).length) {
  console.log(`${dryRun ? "[dry-run] " : ""}Report #19: state US -> OH`);
  if (!dryRun) {
    await db.execute(sql`UPDATE reports SET state = 'OH' WHERE id = 19`);
  }
}

// Report #117 is a stuck ingestion (status "ingesting", placeholder title,
// agency "Unknown") that is publicly visible — hide it.
const r117 = await db.execute(
  sql`SELECT id FROM reports WHERE id = 117 AND status <> 'completed' AND COALESCE(hidden, false) = false`,
);
if ((r117.rows as any[]).length) {
  console.log(`${dryRun ? "[dry-run] " : ""}Report #117: hidden -> true (stuck ingestion)`);
  if (!dryRun) {
    await db.execute(sql`UPDATE reports SET hidden = true WHERE id = 117`);
  }
}

console.log(`${dryRun ? "[dry-run] " : ""}Done. ${totalUpdated} report rows renamed.`);
process.exit(0);
