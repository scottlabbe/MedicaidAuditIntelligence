# Design worklog

Use this file to preserve the skill's plan, critique, and revision history. Add entries newest first.

## 2026-06-27 — Typographic site wordmark

**User job**

Recognize the site identity in the global header without a generic document icon or an implied government seal.

**Selected direction**

- Remove the folded-corner document icon and use “Medicaid Audit Intelligence” as the complete home-link wordmark.
- Set the wordmark in the approved Public Sans family at a stronger weight, tighter tracking, and larger desktop size.
- Keep the existing dark-green header and single-row navigation. Allow the wordmark to wrap only when narrow mobile space requires it.
- Remove the unused logo component after removing its remaining imports.

**Pre-build critique**

- What felt generic: the document outline communicated “file” but not Medicaid oversight, provenance, or the Public Audit Ledger.
- What changed: identity now comes from the service name, institutional color, typography, and consistent header placement.
- Why this fits the brief: the design system already requires the site to look credible without relying on a logo, and the evidence docket remains the one expressive product signature.
- Rejected alternative: an all-caps or mixed Public Sans/IBM Plex Mono lockup would create a second display convention and misuse the utility typeface as branding.
- Scope decision: a separate identity masthead and navigation row would follow the broader GOV.UK pattern, but it was rejected for this change because it would increase header height and alter navigation behavior rather than simply replace the icon.

**Rendered review**

- Viewports reviewed: `1440 × 900` desktop, `390 × 844` mobile, `720 × 900` as a 200%-zoom layout equivalent, and `320 × 760` as an additional narrow-screen check.
- Desktop: the wordmark renders in Public Sans at `18px` and weight `700`, with clear separation from the full primary navigation.
- Mobile: the wordmark renders at `15px`, remains on one line at both `390px` and `320px`, and retains more than `56px` between the home link and menu button at the narrowest reviewed width.
- Zoom and overflow: the header switches to mobile navigation at the zoom-equivalent width, and document width matches viewport width at every reviewed size.
- Identity and accessibility: the home link retains the accessible name “Medicaid Audit Intelligence home”; the rendered link contains no SVG or image. The approved focus classes remain on the link.
- Verification completed: `npm run check` and `npm run build`.

## 2026-06-27 — About page accountability statement

**User job**

Understand what Medicaid Audit Intelligence contains, how records are produced, which fields are AI-authored, and how to verify or correct the data.

**Selected direction — Method and accountability statement**

- Use a left section register and a `680–760px` reading column rather than a centered marketing layout.
- Open with the library’s public-evidence purpose, then distinguish source-derived fields from AI-authored analysis in a ruled record-anatomy register.
- Present collection, extraction, structuring, and publication as a real four-step sequence.
- Treat source verification and error reporting as a prominent operational instruction.
- Keep creator and case-study information subordinate to method and limitations.
- Reuse institutional green `#12372A`, interactive green `#176B4D`, evidence wash `#E8F1EC`, ink `#111813`, secondary ink `#4B5650`, paper `#FFFFFF`, Public Sans, Source Serif 4, IBM Plex Mono, two-pixel radii, and ruled grouping. No new visual token or motion pattern is introduced.

**Pre-build critique**

- What felt generic: the existing icon-card grid, centered hero, colored feature panels, and “Ready to Explore?” block read as a software marketing page rather than an accountability statement.
- What changed: repeated feature claims became a field-treatment register and a documented processing sequence. AI use and verification are stated once, with the limitation next to the verification action.
- Why it is specific to this library: the page names actual extracted and generated fields, preserves publishing-agency identity, explains original-source status, and directs consequential users back to the issuing report.
- Accuracy correction: the previous workflow said agency names were normalized. Because the live corpus preserves exact publisher identities and may contain near-duplicates, the revised copy states that publisher names remain tied to indexed source metadata.
- Remaining risk: a methodology page can become overly procedural. The hero and purpose section therefore explain the user benefit before exposing the extraction details.

**Rendered review**

- Viewports reviewed: `1440 × 1100` desktop, `390 × 844` mobile, and `720 × 900` as a 200%-zoom layout equivalent. Document width matched viewport width at all three sizes.
- Desktop structure: the `210px` section register and `760px` reading column remain distinct without compressing the narrative measure. The page uses one main landmark and a valid `h1`/`h2`/`h3` hierarchy.
- Mobile structure: the section register becomes a native disclosure before the content. Record-anatomy fields and workflow steps return to a clear single-column order; long project links wrap within the viewport.
- Focus review: opening the mobile section disclosure retained focus and displayed the approved inset yellow focus treatment. All content and external links remain visibly identifiable without relying on hover.
- Content critique: the source-derived/AI-authored distinction is easier to scan than the previous repeated AI feature cards. Verification remains visually prominent without competing with the evidence docket used elsewhere in the product.
- Reduced-motion review: the page introduces no animation or motion-dependent behavior.
- Verification completed: `npm run check` and `npm run build`.

