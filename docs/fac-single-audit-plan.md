# FAC single audit supplement — planning report

Status: planning draft v2, 2026-10-28
Audience: maintainer of `MedicaidAuditIntelligence` and the separate `~/Projects/FAC` research project

## Purpose

GAO-23-105881 (in the corpus as report #15) builds its main argument on
Federal Audit Clearinghouse (FAC) data: about 300 Medicaid single audit
findings a year, about 60% of them repeats, and a CMS that had not used
national trends to guide its oversight. This project rebuilds that analysis
from the FAC API, shows the rebuilt figures next to GAO's own sentences, and
then extends each figure to the latest year with usable data.

The site gets one research entry out of it, not a load of single audits into
the `reports` table. All API calls and the API key stay in `~/Projects/FAC`,
which exports a snapshot for this site. The site never calls FAC at runtime.

## Decisions made (2026-10-28)

| # | Decision | Effect on the plan |
|---|---|---|
| 1 | **93.778 only** | Matches GAO's method. CHIP (93.767) is recorded only as a co-program flag on shared findings. |
| 2 | **50 states and DC only, no territories** | Territories are removed when the data is extracted, so they never enter the dataset. |
| 3 | **New classifier using GAO's seven topics** | Replaces the earlier three-tier plan built on the site's taxonomy. See Step 2. |
| 4 | **Structured data layer stays in scope, but is gated** | Step 4 starts only after you have reviewed and approved the research entry from Step 3. |

## Sequence and gates

| Step | Work | Gate before the next step |
|---|---|---|
| 0 | Review completeness and reliability for each state, year and field, FY2016 to latest | You sign off on the completeness matrix and the field ratings |
| 1 | Rebuild GAO's figures and extend them by year | Each rebuilt FY2019–21 figure is within the tolerance below, or the gap is explained |
| 2 | Classifier built on GAO's seven topics | Topic distribution matches GAO's seven states closely, and human review agrees on at least 85% |
| 3 | Publish the research entry `reports/single-audit-signals/` | You review and approve the entry |
| 4 | Structured `fac_*` layer with state and topic panels | n/a |

FY2016–2018 are pulled only so that repeat chains for FY2019 can be traced
back. GAO did the same, using FY2017–2021 for its "two or more consecutive
years" figure.

---

## Step 0 — Data completeness and reliability

Nothing gets published until this step is finished. GAO's own appendix shows
the risk: as of December 1, 2022, six states were missing at least one year in
the clearinghouse. GAO added 15 findings by hand from state auditor websites,
and it also spot-checked finding types against the audit reports themselves.
Step 0 does the same work, written down so it can be repeated.

### 0a. Completeness matrix (51 jurisdictions × audit years 2016–latest)

One row for each state and year, with these columns:

| Column | Why it matters |
|---|---|
| Statewide audit filed (Y/N) and `report_id` | Separates "no findings" from "no data" |
| Number of state-entity reports in that state-year, and which one(s) count | Some states file more than one state-level report. This is the most likely cause of the 993 vs 923 gap. |
| `fy_end_date`, `fac_accepted_date`, days from year end to acceptance | Measures late filing; also defines when a year counts as complete |
| 93.778 present; `is_major`; Medicaid `amount_expended` | **If Medicaid was not tested as a major program, zero findings means "not tested," not "clean."** |
| Compliance opinion type for 93.778 (`audit_report_type`) | Context for severity figures |
| Medicaid findings count: award-level `findings_count` vs linked `findings` rows | Internal consistency check |
| Narrative text present for every finding | Needed for Step 2 |
| Resubmission or amendment present | Use only the latest accepted version |
| Status | **Complete** / **Usable with caveat** / **Excluded**, with a reason |

A year counts as "complete" only when at least 49 of the 51 statewide audits
are in. The latest year that meets this rule becomes the "202X" in every
table. My current guess is FY2024, with FY2025 shown as provisional, but the
matrix decides.

### 0b. Field-by-field reliability

These fields feed a published number:

| Table | Field | Checks |
|---|---|---|
| general | `auditee_state`, `entity_type` | Valid code for one of the 50 states or DC; territories and multi-state filers removed |
| general | `audit_year`, `fy_end_date` | **Confirm `audit_year` means the same thing as GAO's "fiscal year of each auditee."** Check it against the fiscal year end for June-30 states. If the year is off by one, every per-year column shifts. |
| general | `auditee_uei` / `auditee_ein` | The 2022 switch from DUNS to UEI can break links across years; join on state plus statewide report instead |
| federal_awards | prefix/extension, `award_reference`, `is_major`, `findings_count` | Every Medicaid finding links to a 93.778 award reference |
| findings | `reference_number`, `award_reference` | Duplicates removed on `(report_id, reference_number)`; no orphans |
| findings | `is_modified_opinion`, `is_other_matters`, `is_other_findings` | Y/N values; candidate definitions of "noncompliance" (see 0c) |
| findings | `is_material_weakness`, `is_significant_deficiency` | Count of findings flagged as both (should be rare); rate by year |
| findings | `is_questioned_costs` | Flag agrees with the narrative (for example, a finding flagged Y whose text says "Questioned costs: None") |
| findings | `is_repeat_finding`, `prior_finding_ref_numbers` | Fill rate by year; repeat = Y with blank prior refs; whether each prior ref exists in the previous year's report |
| findings | `type_requirement` | Valid letters; rate by year |
| findings_text | `finding_text` | Present, not truncated, and matches the reference number |

Each field gets one rating, **Reliable**, **Reliable with caveat** or **Not
reliable**, broken out by year band: pre-2022 data migrated from the Census
clearinghouse, and data filed directly with the GSA FAC from 2022 on. A field
rated Not reliable cannot feed a headline number.

### 0c. Definitions to settle before counting

1. **What counts as the statewide audit:** use the state-entity report with the
   largest total expenditures that includes 93.778, and record every exception
   by name.
2. **Noncompliance:** GAO's 69% figure has no single matching FAC field. Test
   candidate definitions (modified opinion; modified opinion OR other matters;
   any compliance finding) and use the one that reproduces 69% for
   FY2019–21. Record the result.
3. **Repeated once vs. two or more consecutive years:** a finding "repeated
   once" when it is a repeat and its prior-year predecessor was not. It counts
   as "two or more" when the predecessor was itself a repeat. Measure this two
   ways, from the auditor's flag chain and from prior reference numbers, and
   report both.
4. **Rounding:** match GAO's precision ("nearly 40 percent") in the headings,
   and show one decimal place in the tables.

### 0d. Spot check against the audit reports

Draw a stratified sample: one finding per state, spread across year bands,
about 50 in all (one for each of the 50 states and DC). For each, compare the
severity flags, the questioned-cost flag and amount, the repeat flag and the
prior reference against the PDF of the single audit. Report the share of
mismatches by field. This is the only place PDFs are used.

### 0e. Reconcile to GAO's 923

Explain the gap between 993 and 923 one adjustment at a time: territories,
extra state-entity reports, late filings after December 1, 2022, and GAO's 15
hand-added findings. The target is within ±3% after these adjustments. If the
gap is still larger, explain it in the methods section rather than tuning the
filter until it matches.

**Step 0 output:** `step0_completeness.csv`, `step0_field_reliability.md`,
`step0_reconciliation.md`, plus a frozen snapshot with its pull date and
sha256. Every later number cites this snapshot.

---

## Step 1 — Rebuild GAO's figures, then extend them

### Table format

Each block opens with GAO's sentence as the heading. Under it is a table that
first shows the rebuilt GAO period and then, past a heavy divider, each year
from 2019 to the latest complete year:

```text
### "Our analysis of single audit data found that, nationwide, state auditors
###  identified 923 Medicaid findings through single audits for fiscal years
###  2019, 2020, and 2021" — GAO-23-105881, p. 12

| Source        | FY2019–21 | Avg / yr ┃ 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025* |
|---------------|-----------|----------┃------|------|------|------|------|------|-------|
| GAO-23-105881 | 923       | 308      ┃  —   |  —   |  —   |      |      |      |       |
| This analysis | ###       | ###      ┃ ###  | ###  | ###  | ###  | ###  | ###  | ###   |
```

The GAO row is left blank where GAO published no figure. Footnotes cover
provisional years (*), excluded state-years (from Step 0) and the snapshot
date.

**Renderer gap:** the research-report renderer (`server/researchReports.ts`)
handles paragraphs, lists and images but not tables. Step 3 needs table support
with a column-group divider. That is a change to a shared frontend component,
so per AGENTS.md it goes through `$frontend-design`, the design brief and
system, and a worklog entry.

### Blocks (GAO's wording as the heading)

| # | GAO statement (heading) | Measure in the table |
|---|---|---|
| 1 | "…state auditors identified 923 Medicaid findings through single audits for fiscal years 2019, 2020, and 2021" | Count of findings |
| 2 | "That equates to an average of about six Medicaid findings per state each year… In 2020, for example, Michigan's single audit had 24 Medicaid findings, while three states' audits (Arizona, Hawaii, and South Dakota) had no Medicaid findings." | Mean, median and maximum per state; number of states with zero findings. A table of all 50 states and DC goes in an appendix. |
| 3 | "…over two-thirds (69 percent) of Medicaid single audit findings… involved noncompliance" | Count and % noncompliance (definition from 0c) |
| 4 | "…over one-third (36 percent) of Medicaid single audit findings… were material weaknesses" | Count and % material weakness |
| 5 | (GAO gives no figure) significant deficiency | Count and %, labeled "not reported by GAO" |
| 6 | "In addition, 60 percent of Medicaid single audit findings from fiscal years 2019 through 2021 were repeat findings" | Count and % repeat |
| 7 | "About 20 percent of findings repeated once, while nearly 40 percent were repeated in two or more consecutive years." | Two rows: % repeated once, % repeated two or more years, by both measurement methods |
| 8 | "About 30 percent of Medicaid single audit findings included questioned costs" | Count and % with questioned costs |

Blocks 3–5 can share one table with a row for each severity, because a finding
can carry more than one. A footnote says that the percentages do not add to
100.

### Questioned costs (block 8 and beyond)

GAO reports only the share of findings that have questioned costs. The FAC
findings table has a yes/no flag but no dollar field, so dollars must be
pulled out of the narrative.

1. **Rebuilt:** % of findings with questioned costs, by year (block 8).
2. **Extension, dollars:** extract known and likely questioned costs from
   `finding_text`, recording federal vs total share. Check the extraction
   against the Step 0d sample. Report dollars as "at least," because auditors
   must report questioned costs only above $25,000 and extraction will miss
   some amounts.
3. **Cross-tabs:** questioned costs by severity, by repeat status (do repeat
   findings keep costing money?) and by GAO topic once Step 2 is done.
4. **Concentration:** the share of dollars in the top 10 findings and in the
   top 5 states. A single $6M DSH finding can dominate a year's total, as GAO
   itself noted.
5. **Not reproducible from FAC:** CMS's $52.6M recovered on 70 of 191 findings
   comes from CMS's own data. Quote it as context only.

---

## Step 2 — Classifier built on GAO's seven topics

### Labels and definitions

The labels and definitions come from GAO-23-105881 Table 1:

| Topic | GAO's definition (paraphrased from Table 1) |
|---|---|
| Information technology | Medicaid IT systems, including claims systems, are not secure, produce inaccurate results, are not adequately tested, or do not comply with requirements |
| Beneficiary eligibility | Eligibility determinations are wrong or unsupported: wrong category, missing documentation, redeterminations |
| Improper payments | Payments made in error or without support, other than eligibility errors |
| Managed care | Capitation payments, oversight of managed care organizations (MCOs), encounter data, contract compliance |
| Reporting | Accuracy and timeliness of federal reports (CMS-64 and CMS-21) |
| Provider screening and enrollment | Credentials, background checks, revalidation, terminated or excluded providers |
| Other | Anything else |

### Rules, following GAO's footnote 28

- Each finding gets one **primary** topic, chosen in this order: any finding
  that touches **beneficiary eligibility** is eligibility. Otherwise, a finding
  that touches **managed care** is managed care, even when it is also about
  reporting. Write out the remaining tie-breaks and freeze them before
  labeling starts.
- Record **secondary** topics too, so that counts across topics can be shown
  while the primary-topic totals stay comparable to GAO's.
- Split **Other** into "Other: Medicaid program" and "Other: general federal
  compliance" (cash management, procurement, SEFA, period of performance).
  This keeps your concern about "muddying the water" visible without changing
  GAO's seven-topic totals.
- Each label stores a quoted span of evidence from the finding text and a
  confidence score, following the evidence pattern of the existing topic
  pipeline.

### Validation

1. **Benchmark against GAO's seven states.** GAO classified 74 FY2019–21
   findings from Kentucky, Nevada, North Carolina, Ohio, Pennsylvania,
   Wisconsin and Wyoming: IT 19, eligibility 16, improper payments 10, managed
   care 10, reporting 9, provider screening 4, other 6. Run the classifier on
   the same states and years and compare the distributions. This gives the
   first block of the topic section a real GAO comparison column; national
   and per-year figures come after it.
2. **Human review** of a sample stratified by topic and year band, at least
   ~25 per topic. Agreement must be at least 85% on the primary topic.
   Disagreements are written down and the definitions are revised before the
   final run.
3. **Crosswalk to site topics:** map GAO topics to the site's existing
   taxonomy, so the research entry can link to related standalone audits
   without merging the two taxonomies.

---

## Step 3 — Research entry

`reports/single-audit-signals/` (metadata.json and report.md), loaded by the
existing research loader. Contents:

1. Short framing: what a single audit is and why it differs from the
   performance audits elsewhere on the site.
2. Step 1 blocks 1–8 (GAO quote → rebuilt figures → extension).
3. Questioned-cost analysis.
4. Topic section: comparison with GAO's seven states, then national figures
   and figures by year.
5. Persistence: the longest repeat chains and the oldest open findings, linked
   to related state audits already in the corpus. For example, Maine 2023-032
   on deceased-client cases sits alongside the Nebraska 2025 and HHS-OIG 2025
   capitation audits.
6. Methods and data quality: summary of Step 0, exclusions, field ratings,
   snapshot date and hash.

Done when `npm run check` and `npm run build` pass, the page has been reviewed
at mobile and desktop widths, and **you approve it**.

## Step 4 — Structured layer (after Step 3 is approved)

New tables that only add data, kept separate from the report tables:

- `fac_snapshots`: pull date, query manifest, row counts, sha256, classifier
  version, Step 0 ratings.
- `fac_audits`: one row per state and year, with `jurisdiction_code` set by a
  foreign key, plus the Step 0 status.
- `fac_findings`: reference number, year, severity flags, questioned-cost flag
  and extracted amount, repeat flag and chain ID, primary and secondary GAO
  topics, `is_medicaid_only`, and the source URL on fac.gov.

Imported from a signed snapshot (preview, then publish, then roll back if
needed), following the pattern of the topic bundles. Displayed as a "Single
audit" panel on state pages and a count per topic on topic pages, labeled
clearly as a different source type.

---

## Queries

All calls use the FAC project's `FacClient` (PostgREST, `X-Api-Key`, a
20,000-row cap, pages of 4,999). Run one audit year at a time so each run can
be repeated safely.

