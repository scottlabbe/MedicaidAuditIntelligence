# Design system direction

Status: proposed tokens for the first coded prototype

These values are deliberate starting constraints, not an invitation to create additional near-duplicate tokens during implementation.

## Core palette

| Token | Value | Purpose |
| --- | --- | --- |
| Institutional green | `#12372A` | Header, primary actions, strong structural rules |
| Interactive green | `#176B4D` | Links, active filters, data emphasis |
| Evidence wash | `#E8F1EC` | Selected and informational surfaces |
| Ink | `#111813` | Primary text |
| Secondary ink | `#4B5650` | Metadata and supporting text |
| Paper | `#FFFFFF` | Dominant page and reading surface |

Functional colors:

- Quiet surface: `#F3F5F4`
- Border: `#B7C0BB`
- Keyboard focus: `#FFDD00`
- Error: `#C83232`
- Warning: `#8A5A00`

Dark green should structure the page, not flood it. Most content remains on white.

## Typography

- **Public Sans**: interface, navigation, headings, forms, and tables
- **Source Serif 4**: report summaries, findings, excerpts, and long-form research
- **IBM Plex Mono**: report identifiers, dates, financial values, and compact utility labels

The type system should distinguish public-service navigation, source material, and audit metadata. Monospace is reserved for genuinely structured data.

## Layout

- Mobile-first single column
- Default maximum shell width: `1120px`
- Default reading measure: `680px` to `760px`
- Desktop content pages may use a two-thirds/one-third structure
- Left-align primary headings and search
- Use a consistent spacing scale rather than per-component values

## Shape and depth

- Default radius: `2px`
- Compact controls may use up to `4px`
- Avoid shadows on standard content containers
- Use borders, spacing, and background changes to communicate grouping
- Reserve pills for real tags, filters, or statuses

## Interaction

- Links remain visibly identifiable and are generally underlined in content
- Keyboard focus uses a high-contrast yellow treatment with a dark edge
- Hover is never the only indicator of interactivity
- Motion is limited to state transitions that clarify cause and effect
- Respect `prefers-reduced-motion`

## Evidence docket anatomy

Every docket should support the following fields when available:

1. Jurisdiction
2. Publishing agency
3. Publication date
4. Report title
5. Short evidence summary
6. Financial impact or finding severity
7. Finding and recommendation counts
8. Source-document link and source status

Missing data should be omitted or explained. It must never be replaced with invented placeholder metadata.

## Homepage thesis

The hero is a direct evidence-finding task:

> Find Medicaid audit findings

Supporting text explains what can be searched. The primary search accepts topic, state, agency, report title, or finding language. Browse routes are secondary.

## Acceptance criteria

- The page looks credible without relying on a logo.
- A first-time visitor can identify the primary task within five seconds.
- Report provenance is visually easier to find than promotional content.
- The system remains legible at 200% zoom.
- Core flows work using only a keyboard.
- Text and interactive controls meet WCAG 2.2 AA contrast.
