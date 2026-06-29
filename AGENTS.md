# Medicaid Audit Intelligence

## Frontend design workflow

- Invoke `$frontend-design` for new pages, substantial visual changes, or changes to shared frontend components.
- Before frontend design work, read `docs/design/brief.md` and `docs/design/system.md`.
- Follow the skill's two-pass process: propose and critique the design plan before implementation, then critique the rendered result.
- Use real Medicaid audit content in prototypes and screenshots. Do not use generic product-marketing copy.
- Treat `docs/design/brief.md` as the product and aesthetic brief, and `docs/design/system.md` as the source of truth for approved visual tokens and patterns.
- Record meaningful design choices and rejected alternatives in `docs/design/worklog.md`.
- Do not add a new color, typeface, radius, shadow, or animation pattern without documenting why the existing system is insufficient.
- Preserve responsive behavior, visible keyboard focus, reduced-motion support, and WCAG 2.2 AA contrast.

## Verification

- Run `npm run check` after modifying TypeScript or TSX.
- Run `npm run build` after changes that affect page structure, routing, or shared styling.
- Review changed pages at mobile and desktop widths before considering design work complete.