## 2026-06-27 — Research register and citation-led report

**User jobs**

- Research index: identify a relevant Medicaid oversight synthesis and understand its evidence base before opening it.
- Research report: read cross-report analysis continuously and verify each claim against the cited audit records.

**Selected direction**

- Replace the research card grid with a ruled register exposing category, title, description, cited-report count, and update date.
- Replace nested collapsible cards with an open long-form document, a sticky desktop section index, a mobile section disclosure, contextual citation notes, and a final evidence register.
- Keep the evidence docket as the product signature. The report-specific citation margin is a restrained extension of its provenance grammar, not a second decorative motif.
- Use only the approved Public Audit Ledger colors, Public Sans, Source Serif 4, IBM Plex Mono, two-pixel radii, and ruled grouping.

**Pre-build critique**

- The initial three-column concept risked compressing the approved reading measure. The citation margin is therefore limited to wide viewports; at narrower widths citations move beneath the supported subsection.
- Research cards, a featured badge, orange gradients, large radii, shadows, and hover lifts were rejected because they made public evidence look like promoted editorial content.
- Collapsing all report sections was rejected because it weakens sustained reading, printing, browser search, and source verification.
- Source counts are derived from parsed citations. Missing provenance is never replaced with invented metadata.

**Rendered review**

- Viewports reviewed: `1440 × 1100` desktop, `390 × 844` mobile, and `720 × 900` as a 200%-zoom layout equivalent. Document width matched viewport width at every reviewed size.
- Index review: the ruled register preserves comparable category, evidence-count, title, description, and update fields on desktop, then stacks them in the same reading order on mobile. Long Pharmacy Benefit Manager content wraps without truncation.
- Report review: the desktop layout preserves a readable narrative column, a stable section index, and a narrow contextual citation margin. At mobile and zoom widths, the section index becomes a native disclosure and citation notes move directly below the supported passage.
- Reading review: all sections remain open in document order, making browser search, printing, and continuous reading possible. Nested headings retain a valid `h2`/`h3` hierarchy.
- Provenance review: parsed source labels correctly expose report ID, jurisdiction, publishing agency, publication date, title, library status, and evidence-record action. The original markdown bibliography is not duplicated.
- Keyboard review: the mobile section disclosure opens without motion, retains focus, and displays the approved inset yellow focus ring. Links use the same visible focus treatment.
- Accessibility finding: the first implementation introduced a nested `main` landmark beneath the application shell. The final pass uses the existing application landmark only.
- Reduced-motion review: the redesigned routes introduce no animation. Section navigation uses native document movement and disclosure state.
- Verification data: visual review used a temporary frontend-only fixture populated with real managed-care audit content because `DATABASE_URL` was unavailable. The fixture was removed after review; production data access was not changed.
- Verification completed: `npm run check` and `npm run build`.

## 2026-06-27 — States and agencies wireframe direction

**User jobs**

- States index: choose a Medicaid jurisdiction and understand the depth and recency of its indexed evidence.
- State detail: review authoritative Medicaid audit evidence for one state and open either the library record or original source.
- Agencies index: locate the publishing oversight body named in a report.
- Agency detail: review the reports attributed to one exact publishing-agency identity.

**Shared constraints**

- Color: institutional green `#12372A`, interactive green `#176B4D`, evidence wash `#E8F1EC`, ink `#111813`, secondary ink `#4B5650`, and paper `#FFFFFF`; existing functional tokens remain unchanged.
- Type: Public Sans for navigation, headings, and controls; Source Serif 4 for evidence summaries; IBM Plex Mono for state codes, dates, counts, report identifiers, and source status.
- Shape and depth: two-pixel default radius, ruled grouping instead of cards or shadows, and no new animation pattern.
- Signature: index pages use a compact coverage register; detail pages use the canonical evidence docket ledger.

### Direction A — Coverage register to evidence ledger

**Plan**

- Render `/states` as an alphabetical state register. Each row exposes the state code, state name, indexed report count, latest publication date, and latest report title. A plain search field narrows the visible register.
- Render `/states/:slug` with a breadcrumb, state identity, a ruled coverage line for report count and latest publication, and complete evidence dockets ordered newest first.
- Render `/agencies` as a searchable alphabetical publisher register. Preserve exact agency names from source metadata and show report count plus latest publication.
- Render `/agencies/:slug` with the exact publisher name, indexed report count, represented jurisdictions, coverage period when derivable, and complete evidence dockets ordered newest first.
- On mobile, every register row becomes a two-stage reading block: identity and count first, latest-report context second. Dockets use the established one-column anatomy; no horizontal table scrolling.

