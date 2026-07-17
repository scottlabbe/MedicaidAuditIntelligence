import { Link as LinkIcon } from "lucide-react";
import type {
  ResearchReportSection as ResearchReportSectionType,
  ResearchReportSource,
} from "@/lib/types";

interface ResearchSectionProps {
  section: ResearchReportSectionType;
  sourcesById: Map<number, ResearchReportSource>;
  depth?: number;
}

export default function ResearchSection({
  section,
  sourcesById,
  depth = 0,
}: ResearchSectionProps) {
  const HeadingTag = depth === 0 ? "h2" : depth === 1 ? "h3" : "h4";
  const citations = getSectionCitations(section.contentHtml, sourcesById);

  return (
    <section
      id={section.id}
      className={`scroll-mt-24 ${
        depth === 0
          ? "border-t-2 border-primary pt-7 first:border-t-0 first:pt-0"
          : "border-t border-border pt-6"
      }`}
    >
      <div className="xl:grid xl:grid-cols-[minmax(0,680px)_minmax(150px,1fr)] xl:gap-8">
        <div>
          <div className="flex items-start gap-3">
            <HeadingTag
              className={
                depth === 0
                  ? "text-2xl font-semibold leading-8 tracking-[-0.015em]"
                  : depth === 1
                    ? "text-xl font-semibold leading-7"
                    : "text-lg font-semibold leading-7"
              }
            >
              {section.title}
            </HeadingTag>
            <a
              href={`#${section.id}`}
              className="mt-0.5 shrink-0 p-1 text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Link to ${section.title}`}
            >
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {section.contentHtml ? (
            <div
              className="research-prose prose mt-5 max-w-none prose-p:my-4 prose-ul:my-5 prose-ol:my-5 prose-li:my-2 prose-strong:text-foreground prose-a:font-sans prose-a:font-semibold prose-a:text-primary prose-a:underline prose-a:decoration-primary/40 prose-a:underline-offset-4 prose-figure:my-8 prose-img:my-0 prose-img:w-full prose-img:max-w-full prose-img:rounded-sm prose-img:border prose-img:border-border prose-img:bg-white"
              dangerouslySetInnerHTML={{ __html: section.contentHtml }}
            />
          ) : null}
        </div>

        {citations.length > 0 && (
          <aside
            className="mt-6 border-l-2 border-primary bg-muted px-4 py-4 xl:mt-0 xl:self-start xl:bg-transparent xl:py-0 xl:pr-0"
            aria-label={`Evidence cited in ${section.title}`}
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Evidence in this section
            </p>
            <ul className="mt-3 space-y-3">
              {citations.map((source) => (
                <li key={source.reportId}>
                  <a
                    href={source.resolvedHref}
                    className="block text-sm font-semibold leading-5 text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Report {source.reportId}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {section.children?.length ? (
        <div className="mt-7 space-y-7">
          {section.children.map((child) => (
            <ResearchSection
              key={child.id}
              section={child}
              sourcesById={sourcesById}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function getSectionCitations(
  html: string,
  sourcesById: Map<number, ResearchReportSource>,
): ResearchReportSource[] {
  const ids = new Set<number>();
  const pattern = /href="\/reports\/(\d+)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    ids.add(Number(match[1]));
  }

  return Array.from(ids)
    .map((id) => sourcesById.get(id))
    .filter((source): source is ResearchReportSource => Boolean(source));
}
