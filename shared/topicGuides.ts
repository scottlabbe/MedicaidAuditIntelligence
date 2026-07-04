export interface TopicGuideContent {
  definition: string;
  whyAuditorsCare: string;
}

const TOPIC_GUIDES: Record<string, TopicGuideContent> = {
  "managed-care": {
    definition:
      "Medicaid managed care delivers benefits through contracted health plans that receive payments to coordinate and cover enrollee services. Audit work examines how agencies set expectations, monitor plan performance, validate reported data, and protect access to care.",
    whyAuditorsCare:
      "Managed care places substantial public spending and day-to-day service decisions with outside plans and their contractors. Weak contract monitoring, incomplete encounter data, or inaccurate financial reporting can conceal improper payments and make it difficult to determine whether enrollees received required care.",
  },
  "eligibility-enrollment": {
    definition:
      "Eligibility and enrollment controls determine who qualifies for Medicaid, when coverage begins or ends, and whether beneficiary records remain accurate. Audits test determinations, renewals, residency, duplicate enrollment, and the timely processing of case changes.",
    whyAuditorsCare:
      "Eligibility errors can produce payments for people who no longer qualify, interrupt coverage for eligible beneficiaries, or allow the same person to be enrolled in more than one jurisdiction. Reliable case data and timely action are also prerequisites for accurate federal reimbursement.",
  },
  "capitation-payments": {
    definition:
      "Capitation payments are recurring amounts paid to managed care plans for each enrolled beneficiary. Audits examine rate inputs, enrollment records, duplicate or incorrect payments, reconciliations, and the recovery of amounts that should not have been paid.",
    whyAuditorsCare:
      "Because capitation is generally paid before individual services are delivered, errors can continue each month until enrollment or rate records are corrected. Even a narrow control weakness can therefore create repeated payments across a large beneficiary population.",
  },
  "pharmacy-benefit-managers": {
    definition:
      "Pharmacy benefit managers administer prescription-drug benefits on behalf of Medicaid agencies and managed care plans. Audit work considers contracting, pricing practices, claims administration, transparency, and oversight of pharmacy vendors.",
    whyAuditorsCare:
      "Complex payment flows between agencies, health plans, benefit managers, and pharmacies can make the final cost of a prescription difficult to trace. Auditors examine whether contract terms protect Medicaid funds and whether reported pharmacy expenses reflect the amounts actually paid.",
  },
  "data-quality-reporting": {
    definition:
      "Data quality and reporting covers the completeness, accuracy, and timeliness of information used to administer and oversee Medicaid. Audits assess encounter records, federal submissions, financial reports, coding, reconciliations, and the controls that produce them.",
    whyAuditorsCare:
      "Oversight decisions are only as reliable as the underlying data. Missing or inconsistent records can distort payment calculations, weaken program-integrity reviews, prevent comparisons across plans or states, and limit the ability to identify beneficiaries at risk.",
  },
  "program-oversight": {
    definition:
      "Program oversight is the system of governance, internal controls, contractor monitoring, audit follow-up, corrective action, and enforcement used to administer Medicaid. Audits evaluate whether agencies identify problems and ensure that responsible parties correct them.",
    whyAuditorsCare:
      "A finding has limited value if an agency cannot track corrective action or enforce its requirements. Oversight audits test whether responsibilities are clear, monitoring is sustained, known deficiencies are resolved, and public funds remain protected after problems are identified.",
  },
  rebates: {
    definition:
      "Medicaid drug rebates reduce prescription-drug costs through amounts owed by manufacturers under federal and supplemental agreements. Audits examine invoicing, collection, dispute resolution, reconciliation, and the accuracy of utilization data used to calculate rebates.",
    whyAuditorsCare:
      "Missed, delayed, or incorrectly calculated rebates increase the net cost of Medicaid pharmacy benefits. Effective controls must connect claims data, manufacturer invoices, collections, and unresolved disputes so that every amount owed can be identified and recovered.",
  },
};

export function getTopicGuideContent(
  slug: string,
): TopicGuideContent | undefined {
  return TOPIC_GUIDES[slug];
}