**Pre-build critique**

- What felt generic: grids of bordered state and agency cards treated every destination as promotional content and made long agency names difficult to compare. A choropleth map would turn incomplete corpus coverage into an apparent performance measure.
- What changed: the index pages became stable alphabetical registers, while the detail pages became evidence ledgers. Rules and columns now encode identity, corpus depth, and recency.
- Why it is specific to Medicaid audit evidence: the state register distinguishes jurisdiction from publisher, the agency register preserves source-provided publisher identity, and the detail pages expose provenance and original-source status through the canonical docket.
- Data caveat: the current agency corpus includes near-duplicate publisher identities, including HHS OIG and several state auditor naming variants. The interface must not silently merge these. The agencies index should state that names follow indexed source metadata; normalization or aliases require a separate editorial/data decision.
- Remaining risk: adding latest-report titles to every index row may make the registers too dense. Keep titles to one restrained secondary line on desktop and allow natural wrapping on mobile; do not truncate the state or agency identity.

### Direction B — Geographic coverage map

**Plan**

- Use a United States map as the states index, with report counts and latest publication available on selection.
- Pair it with a list fallback, then reuse the evidence-ledger state detail.

**Pre-build critique**

- Strength: geographic entry can help occasional visitors who do not arrive with audit-agency vocabulary.
- Why it was rejected: the corpus does not cover every state, so color intensity would imply comparative audit activity or program risk when it only represents the current library. Keyboard behavior, 200% zoom, and small-screen labeling would also require a duplicate list. The map adds interpretation without improving source verification.
- Potential reuse: a clearly labeled coverage visualization may belong in a methodology or corpus-status view, not as the canonical states index.

### Direction C — Latest-evidence cards

**Plan**

- Present states and agencies as responsive card grids, each featuring its latest report and report count.

**Pre-build critique**

- Strength: cards provide generous space for report titles and work with the current API shape.
- Why it was rejected: the visual pattern is generic, long publisher names create uneven scanning, and repeated containers compete with the evidence docket signature. It also prioritizes recency over known-item retrieval on directory pages.

**Responsive and interface-state direction**

- Desktop: registers use aligned identity, count, latest date, and latest report columns inside the `1120px` shell. Detail pages use a two-thirds evidence column and one-third quiet context rail only when the rail contains useful coverage/provenance information.
- Mobile and 200% zoom: registers collapse into stacked rows; detail rails move above the docket list; source actions stay visible; no horizontal scrolling.
- Loading: preserve the ruled row rhythm with text-line skeletons, not blank cards.
- Error: state the failed content and provide one action, `Try again`; retain navigation and page identity where known.
- Empty search: `No states match “[query]”` or `No agencies match “[query]”`, followed by `Clear search`.
- Valid state with no reports: explain that no indexed reports are available and link to all reports; do not display zero-value metric cards.
- Invalid state or agency: use a not-found page with `View all states` or `View all agencies`.
- Focus and motion: use the approved yellow focus treatment; search filtering is immediate and uses no decorative animation; updates must not move keyboard focus.

**Decision**

Carry Direction A forward for all four routes. Use a coverage register on index pages and the canonical evidence ledger on detail pages. Reject the map because it overstates what corpus coverage means, and reject card grids because they weaken comparison and compete with the evidence docket. No new color, typeface, radius, shadow, or animation token is required.

**Rendered review**

- Viewports reviewed: `1440 × 1100` desktop, `390 × 844` mobile, and `720 × 900` as a 200%-zoom layout equivalent. All four routes matched document width to viewport width without horizontal overflow.
- Index review: the states and agencies registers sort alphabetically, retain live report counts and latest-report context, and collapse from aligned desktop columns into readable stacked rows. Search updates result counts immediately without moving focus.
- Detail review: the first two-thirds/one-third layout compressed the docket evidence column. The final layout uses a fixed `240px` context rail, leaving a `776px` evidence ledger and a `320px` summary column at the reviewed desktop width. Context moves above evidence on mobile and zoom layouts.
- Provenance review: state and agency dockets show publication, jurisdiction, exact publisher identity, report ID, summary, counts and financial impact when returned, and original-source status. Corpus sentinel strings such as `None`, `null`, and `N/A` are treated as missing evidence and omitted.
- Agency identity review: live data exposed normalized-slug collisions for punctuation variants of two publisher names. The storage mapping now preserves the first canonical slug and adds deterministic `--2` suffixes for later collisions, keeping every exact publisher identity reachable without silently merging records.
- Keyboard and focus review: search fields, register rows, breadcrumbs, evidence-record links, source links, and context actions follow normal document order. The state search retained focus while filtering; computed focus used a two-pixel dark edge and a two-pixel yellow outer ring.
- Reduced-motion review: these routes introduce no animation or motion-dependent interaction.
- Interface-state review: loading uses ruled skeleton rows; errors identify the failed content and provide `Try again`; empty searches provide `Clear search`; state and agency not-found pages return to the relevant register.
- Verification data: local browser review used a temporary frontend-only proxy to the public read-only API because `DATABASE_URL` was unavailable. The proxy configuration was removed after review and production data access was not changed.
- Verification completed: `npm run check` and `npm run build`.