```text
# 1. Medicaid award lines
GET /federal_awards?federal_agency_prefix=eq.93&federal_award_extension=eq.778
    &audit_year=eq.{Y}
    &select=report_id,auditee_uei,audit_year,award_reference,federal_program_name,
            amount_expended,is_major,is_direct,audit_report_type,findings_count

# 2. Auditee header for those reports (report_id batched in groups of ~100–150)
GET /general?report_id=in.(...)&entity_type=eq.state
    &select=report_id,auditee_uei,auditee_ein,auditee_name,auditee_state,audit_year,
            fy_start_date,fy_end_date,fac_accepted_date,total_amount_expended,
            auditor_firm_name,agencies_with_prior_findings

# 3. All award lines for the reports kept (to flag findings shared with other programs)
GET /federal_awards?report_id=in.(...)&select=report_id,award_reference,
    federal_agency_prefix,federal_award_extension

# 4. Findings for the reports kept, then filtered locally to Medicaid award refs
GET /findings?report_id=in.(...)

# 5. Narrative text, concatenated per (report_id, finding_ref_number)
GET /findings_text?report_id=in.(...)

# 6. Optional: corrective action plans
GET /corrective_action_plans?report_id=in.(...)
```

Add `federal_awards` to `fac.ingest.TABLES`. The DuckDB cache currently holds
only `general`, `findings` and `findings_text`, and only for 2023.

