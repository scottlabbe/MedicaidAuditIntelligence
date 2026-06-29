import { ArrowRight, ExternalLink, Mail } from "lucide-react";
import { Link } from "wouter";
import PageMeta from "@/components/seo/PageMeta";

const CASE_STUDY_URL =
  "https://scottlabbe.me/articles/medicaid-intelligence-case-study/";
const RESEARCH_AGENT_URL =
  "https://scottlabbe.me/articles/building-an-ai-research-agent/";

const CONTENT_LINK =
  "font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const sections = [
  { id: "purpose", label: "Purpose" },
  { id: "record-anatomy", label: "What a record contains" },
  { id: "method", label: "How records are produced" },
  { id: "verification", label: "Verification and corrections" },
  { id: "project", label: "Project information" },
];

const workflow = [
  {
    title: "Collect public audit reports",
    description:
      "Medicaid-related reports are gathered from state and federal oversight agencies.",
  },
  {
    title: "Extract defined fields",
    description:
      "Two OpenAI model passes extract report identity, scope, findings, recommendations, financial impacts, and other fields into a consistent schema.",
  },
  {
    title: "Structure the record",
    description:
      "Dates and field formats are standardized for retrieval. Publishing-agency names remain tied to the identity stored with the indexed source.",
  },
  {
    title: "Publish with provenance",
    description:
      "The library record exposes its report identifier and links to the original public document when a source URL is available.",
  },
];