## 2026-06-27 — Reports page wireframe exploration

**User job**

Browse the complete report library, narrow it by recognizable audit attributes, and verify the provenance of each result before opening it.

**Shared constraints**

- Color: institutional green `#12372A`, interactive green `#176B4D`, evidence wash `#E8F1EC`, ink `#111813`, secondary ink `#4B5650`, and paper `#FFFFFF`; existing functional tokens remain unchanged.
- Type: Public Sans for navigation and controls, Source Serif 4 for evidence summaries, and IBM Plex Mono for dates, report identifiers, financial values, counts, and source status.
- Shape and depth: two-pixel default radius, ruled grouping instead of shadows, and no new animation pattern.
- Signature: repeatable evidence dockets expose provenance and material findings before secondary actions.

### Direction A — Docket-led evidence ledger

**Plan**

- Place one plain-language search field and result count above a two-column desktop layout.
- Use a restrained left filter register for State, Agency, Topic, Year, and Source status.
- Render results as full-width compact evidence dockets, ordered newest first by default, with provenance in a fixed metadata band and report evidence in the reading column.
- On mobile, move filters into a labeled disclosure before the result list and stack each docket without hiding source status or the source-document action.

**Pre-build critique**

- What felt generic: a conventional filter sidebar beside card results would reproduce a familiar ecommerce or SaaS search pattern.
- What changed: results use a continuous ruled ledger rather than floating cards, and the filter labels mirror actual audit retrieval dimensions.
- Why it is specific to Medicaid audit evidence: every result leads with jurisdiction, publishing agency, publication date, report identity, financial impact, finding and recommendation counts, and source status.
- Remaining risk: complete dockets can make a long result set feel heavy. The compact result variant must preserve the docket anatomy while limiting summaries to a short evidence excerpt.

**Rendered review**

- Viewports reviewed: `1440 × 1100` desktop, `390 × 844` mobile, and `720 × 900` as a 200%-zoom layout equivalent. Document width matched viewport width in all three reviews.
- Desktop result structure: every docket uses fixed Published/Jurisdiction, Publishing agency/Report ID, Evidence, and Financial impact/Source status columns. Long agency names wrap within their assigned column without shifting later records.
- Mobile result structure: filters collapse behind a labeled disclosure, dockets return to one-column reading order, publication and jurisdiction remain paired at the top, and original-source actions remain visible.
- Data review: the list API now returns finding and recommendation counts through correlated count queries, avoiding per-report detail requests. Missing data is omitted; it is not rendered as a zero or placeholder.
- Filter review: query, jurisdiction, topic, year, publishing agency, source status, sort order, and pagination are URL-backed. Selecting Massachusetts produced `/reports?state=MA`, preserving a shareable and reload-safe state.
- Keyboard and focus review: search, disclosure, native selects, report links, source links, and pagination use normal keyboard order. The approved yellow focus treatment remained visible on the mobile disclosure.
- Reduced-motion review: the page introduces no animation. The existing global reduced-motion rule remains present, and disclosure state changes do not depend on motion.
- Accessibility findings: the first implementation introduced a nested `main` landmark and repeated “Filter reports” inside the expanded mobile panel. The final pass uses one main landmark and removes the duplicate mobile heading while retaining the desktop filter label.
- Visual critique: the first desktop render confirmed that card containers were unnecessary; continuous rules give the list a stable evidentiary rhythm. The dense agency column is intentionally narrower than the evidence column, but remains readable because rows grow rather than truncate provenance.
- Verification limitation: `DATABASE_URL` was unavailable, so the production build was rendered against a temporary local API fixture populated from the four latest records in `client/public/llms-full.txt`. Production data access was not changed. The new database query compiled but could not be executed against the production schema locally.
- Verification completed: `npm run check` and `npm run build`.

### Direction B — Provenance comparison register

**Plan**

- Use a dense, column-aligned register for Date, Jurisdiction, Agency, Report, Financial impact, and Source status.
- Let each row expand in place to reveal the evidence summary, counts, and source-document action.
- Collapse each row into a stacked docket at narrow widths instead of introducing horizontal scrolling.

**Pre-build critique**

