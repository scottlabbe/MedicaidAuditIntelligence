const KEYWORD_DEFINITIONS: Record<string, string> = {
  medicaid:
    "A joint federal and state program that provides health coverage to eligible people with limited income and resources. States administer their programs within federal requirements.",
  "managed care":
    "A Medicaid delivery system in which a state contracts with managed care organizations to arrange covered services for enrolled members, generally through fixed per-member payments.",
  overpayments:
    "Payments that exceed the amount allowable under applicable law, contract, policy, or program rules. Identified overpayments may be subject to recovery.",
  "capitation payments":
    "Fixed, prospective payments made to a managed care organization for each enrolled member during a defined period, whether or not that member receives services.",
  mco:
    "Managed care organization. An entity under contract with a state Medicaid agency to arrange covered services for enrolled members in exchange for capitation payments.",
  "improper payments":
    "Payments that should not have been made, were made in an incorrect amount, or lack enough information to determine whether the payment was proper.",
  mmis:
    "Medicaid Management Information System. A state system used to process Medicaid claims and support program administration, reporting, and payment controls.",
  "program integrity":
    "The policies and operations used to prevent, detect, investigate, and recover fraud, waste, abuse, and other improper Medicaid payments.",
  paris:
    "Public Assistance Reporting Information System. A federal data-matching service that helps states identify people receiving benefits in more than one state or program.",
  oversight:
    "The monitoring, review, and enforcement work used to determine whether Medicaid programs, contractors, and payments comply with applicable requirements.",
  "medi-cal":
    "California’s Medicaid program, administered by the California Department of Health Care Services in partnership with counties and contracted health plans.",
  masshealth:
    "Massachusetts’ combined Medicaid and Children’s Health Insurance Program, administered by the state’s Executive Office of Health and Human Services.",
  "background checks":
    "Reviews of criminal history, exclusion records, or other eligibility information used to assess whether providers, workers, or owners may participate in Medicaid.",
  "concurrent enrollment":
    "Enrollment of the same person in more than one state or coverage arrangement during overlapping periods, which can result in duplicate or unnecessary payments.",
  fmap:
    "Federal Medical Assistance Percentage. The rate used to determine the federal government’s share of a state’s eligible Medicaid expenditures.",
  "cms-64":
    "The quarterly expenditure report states submit to the Centers for Medicare & Medicaid Services to report Medicaid spending and claim federal matching funds.",
  recoupment:
    "The recovery of Medicaid funds that were paid incorrectly or are otherwise owed back to a state or the federal government.",
  rebates:
    "Amounts returned after an initial payment, including manufacturer payments that reduce Medicaid’s net cost for covered prescription drugs.",
  hhsc:
    "Texas Health and Human Services Commission. The state agency responsible for administering Medicaid and other health and human services programs in Texas.",
  "medicaid managed care":
    "A Medicaid delivery arrangement in which states contract with managed care organizations to provide or coordinate covered services for enrolled members.",
  chip:
    "Children’s Health Insurance Program. A joint federal and state program that provides health coverage to eligible children in families whose incomes are too high for Medicaid.",
  documentation:
    "Records that support an eligibility decision, delivered service, claimed expenditure, payment, or other action required by Medicaid rules.",
  claims:
    "Requests for payment submitted for covered health care services, supplies, or drugs provided to Medicaid members.",
  oregon:
    "The state jurisdiction whose Medicaid program, the Oregon Health Plan, provides medical, behavioral health, and dental coverage to eligible residents.",
};

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLocaleLowerCase();
}

export function getKeywordDefinition(keyword: string): string {
  return (
    KEYWORD_DEFINITIONS[normalizeKeyword(keyword)] ??
    `${keyword} is a term used to classify related Medicaid oversight records in this library. A reviewed definition has not yet been added.`
  );
}