## Probe results so far (2026-10-28, before Step 0)

These came from read-only calls; they are not yet filtered to the 50 states
and DC.

- FY2019–21: 993 findings (GAO: 923), 60.8% repeat (GAO: ~60%), 30.6% with
  questioned costs (GAO: ~30%), 36.0% material weakness across all years
  (GAO: 36%).
- Findings by year: 2016: 332 · 2017: 323 · 2018: 301 · 2019: 357 · 2020: 336
  · 2021: 300 · 2022: 277 · 2023: 249 · 2024: 245 · 2025: 205 (provisional).
- 208 of 494 FY2023–24 findings were attached to five or more award lines,
  which is why the flag for findings shared with other programs matters.

## Caveats to state on the page

- A single audit finding is a compliance and internal-control finding scoped
  by OMB's Compliance Supplement. Coverage follows what CMS asks auditors to
  test.
- A falling count can reflect changes to the Compliance Supplement, the
  pause in redeterminations during the public health emergency (2020–23), the
  2023–24 unwinding, or late filers. It does not necessarily mean
  improvement. Mark those years in the tables.
- Questioned-cost dollars are a lower bound, because of the $25K reporting
  threshold and extraction misses.
- The repeat flag is the auditor's own judgment. Show where it disagrees with
  the linked chain rather than hiding the disagreement.
- FAC data changes as audits are resubmitted. Every figure is "as of" the
  snapshot date.
- GAO's topic counts cover seven states only. National topic figures are this
  project's extension, not a GAO finding.

## Open items

1. Who does the human review in Steps 0d and 2, and how much time is
   available for it? This sets the sample sizes.
2. Should the appendix table for block 2 name each state on the public page?
   It invites comparisons between states, which GAO warns against for
   improper-payment rates.
3. Does the "202X" endpoint stop at the latest *complete* year, or add one
   provisional column? (Draft assumption: show the provisional column with an
   asterisk.)