- Strength: this gives experienced auditors the fastest cross-report comparison and makes missing metadata conspicuous.
- What felt generic: without careful field language, the register could resemble an administrative data table.
- What changed: columns are limited to provenance and decision-useful audit facts, while expansion reveals source material rather than operational controls.
- Remaining risk: report titles and agency names vary greatly in length, so desktop columns can become unstable at 200% zoom. Hidden summaries also weaken evidence discovery for first-time visitors.

### Direction C — Finding-led subject index

**Plan**

- Lead with subject routes such as Managed care payments, Eligibility, Provider oversight, and Pharmacy benefit managers.
- Show recent reports beneath each subject as compact dockets, with search and filters retained above the index.

**Pre-build critique**

- Strength: occasional visitors can enter through recognizable Medicaid oversight problems rather than agency vocabulary.
- Why it was rejected for the primary reports page: topic assignment introduces editorial framing, makes a report appearing in multiple subjects harder to reason about, and weakens the page's job of presenting the complete report library in a stable order.
- Potential reuse: this structure belongs on the Topics index, not as the canonical Reports page.

**Decision**

Carry Direction A forward. It best balances first-time comprehension, professional scan speed, responsive behavior, and the evidence docket signature. Borrow Direction B's strict metadata alignment inside each desktop docket, but do not require row expansion to see the evidence summary or original-source action. Reject Direction C for this route.

Direction A is now implemented on the Reports page with Direction B's fixed desktop metadata alignment. Keep the compact ledger as the canonical report-list pattern.

## 2026-06-27 — Homepage Direction A revision

**User job**

Search Medicaid audit evidence, review current reports, and move into a known browse route without encountering a redundant report list.

**Plan**

- Keep Direction A's search-first hierarchy.
- Turn “Latest evidence” into a manual sequence of complete evidence dockets, ordered newest first.
- Provide labeled Previous and Next controls plus visible position text such as `1 of 4`; do not autoplay.
- Replace “Recent evidence” with Direction B's “Browse the evidence” routes for State, Agency, Topic, and Year.
- Preserve the approved palette, type roles, shape, depth, and evidence-docket anatomy without adding tokens.

**Pre-build critique**

- What felt generic: carousel arrows alone would create an ambiguous promotional-slider pattern and hide the size and order of the report set.
- What changed: controls are labeled, position is explicit, order is chronological, and movement occurs only after user input. The docket itself remains the focus rather than partially visible neighboring cards.
- Why the revised direction is specific to Medicaid audit evidence: each step replaces one complete docket with another while preserving field positions, making report provenance and financial information easy to compare.
- Accessibility constraints: controls remain in the normal tab order; disabled states are explicit at sequence boundaries; changed docket content is announced without moving focus; swipe is optional rather than required; reduced motion replaces any slide transition with an immediate content change.
- Responsive constraint: controls sit above the docket on narrow screens, and the browse routes stack as four full-width rows.

**Rendered review**

- Viewports reviewed: `1440 × 1100` desktop, `390 × 844` mobile, and `720 × 900` as a 200%-zoom layout equivalent. The page had no horizontal overflow at any reviewed width.
- Data and interaction review: the browser used the repository's four latest audit records in date order. Previous and Next preserve control focus, update the visible docket and `1 of 4` position, and do not autoplay. Search routes to the explore page with the entered query.
- Keyboard and focus review: primary controls are keyboard reachable. Focus uses the approved yellow treatment with a dark edge; computed input focus showed a two-pixel dark edge and two-pixel yellow outer ring. Disabled sequence controls remain visibly identifiable.
- Reduced-motion review: changing reports replaces docket content without a slide animation. The mobile navigation sheet suppresses transition and animation under `prefers-reduced-motion`.
- Accessibility findings: the visible docket is not itself a live region; a concise status message announces the report position and title after navigation. The mobile navigation has a dialog title and description. “US” was revised to the plain-language jurisdiction “Federal.”
- Visual issues found and resolved: the first mobile pass made the long docket appropriately tall but retained clear metadata grouping and full-width actions. Long agency names wrap without overflow. The browse section remains subordinate to search and the current docket. The redundant recent-evidence list was not reintroduced.
- Verification limitation: the local application server could not connect because `DATABASE_URL` was unavailable. Visual review used a temporary local API fixture populated from `client/public/llms-full.txt`; production data access remains unchanged.

**Decision**

Direction A is selected for the homepage prototype with a manual latest-evidence browser followed by State, Agency, Topic, and Year browse routes. The separate recent-evidence list is rejected as redundant.

## 2026-06-27 — Homepage wireframe exploration

**User job**

Find authoritative Medicaid audit evidence quickly and verify it against the original source.

**Shared constraints**

