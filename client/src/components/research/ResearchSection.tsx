import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Link as LinkIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ResearchReportSection as ResearchReportSectionType } from "@/lib/types";

interface ResearchSectionProps {
  section: ResearchReportSectionType;
  activeHashId?: string;
  depth?: number;
}

export default function ResearchSection({
  section,
  activeHashId,
  depth = 0,
}: ResearchSectionProps) {
  const [open, setOpen] = useState(section.defaultExpanded);
  const containsActiveHash = useMemo(
    () => (activeHashId ? sectionContainsId(section, activeHashId) : false),
    [activeHashId, section],
  );

  useEffect(() => {
    if (containsActiveHash) {
      setOpen(true);
    }
  }, [containsActiveHash]);

  const HeadingTag = depth === 0 ? "h2" : depth === 1 ? "h3" : "h4";

  return (
    <section
      id={section.id}
      className={cn(
        "scroll-mt-24 rounded-2xl border border-border bg-card/70",
        depth === 0 ? "warm-shadow-lg" : "warm-shadow",
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            "flex items-start gap-2 px-5 py-4",
            depth === 0 ? "bg-muted/30" : "bg-background/50",
          )}
        >
          <div className="min-w-0 flex-1">
            <HeadingTag className={cn("min-w-0", depth === 0 ? "text-2xl font-semibold" : "text-lg font-semibold")}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="focus-ring flex w-full items-start gap-3 text-left text-foreground transition-colors hover:text-orange-700"
                >
                  <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-5 w-5 shrink-0 transition-transform duration-200",
                      open && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            </HeadingTag>
          </div>
          <a
            href={`#${section.id}`}
            className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            onClick={(event) => event.stopPropagation()}
            aria-label={`Link to ${section.title}`}
          >
            <LinkIcon className="h-4 w-4" />
          </a>
        </div>

        <CollapsibleContent>
          <div className="space-y-5 px-5 pb-5">
            {section.contentHtml ? (
              <div
                className={cn(
                  "prose max-w-none prose-p:my-3 prose-ul:my-4 prose-li:my-2 prose-a:text-orange-700 prose-a:no-underline hover:prose-a:underline",
                  depth > 0 && "text-sm",
                )}
                dangerouslySetInnerHTML={{ __html: section.contentHtml }}
              />
            ) : null}

            {section.children?.length ? (
              <div className="space-y-4 border-l border-border/70 pl-4">
                {section.children.map((child) => (
                  <ResearchSection
                    key={child.id}
                    section={child}
                    activeHashId={activeHashId}
                    depth={depth + 1}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function sectionContainsId(
  section: ResearchReportSectionType,
  targetId: string,
): boolean {
  if (section.id === targetId) {
    return true;
  }

  return section.children?.some((child) => sectionContainsId(child, targetId)) ?? false;
}