export default function About() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageMeta
        title="About Medicaid Audit Intelligence"
        description="How Medicaid Audit Intelligence organizes public Medicaid audit reports, uses AI-assisted extraction, and supports verification against original sources."
        canonicalPath="/about"
      />

      <header className="max-w-[820px] border-b-2 border-primary pb-10">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          About the library
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl lg:text-[44px]">
          Public Medicaid audit evidence, organized for verification
        </h1>
        <p className="mt-5 max-w-[760px] font-serif text-xl leading-8 text-muted-foreground">
          Medicaid Audit Intelligence brings reports from state and federal
          oversight agencies into one searchable evidence library. It helps
          auditors, program-integrity staff, policy analysts, and the public
          find recurring issues while keeping the original source in view.
        </p>
      </header>

      <div className="mt-10 lg:grid lg:grid-cols-[210px_minmax(0,760px)] lg:gap-12">
        <nav
          aria-label="About page sections"
          className="sticky top-24 hidden self-start border-t-2 border-primary pt-4 lg:block"
        >
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            On this page
          </p>
          <ul className="mt-4 space-y-3">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block text-sm font-semibold leading-5 text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0">
          <MobileSectionIndex />

          <AboutSection id="purpose" eyebrow="Purpose" title="Start with the evidence">
            <p>
              The library centralizes Medicaid-related audit reports so users
              can search across jurisdictions, publishing agencies, topics, and
              report language. It is an evidence-finding and source-verification
              tool, not a substitute for the issuing agency’s report.
            </p>
            <p>
              Library records organize report metadata, objectives, findings,
              recommendations, financial impacts, and analytical fields when
              those elements are available. Missing information is omitted
              rather than filled with invented values.
            </p>
            <Link
              href="/reports"
              className={`${CONTENT_LINK} mt-2 inline-flex min-h-11 items-center gap-2 font-sans`}
            >
              Search the audit library
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </AboutSection>

          <section
            id="record-anatomy"
            className="scroll-mt-24 border-t-2 border-primary py-9"
            aria-labelledby="record-anatomy-title"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Record anatomy
            </p>
            <h2
              id="record-anatomy-title"
              className="mt-2 text-2xl font-semibold tracking-[-0.015em]"
            >
              What a library record contains
            </h2>
            <p className="mt-4 max-w-[680px] font-serif text-lg leading-8 text-muted-foreground">
              The interface separates source-derived evidence from explicitly
              generated analysis so users can judge each field appropriately.
            </p>

            <div className="mt-7 border-y border-border">
              <RecordField
                label="Source identity"
                treatment="Source-derived"
                description="Jurisdiction, publishing agency, publication date, report title, report identifier, and original-source status."
              />
              <RecordField
                label="Audit evidence"
                treatment="Source-derived"
                description="Objectives, scope, conclusions, findings, recommendations, and financial impacts extracted from the report when available."
              />
              <RecordField
                label="AI Scope Summary"
                treatment="AI-authored"
                description="A concise summary intended to make a report’s audit scope easier to scan."
              />
              <RecordField
                label="AI Generated Insight"
                treatment="AI-authored"
                description="An analytical summary intended to support comparison and discovery, not replace the source report."
              />
            </div>
          </section>

          <section
            id="method"
            className="scroll-mt-24 border-t-2 border-primary py-9"
            aria-labelledby="method-title"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Method
            </p>
            <h2
              id="method-title"
              className="mt-2 text-2xl font-semibold tracking-[-0.015em]"
            >
              How records are produced
            </h2>
            <p className="mt-4 max-w-[680px] font-serif text-lg leading-8 text-muted-foreground">
              The sequence below describes the current path from public report
              to searchable library record.
            </p>

            <ol className="mt-7 border-y border-border">
              {workflow.map((step, index) => (
                <li
                  key={step.title}
                  className="grid border-b border-border py-6 last:border-b-0 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-5"
                >
                  <span className="font-mono text-sm font-semibold text-primary">
                    STEP {index + 1}
                  </span>
                  <div className="mt-3 sm:mt-0">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 font-serif leading-7 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section
            id="verification"
            className="scroll-mt-24 border-t-2 border-primary py-9"
            aria-labelledby="verification-title"
          >
            <div className="border-l-4 border-primary bg-muted px-5 py-6 sm:px-6">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Verification
              </p>
              <h2
                id="verification-title"
                className="mt-2 text-2xl font-semibold tracking-[-0.015em]"
              >
                Check material claims against the original report
              </h2>
              <div className="mt-4 space-y-4 font-serif text-lg leading-8 text-muted-foreground">
                <p>
                  AI-assisted extraction can be incomplete or wrong. Use the
                  original source document when a decision depends on exact
                  wording, scope, methodology, or financial amounts.
                </p>
                <p>
                  Source links and report identifiers are presented throughout
                  the library to make that check direct. If an original source
                  link is unavailable, the interface identifies the item as a
                  library record rather than implying source access.
                </p>
              </div>
              <a
                href="mailto:contact@medicaidintelligence.com"
                className={`${CONTENT_LINK} mt-5 inline-flex min-h-11 items-center gap-2 font-sans`}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Report a data error
              </a>
            </div>
          </section>

          <AboutSection
            id="project"
            eyebrow="Project information"
            title="Built and maintained by Scott Labbe"
          >
            <p>
              Medicaid Audit Intelligence is an independent project. It does
              not represent a Medicaid agency or an oversight body.
            </p>
            <div className="mt-2 space-y-4 font-sans text-base">
              <ExternalArticleLink href={CASE_STUDY_URL}>
                Read how Medicaid Audit Intelligence was built
              </ExternalArticleLink>
              <ExternalArticleLink href={RESEARCH_AGENT_URL}>
                Read how the research reports were produced
              </ExternalArticleLink>
            </div>
          </AboutSection>
        </article>
      </div>
    </div>
  );
}

function MobileSectionIndex() {
  return (
    <details className="mb-9 border-y border-border lg:hidden">
      <summary className="min-h-12 cursor-pointer py-3 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        On this page
      </summary>
      <nav aria-label="About page sections" className="pb-5">
        <ul className="space-y-3">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block py-1 text-sm font-semibold leading-5 text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}

function AboutSection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t-2 border-primary py-9 first:border-t-0 first:pt-0"
      aria-labelledby={`${id}-title`}
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2
        id={`${id}-title`}
        className="mt-2 text-2xl font-semibold tracking-[-0.015em]"
      >
        {title}
      </h2>
      <div className="mt-4 space-y-4 font-serif text-lg leading-8 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function RecordField({
  label,
  treatment,
  description,
}: {
  label: string;
  treatment: "Source-derived" | "AI-authored";
  description: string;
}) {
  return (
    <div className="grid border-b border-border py-5 last:border-b-0 sm:grid-cols-[155px_120px_minmax(0,1fr)] sm:gap-5">
      <h3 className="font-semibold">{label}</h3>
      <p className="mt-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-primary sm:mt-0">
        {treatment}
      </p>
      <p className="mt-3 font-serif leading-7 text-muted-foreground sm:mt-0">
        {description}
      </p>
    </div>
  );
}

function ExternalArticleLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${CONTENT_LINK} flex w-fit min-h-11 items-center gap-2`}
    >
      {children}
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  );
}