- Color: institutional green `#12372A`, interactive green `#176B4D`, evidence wash `#E8F1EC`, ink `#111813`, secondary ink `#4B5650`, and paper `#FFFFFF`; quiet surface, border, focus, error, and warning remain the functional tokens already defined in the system.
- Type: Public Sans for navigation, headings, and controls; Source Serif 4 for report summaries and evidence excerpts; IBM Plex Mono for dates, report identifiers, financial values, and compact metadata.
- Shape and depth: two-pixel default radius, no standard-container shadows, and no new animation pattern.
- Signature: the evidence docket remains the sole expressive component.

### Direction A — Search followed by the current evidence docket

**Plan**

- Layout: a compact institutional header leads directly into a left-aligned search thesis; the newest high-value audit appears as one full-width evidence docket, followed by a quieter two-column list of additional recent evidence and browse links.
- Signature: the first docket exposes jurisdiction, agency, date, report identity, a source status, finding summary, financial impact, and counts in a ruled schedule.
- Real evidence: lead with “Illinois Medicaid Managed Care Capitation Payments for Incarcerated Enrollees,” published by HHS OIG in December 2025, with at least `$9.5M` in estimated unallowable payments and `$8.3M` Federal share.

**Pre-build critique**

- What felt generic: an early “featured reports” grid reproduced a standard content-library homepage and weakened provenance by making all metadata compete inside cards.
- What changed: one current audit became a full evidence docket, while subsequent reports became compact ledger rows rather than cards.
- Why the revised direction is specific to Medicaid audit evidence: the page proves the search corpus by showing a source-verifiable audit record and its material finding immediately, using the same docket anatomy needed throughout the product.
- Remaining risk: the lead report could be mistaken for editorial promotion. Label it “Latest evidence” and sort by a defensible rule; do not call it “Featured.”

### Direction B — Search as an audit index

**Plan**

- Layout: the hero is a structured search register. A large query field is paired with explicit State, Agency, Topic, and Year browse routes; below it, a compact “New to the ledger” table lists several recent reports with source status.
- Signature: docket fields become the grammar of the search interface—field labels, ruled columns, and source-status language—before expanding into full dockets in the result list.
- Real evidence: recent rows include the December 2025 HHS OIG audits of incarcerated enrollees and deceased enrollees, the October 2025 Massachusetts DME provider review, and the October 2025 New York managed-care network audit.

**Pre-build critique**

- What felt generic: a first pass resembled a database advanced-search form and asked first-time visitors to understand filters before seeing value.
- What changed: the primary query remains one unmistakable field; State, Agency, Topic, and Year are plain browse links rather than exposed form controls. A short recent-evidence ledger provides concrete examples below.
- Why the revised direction is specific to Medicaid audit evidence: its information architecture mirrors how auditors locate evidence—by jurisdiction, publisher, subject, and publication period—without turning the homepage into an analytics dashboard.
- Remaining risk: the denser register may feel less approachable to occasional visitors and is more vulnerable at 200% zoom. On narrow screens, browse routes must stack and the ledger must become docket rows rather than a horizontally scrolling table.

**Decision**

No direction selected. Direction A is the stronger first prototype because it makes search dominant while demonstrating the evidence docket in its complete, reusable form. Direction B is a credible alternative if user testing shows expert visitors prioritize known-item retrieval and browse dimensions over immediate report detail.

## Entry template

### YYYY-MM-DD — Page or system area

**User job**

State the page's single job.

**Plan**

- Color:
- Type:
- Layout:
- Signature:

**Pre-build critique**

- What felt generic:
- What changed:
- Why the revised direction is specific to Medicaid audit evidence:

**Rendered review**

- Viewports reviewed:
- Keyboard and focus review:
- Reduced-motion review:
- Accessibility findings:
- Visual issues:

**Decision**

Record what was kept, changed, or rejected and why.

## 2026-06-27 — Initial direction

**User job**

Find authoritative Medicaid audit evidence quickly and verify it against the source.

**Plan**

- Color: dark institutional green on predominantly white reading surfaces
- Type: Public Sans for service UI, Source Serif 4 for evidence, IBM Plex Mono for audit metadata
- Layout: left-aligned mobile-first shell with restrained reading widths
- Signature: repeatable evidence docket exposing provenance and material findings

**Pre-build critique**

The first idea risked looking like either a financial-services product or a generic environmental organization because dark green alone carries those associations. The direction was revised around audit-specific metadata, report provenance, financial schedules, and source-document patterns. Green now provides structure rather than identity by itself.

**Decision**

Proceed with the Public Audit Ledger direction for a header, homepage, results page, and report-detail vertical slice.
## 2026-06-27 — Selectable topic definition register

**User job**

Scan the vocabulary used across Medicaid audit records, understand a term without first opening report evidence, and focus any selected term as a standalone definition.

