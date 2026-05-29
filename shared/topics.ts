export interface TopicEntry {
  slug: string;
  name: string;
  query: string;
  description: string;
}

export const TOPICS: TopicEntry[] = [
  {
    slug: "managed-care",
    name: "Managed Care",
    query: "managed care",
    description:
      "Medicaid audit reports involving managed care oversight, capitation payments, MCO reporting, network adequacy, and encounter data.",
  },
  {
    slug: "pharmacy-benefit-managers",
    name: "Pharmacy Benefit Managers",
    query: "pharmacy",
    description:
      "Medicaid audit reports involving pharmacy benefit managers, drug rebates, pharmacy claims, spread pricing, and pharmacy oversight.",
  },
  {
    slug: "eligibility-enrollment",
    name: "Eligibility and Enrollment",
    query: "eligibility enrollment",
    description:
      "Medicaid audit reports involving eligibility determinations, enrollment controls, residency, concurrent enrollment, and improper premiums.",
  },
  {
    slug: "program-integrity",
    name: "Program Integrity",
    query: "program integrity",
    description:
      "Medicaid audit reports involving fraud prevention, improper payments, recoveries, compliance controls, and program integrity operations.",
  },
];

export function getTopicEntryBySlug(slug?: string): TopicEntry | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}