**Selected direction — Subject register to definition sheet**

- Color: institutional green `#12372A`, interactive green `#176B4D`, evidence wash `#E8F1EC`, ink `#111813`, secondary ink `#4B5650`, and paper `#FFFFFF`.
- Type: Public Sans for page structure and selectable terms, Source Serif 4 for definitions, and IBM Plex Mono for corpus frequency labels.
- Layout: the default view places definitions for the four most frequent live corpus terms in a ruled two-column ledger, followed by a frequency-ordered register of 24 selectable terms. Selecting a term replaces the opening ledger with one large term and its definition while retaining the register below.
- Signature: the selected term becomes a quiet definition sheet rather than a report-results page. Definitions intentionally contain no individual report references.
- No new color, typeface, radius, shadow, or animation pattern was introduced.

**Pre-build critique**

- What felt generic: a tag cloud would visualize frequency but weaken comparison and keyboard use; a responsive card grid would reproduce the previous topic directory and compete with the evidence docket.
- What changed: rank is shown only for the four terms where frequency order is meaningful. The remaining vocabulary uses a compact ruled register with exact corpus counts.
- Why it is specific to Medicaid audit evidence: definitions cover the live Medicaid vocabulary—including capitation payments, MCO, MMIS, PARIS, FMAP, and CMS-64—and separate subject orientation from source-level evidence.
- Rejected alternative: routing every selection directly to filtered reports was rejected because it would prevent the selected keyword and definition from standing alone, and it would mix evidence references into the requested definition state.

**Rendered review**

- Viewports reviewed: `1440 × 1000` desktop, `390 × 844` mobile, `720 × 900` as a 200%-zoom layout equivalent, and `800 × 900` for the six-item navigation breakpoint.
- Default state: the four most frequent live terms render as a two-column definition ledger on desktop and a single continuous ledger on mobile. Frequency rank and report count remain secondary to each term and definition.
- Selected state: selecting MCO and MMIS moved the chosen term to the sole `h1`, placed its definition immediately below, updated the URL, and marked the matching register item as pressed. Browser back restored the default state.
- Responsive review: document width matched viewport width at every reviewed size. The desktop definition cells measured `528px` each within the approved shell; the `800px` header retained separation between the service name and six navigation items.
- Keyboard and focus review: terms are native buttons in document order, links remain underlined, and controls use the approved yellow focus treatment. Selected state is exposed through `aria-pressed`.
- Reduced-motion review: selection and scrolling use no animation; loading placeholders disable their pulse under `prefers-reduced-motion`.
- Content review: all 24 terms returned by the live frequency endpoint have reviewed definitions. No definition contains an individual report reference.
- Implementation correction: the first interaction updated the query string without changing the view because the router excludes query parameters from its location value. The final implementation synchronizes selection with the URL explicitly and handles browser back/forward events.

## 2026-07-03 — Reviewed topic register and evidence pages

**User job**

Find reports assigned to a Medicaid audit subject through human review and verify each assignment against its approved source evidence.

**Plan**

- Color: reuse institutional green `#12372A`, interactive green `#176B4D`, evidence wash `#E8F1EC`, ink `#111813`, secondary ink `#4B5650`, paper `#FFFFFF`, quiet surface `#F3F5F4`, and border `#B7C0BB`.
- Type: Public Sans for taxonomy structure and navigation, Source Serif 4 for rationales and evidence snapshots, and IBM Plex Mono for publication and evidence-source labels.
- Layout: replace the keyword glossary with a single ruled canonical register. Topic detail uses a full-width heading and scope note followed by vertically ordered report dockets; each docket divides reviewer rationale from approved evidence on wide screens and stacks them on mobile.
- Signature: each topic-report relationship is itself an evidence docket, exposing provenance, the reviewer-approved rationale, and verbatim stored evidence before the full-report link.
- No new color, typeface, radius, shadow, or animation pattern was introduced.

**Pre-build critique**

- What felt generic: a card grid with topic icons and badges would resemble a generic directory, while numbered register rows would imply a ranking the taxonomy does not have.
- What changed: topic order remains the approved taxonomy order without decorative numbering. Rules encode topic boundaries, and the only count shown is the reviewed-report count.
- Why it is specific to Medicaid audit evidence: detail pages distinguish findings, recommendations, and approved report metadata and preserve each stored evidence snapshot without paraphrase.
- Rejected alternative: reusing the general report card was rejected because it hides the topic-specific rationale and evidence provenance that make these assignments publicly defensible.

**Rendered review**

- Viewports reviewed: `1440 × 1000` desktop and `390 × 844` mobile for both the canonical register and a 20-report Program Oversight evidence page.
- Desktop: the register reads as one continuous taxonomy rather than a card grid. Report counts remain secondary, and detail-page rationale/evidence columns have distinct roles without competing with the report title.
- Mobile: the register and evidence dockets stack without horizontal overflow (`scrollWidth` equals the `390px` viewport). Long agency names, report titles, rationales, and evidence snapshots wrap without clipping.
- Keyboard and focus review: topic entries and full-report actions are semantic links in document order and retain the approved yellow focus-ring classes. Native report filters preserve labeled keyboard operation.
- Reduced-motion review: neither topic page introduces motion. Loading pulses retain the existing `motion-reduce:animate-none` behavior.
- Accessibility findings: pages use one `h1`, section headings, ordered lists, labeled regions, semantic `article` elements, `blockquote` for stored evidence snapshots, and text source labels rather than color-only attribution.
- Functional correction: direct report-filter URLs initially lost their query string because the router location omits search parameters. Query state now synchronizes on initial load, filter changes, and browser history; SSR parses the same filters to avoid hydration mismatch.
- Local-preview correction: the development script now loads `.env` explicitly. Port `5000` was occupied in the review environment, so the verified preview ran on `4173`.

**Decision**

Keep the ruled canonical register and split rationale/evidence docket. No visual tokens or decorative elements were added after review. The rendered hierarchy is sufficiently restrained, and preserving full approved evidence text is more important than reducing vertical page length.

## 2026-07-04 — Topic field guides

**User job**

Understand why a Medicaid audit topic matters, see the evidence and recommended actions that recur within it, and reach the complete source-report set without reading a report-by-report evidence dump.

**Plan**

- Color: reuse institutional green `#12372A`, interactive green `#176B4D`, evidence wash `#E8F1EC`, ink `#111813`, secondary ink `#4B5650`, paper `#FFFFFF`, and border `#B7C0BB`.
- Type: Public Sans for guide structure, Source Serif 4 for definitions and evidence excerpts, and IBM Plex Mono for coverage facts and source metadata.
- Layout: a `220px` contents and coverage rail beside a `760px` reading column on desktop, collapsing to a single document flow on mobile.
- Signature: a ruled finding schedule places each stored evidence excerpt before its report citation. Findings and recommendations initially show three entries and expand in place.
- Public titles use ordinary evidence-library language. Review workflow terminology remains internal and is not used as a visual badge or section name.
- No new color, typeface, radius, shadow, or animation pattern was introduced.

**Pre-build critique**

- What felt generic: a sticky metric rail could make the page resemble a SaaS dashboard, while summary cards would fragment what should read as a reference guide.
- What changed: the rail is limited to document navigation and four coverage facts. The main column remains a continuous briefing with ruled sections and direct source citations.
- Why it is specific to Medicaid audit evidence: the page separates topic definition, oversight significance, finding evidence, recommended actions, and the complete report record—the sequence an auditor uses to orient, assess, and verify.
- Data limitation: “States represented” is explicitly based on each report’s recorded jurisdiction. The page does not claim to measure every state affected. Findings are called supporting evidence rather than “most severe” because the current evidence model has no severity review field.
- Rejected alternative: dynamically generated topic summaries and severity rankings were rejected because they would introduce unsupported interpretation into an otherwise source-traceable page.

**Rendered review**

- Viewports reviewed: `1440 × 1000` desktop and `390 × 844` mobile using the Eligibility and Enrollment guide.
- Desktop: the contents and coverage rail remains subordinate to the reading column, while the definition and oversight significance establish the guide before evidence appears. The finding schedule keeps each excerpt and report citation visually inseparable.
- Mobile: the first pass placed the desktop rail before the definition, consuming the opening viewport. The final layout hides the rail, leads with Definition and Why auditors care, then introduces a compact Evidence coverage section before findings.
- Responsive review: the final document has no horizontal overflow at `390px`. Section count labels stack below headings when needed, preventing the Recommendations count from widening the page.
- Interaction review: “Show 7 more findings” expands from three to all ten excerpts, updates to “Show fewer findings,” and exposes `aria-expanded="true"`.
- Keyboard and focus review: contents links, report citations, expanders, and related-report links use semantic controls and the approved visible focus treatment.
- Reduced-motion review: the redesign adds no motion; only the existing loading skeleton animates and retains `motion-reduce:animate-none`.
- Accessibility findings: the nested page-level `main` discovered in the first pass was replaced with `article`; final output contains one page `main`, one `h1`, ordered section headings, blockquotes, source links, and labeled coverage data.
- Terminology review: no public topic-page text contains “reviewed,” “reviewer-approved,” or “approved evidence.”

**Decision**

Keep the field-guide structure and desktop coverage rail. On mobile, prioritize explanatory content over navigation and move coverage into the document flow. Keep evidence ordering transparent and avoid severity language until severity is captured as a reviewed data field.
