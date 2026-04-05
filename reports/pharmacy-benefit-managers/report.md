Report Prepared by an AI Medicaid Researcher agent: [LINK](https://github.com/scottlabbe/researchagent-public)

Report prepared with data from the database published as of January 31, 2026.

# Executive Summary

### Medicaid Pharmacy Oversight Breaks Down When PBM Pricing Stays Opaque

Audits across six state and MCO-level reviews show a recurring, program‑level weakness: PBM pricing and reporting practices lack the transparency needed for states and MCOs to know the true net cost of pharmacy services. That opacity—undisclosed transmission fees, effective‑rate aggregations that omit returned funds, and incomplete encounter reporting—directly undermines encounter data, capitation inputs, rebate reconciliation, and the ability to detect improper pharmacy payments. [Report 65], [Report 7], and [Report 100] contain the clearest examples.

This briefing synthesizes evidence from 6 audit reports and 31 findings (publication window 2019–2024). The corpus contains multiple quantified exposures and material outliers: for example, the Texas audit identified an “effective‑rate” aggregation that omitted funds returned to PBMs [Report 7]; the New York claims review documented roughly $11.8 million in improper managed‑care premium payments tied to enrollment/disenrollment timing and additional questioned pharmacy claims and coding errors totaling hundreds of thousands of dollars [Report 53]; Maryland’s pharmacy audit found roughly $397,000 in overpayments in a small manual sample [Report 83]. Aggregated monetary figures in the source analysis are partial (many findings lack dollar extractions); all financial totals below are presented with that caveat.

Top takeaway for auditors and agency leaders: strengthen contract reporting obligations and encounter/reconciliation controls first. Contracts and data feeds are the chokepoints: if PBMs are required to deliver encounter‑level gross and net payment detail, including rebates, transmission/processing fees, and year‑end returns allocated by program, auditors can both quantify leakage and test corrective actions. Multiple reports point to that single lever as the root control failure. [Report 65], [Report 7], [Report 100], [Report 83], [Report 53], [Report 6].

## Background

### What the problem is and why it matters operationally

- Pharmacy Benefit Managers (PBMs) intermediate most pharmacy claims for Medicaid managed care and some state fee‑for‑service programs. They negotiate ingredient costs, administer claims, collect manufacturer rebates, assess transmission/processing fees, and sometimes operate pricing methodologies (spread pricing, “effective‑rate” arrangements).
- When PBMs or MCO contracting practices do not require transparent, program‑specific reporting of gross reimbursements, fees, and returns, states and MCOs cannot reliably: (a) reconcile what pharmacies were paid vs. what was reported in encounter or FSR data; (b) allocate manufacturer rebates or returned funds to the correct program; or (c) validate capitation bases and experience‑rebate calculations. The consequence is both financial leakage and degraded program analytics (network adequacy, utilization review, encounter‑based quality measurement).

### Scope of the evidence base

- This synthesis uses six audit reports covering PBM and pharmacy program oversight in Texas, Pennsylvania, New York, Maryland, Oregon, and state MCO contract processes—31 extracted findings in total. The reports are mainly state auditor/Oversight office reports (see Sources Referenced).
- The findings include both descriptive control weaknesses and a set of quantified questionable costs or overpayments. Not all findings include dollar values—12 of the 31 findings in the supplied bundle include extracted financial figures—so financial totals in this report summarize the quantified items only and are not a program‑wide loss estimate.

Distinguishing direct evidence vs. context
- Direct evidence: auditor‑identified issues (e.g., reported $26.4M in pharmacy expenses but omitted returned funds in a Texas MCO FSR; $11.8M improper premiums in New York; $397k overpayments in Maryland sample) are cited with the original report tokens below.  
- Contextual / program background: broader descriptions of complexity, fragmented regulation, and contract language weaknesses come from narrative findings and are used to explain patterns rather than to compute additional dollar exposure.

## Key Findings

Each subsection opens with the analytical claim, then cites the reports that anchor the observation.

### Delayed or hidden returns, transmission fees, and “effective‑rate” practices repeatedly produced pricing opacity
- Claim: PBM fee structures and pricing methodologies that are not contractually transparent create undisclosed “spread” between what MCOs (or states) believe they are paying and what pharmacies ultimately receive, making reconciliation and encounter validation infeasible.
- Evidence: Pennsylvania’s Performance Audit concluded DHS lacked effective monitoring of pharmacy drug claims and flagged undisclosed spread pricing and overstated pharmacy data (Finding 1) and noted a PBM (PerformRx, LLC) that disclosed transmission fees to pharmacies but not to MCOs or DHS, producing undisclosed spread pricing [Report 65]. Texas’ MCO audit found an “effective‑rate” year‑end aggregation that excluded funds returned to the PBM from the pharmacy expense reported in the FSR—a treatment the auditor judged unallowable and that produced a material discrepancy. [Report 7, finding 23]. Oregon’s review emphasized the system’s complexity and fragmented regulation that limit a state’s ability to measure PBM value and enforce transparency [Report 100].
- Operational failure: contracts and reporting do not require PBMs to report gross ingredient costs, per‑claim transmission/processing fees, and program‑level allocations of year‑end returns or pass‑throughs.  
- Synthesis: Across states, undisclosed PBM fee/return flows emerged as a consistent root cause of pricing opacity and impaired reconciliation.

### Coding, claims‑edit gaps, and documentation failures produced quantifiable overpayments and missed encounters
- Claim: Weak edits, coding validation, and prescriber or medical‑necessity controls led to recoverable overpayments and omitted encounters.
- Evidence: New York’s claims processing activity review identified approximately $11.8 million in improper managed‑care premium payments related to untimely disenrollments and $1.97 million in overpayments for inpatient services billed to FFS despite retroactive managed‑care coverage; it also flagged 14 questionable pharmacy claims (Targretin 1% gel) totaling $394,898 lacking medical‑necessity documentation [Report 53]. In Texas, the MCO audit found 1,297 encounters for compound drugs were not reported due to coding errors, totaling $132,511 and not corrected or resubmitted to the state [Report 7]. Maryland’s pharmacy audit found manual claim processing errors caused roughly $397,000 in overpayments in a small sample of tested claims [Report 83, finding 661].
- Operational failure: insufficient programmatic edits for specialty/compound drugs, inadequate processes for detecting and reconciling retroactive coverage changes, and limited upfront verification of prescriber licensure and documentation.
- Synthesis: Claims integrity controls are a high‑yield audit target—they both recover dollars and restore encounter completeness needed for downstream oversight.

### State and MCO contract management frequently stops short of forcing PBM transparency or completing monitoring frameworks
- Claim: States and MCOs often lack either the contract clauses or the implemented monitoring processes necessary to ensure PBM compliance with transparent reporting and reconciliation.
- Evidence: Texas’ managed care contract review described progress in process controls but noted planned improvements—such as performance audits of PBMs and using EQRO data for encounter validation—had not been fully implemented; the Commission had unresolved rebate disputes despite having billing/rebate transfer processes in place [Report 6, findings 19–22]. Pennsylvania’s audit directly called out ineffective monitoring of MCO‑PBM contracts [Report 65, finding 2]. Oregon recommended strengthening regulatory and contractual approaches to PBM oversight [Report 100].
- Operational failure: monitoring frameworks (EQRO-based standards, encounter validation) exist on paper but are not consistently operationalized or enforced; rebate reconciliation processes are present but disputed and incomplete.
- Synthesis: Contract language and execution gaps leave states reliant on imperfect encounter or FSR data—so improving clauses and follow‑through is necessary to close the transparency loop.

### States underutilize available pharmacy data and fail to automate critical verifications
- Claim: Where states do not systematically use drug‑utilization analytics, reversal analytics, or automated prescriber licensure checks, inappropriate claims and manual errors persist.
- Evidence: Maryland did not audit three of four FFS pharmacy programs, failed to analyze claim reversals, and did not apply drug‑utilization data to identify improper claims; it also lacked procedures to verify prescriber licensure before payment [Report 83, findings 662–663]. Pennsylvania’s audit highlighted problems in pharmacy encounter data submission and transparency that prevented reliable utilization analyses [Report 65]. New York’s large list of claim corrections demonstrates the practical payoff of stronger analytics when they are run [Report 53].
- Operational failure: missing or underused analytics and automated verifications allow both accidental and potentially intentional errors to proceed to payment.
- Synthesis: Data capability gaps are solvable and should be a parallel priority to contract reform; analytics detect problems that contracts and reconciliations then confirm.

### Payment variation and pharmacy equity concerns: independent pharmacies at risk
- Claim: Reimbursement rates vary materially by pharmacy type and PBM, disadvantaging independent pharmacies and risking access.
- Evidence: Oregon’s audit found national chain pharmacies were reimbursed roughly twice what selected independent pharmacies received for the same drugs in sample comparisons, raising equity and access concerns for smaller providers [Report 100, finding 842].
- Operational failure: lack of disaggregated reporting and monitoring by pharmacy type prevents oversight of network adequacy and equitable reimbursement.
- Synthesis: Pricing transparency is not only a financial integrity issue but also an access and policy issue for states to consider alongside recovery and reconciliation work.

## Cross‑Cutting Insights - Contract Weakness, Bad Data, and Weak Analytics Feed Each Other

- Contracts, encounters, and analytics form a single integrity pipeline. Weakness at the contract/reporting layer (missing gross/net breakdowns, no requirement to allocate returns by program) prevents meaningful reconciliation. That in turn makes encounter‑based analytics unreliable, which reduces the state’s ability to spot coding anomalies or suspect specialty claims. Several audits show this domino effect (PA and TX illustrate contract/FSR mismatch; MD and NY show missed analytics and coding problems). [Report 65], [Report 7], [Report 83], [Report 53]

- The problem is as much governance as it is technical. Multiple reports show that improved contract language was sometimes adopted but not fully operationalized (EQRO monitoring, encounter validation). Implementation gaps—staffing, tooling, or enforcement—are the friction points between policy changes and measurable improvement. [Report 6], [Report 100]

- Transparency has equity implications. Where states cannot see reimbursed amounts by pharmacy type, smaller pharmacies may be receiving systematically lower payments—an issue that ties financial oversight to network adequacy and access policy. [Report 100]

## Financial Impact - The Dollars Identified So Far Point to Much Larger Risk

### Analytical honesty and caveats up front
- The supplied corpus contains 31 findings; only 12 include extracted dollar values. The financial figures below are the auditor‑documented and extracted amounts present in the dataset and are not a comprehensive estimate of statewide exposure.

### Notable quantified items from the evidence base
- Texas MCO/FSR discrepancy: auditor‑quantified omission related to an “effective‑rate” aggregation included in $26.4 million reported pharmacy expenses [Report 7, finding 23]. This is the largest single quantified PBM‑pricing issue in the corpus.
- New York claims processing sample: approximately $11.8 million in improper managed‑care premium payments tied to enrollment/disenrollment process failures; additional FFS inpatient overpayments $1,969,028; questioned pharmacy claims and coding errors totaling small hundreds of thousands including a $394,898 specialist drug cluster (Targretin) [Report 53, findings 376, 377, 381].
- Maryland manual processing sample: roughly $397,000 in overpayments identified in an 11‑of‑15 claim test sample [Report 83, finding 661].
- Smaller but meaningful items: 1,297 unreported compound drug encounters totaling $132,511 in Texas [Report 7]; other documented adjustments and remaining uncorrected amounts in New York (multiple findings) [Report 53].
- Contextual FSR baseline: the Texas health plan reported STAR Kids medical spending of $109.1M in FSRs (informational finding), which auditors used to assess materiality of PBM adjustments [Report 7, finding 26].

### Interpretation
- These figures show that a relatively small set of mechanisms—(1) undisclosed PBM returns and aggregation methods, (2) enrollment/disenrollment timing and payer‑of‑last‑resort errors, and (3) claims coding for specialty/compound drugs—drive the largest quantifiable risks in the sample. However, because many findings lack dollar extractions, the corpus cannot credibly produce a single program‑level loss number; instead, use the outliers above as high‑priority signals for follow‑up audits and reconciliations.

## Recommended Procedures - The Most Important Controls to Build or Test Immediately

1. Require PBMs to deliver an encounter‑level "gross-to‑net" report each reporting period that includes, per claim: gross paid amount to pharmacy, ingredient cost, dispensing fee, transmission/processing fees, manufacturer rebate amounts allocated to the claim (if applicable), and any year‑end returns/adjustments allocated to the Medicaid program. Rationale: directly addresses undisclosed returns and transmission fees documented in Pennsylvania and Texas. Test: request the file for a recent 12‑month period and confirm every field exists and is reconciled to MCO paid claims. [Addresses: PBM transparency; encounter reporting] — Evidence: [Report 65], [Report 7], [Report 100].

2. Reconcile PBM gross‑to‑net reports to MCO paid claims, pharmacy remittance advices, and FSR/encounter totals for a statistical sample of high‑volume and high‑cost NDCs. Rationale: quantifies spread or omitted returns and validates encounter integrity. Test: compute gross minus net per claim; sample 3 PBMs and 10 high‑impact NDCs. Expected outcome: identify any unexplained spreads or missing returned funds. [Addresses: Pricing verification; encounter completeness] — Evidence: [Report 7], [Report 65], [Report 100].

3. Targeted claims‑edit audit for specialty and compound drugs plus newborn/maternity coding: execute an analytic probe that (a) flags compound claims and top 1% by dollar, (b) matches prescriber licensure and specialty against controlled lists, and (c) inspects medical‑necessity documentation for a sample. Rationale: addresses Targretin cluster and compound drug encounter omissions. Test: sample n=100 specialty/compound claims; quantify documentation failures and coding errors and estimate extrapolated exposure. [Addresses: Claims processing errors; prescriber verification] — Evidence: [Report 53], [Report 7], [Report 83].

4. Rebate and year‑end return reconciliation: require and test reconciliation files from manufacturers → PBMs → MCOs → State, and escalate unresolved disputes to a formal, time‑boxed remittance/recovery process. Rationale: resolves the unresolved rebate disputes and ensures pass‑through compliance. Test: pick one manufacturer and reconcile its reported rebate to PBM/MCO/state receipts for 2 years. [Addresses: Rebate management; contract oversight] — Evidence: [Report 6], [Report 65], [Report 83].

5. Strengthen encounter submission and validation rules, and operationalize EQRO encounter validation standards: implement mandatory fields for returned‑fund indicators and program allocation; add automated completeness checks and resubmission penalties. Rationale: prevents omission of returned funds and missing encounter populations. Test: after implementation, run an encounter completeness comparison (encounters vs. paid claims) and validate resubmission rate improvement. [Addresses: Encounter reporting omissions; monitoring frameworks] — Evidence: [Report 7], [Report 6], [Report 65].

6. Run routine automated prescriber‑licensure checks at point of payment and institute reversals/denial workflow for claims lacking valid credentials. Rationale: Maryland found missing licensure checks tied to improper payments. Test: block or flag claims where NPI/license cannot be matched within 48 hours and report weekly exception dashboard. [Addresses: State monitoring; provider credentialing] — Evidence: [Report 83].

Why these belong at the top
- Contractual reporting (1) and reconciliation (2,4) attack the root transparency failure noted across the corpus; claims edits and licensure checks (3,6) recover dollars immediately and improve data quality; encounter rules and EQRO operationalization (5) make the data reliable for continuous monitoring.

## The Hard Questions for Agencies - What States Must Confront Before Transparency Improves

- Can the state require PBMs and MCOs to supply a machine‑readable gross‑to‑net claim file that ties manufacturer rebate allocations and year‑end returns to program identifiers within existing contracts, or will contract amendments/legislation be necessary? [Reports 65, 7, 100]
- What is the governance path and timeline to operationalize EQRO‑based encounter validation and to make encounter completeness a recurring KPI with enforcement? [Report 6]
- How will the state reconcile manufacturer rebate notices to PBM pass‑throughs and to MCO/FSR accounting when PBMs claim confidentiality or commercial sensitivity? Is a trusted third‑party reconciler feasible? [Report 65, 6]
- Which PBM pricing mechanisms (spread, effective‑rate, pass‑through) are currently present across MCOs and CCOs, and where do year‑end return allocations flow in practice? Can the state map those flows within 30 days? [Report 7, 100]
- What is the incremental return on investment of (a) a targeted claims‑edit project for specialty/compound drugs versus (b) a broad contract reprocurement that forces pass‑through pricing? Which recovers more dollars in 90 days? [Reports 53, 65, 7]
- Are independent pharmacies experiencing materially lower reimbursements in our state’s network similar to Oregon’s findings, and if so, what immediate interventions (temporary reimbursement floors, expedited audits) are warranted? [Report 100]
- Given current staffing and analytics capacity, what minimal technical changes (data fields, automated licensure checks) can be implemented within 60 days to materially reduce payment risk? [Report 83]

## How to Read This Evidence Base

- This synthesis samples 6 reports and 31 findings (2019–2024). It identifies recurring themes, root control failures, and prioritized audit procedures grounded in the supplied findings. Because many findings are descriptive and not all contain dollar extractions, treat the monetary figures here as discrete items identified by auditors rather than a comprehensive loss estimate.
- For implementation, use the prioritized procedures as a test plan: short, measurable pilots (contract data requests, reconciliation of one PBM or one manufacturer for a two‑year window) will validate whether the audit signals scale to larger recoveries or systemic reform needs.
- Metadata gaps remain in the source bundle (few reports have public URLs in the supplied catalog). The canonical tokens in Sources Referenced below map every cited finding to its report identifier so readers can request the original documents from the issuing offices.

## Sources Referenced

- [Report 65] Performance Audit Report: Pharmacy Benefit Manager Services for the Physical HealthChoices Medicaid Program in Pennsylvania (state=PA; organization=Pennsylvania Department of the Auditor General; publication_date=2024-08-21). Source line: [Report 65] Performance Audit Report: Pharmacy Benefit Manager Services for the Physical HealthChoices Medicaid Program in Pennsylvania (state=PA; organization=Pennsylvania Department of the Auditor General; publication_date=2024-08-21)

- [Report 83] Maryland Department Of Health Pharmacy Services Audit Report (state=MD; organization=Office of Legislative Audits, Maryland General Assembly; publication_date=2024-08-09). Source line: [Report 83] Maryland Department Of Health Pharmacy Services Audit Report (state=MD; organization=Office of Legislative Audits, Maryland General Assembly; publication_date=2024-08-09)

- [Report 53] Medicaid Program: Claims Processing Activity October 1, 2023 Through March 31, 2024 (state=NY; organization=Office of the New York State Comptroller, Division of State Government Accountability; publication_date=2024-02-01). Source line: [Report 53] Medicaid Program: Claims Processing Activity October 1, 2023 Through March 31, 2024 (state=NY; organization=Office of the New York State Comptroller, Division of State Government Accountability; publication_date=2024-02-01)

- [Report 100] Poor Accountability and Transparency Harm Medicaid Patients and Independent Pharmacies (state=OR; organization=Oregon Secretary of State; publication_date=2023-08-01). Source line: [Report 100] Poor Accountability and Transparency Harm Medicaid Patients and Independent Pharmacies (state=OR; organization=Oregon Secretary of State; publication_date=2023-08-01)

- [Report 7] An Audit Report on Blue Cross Blue Shield of Texas, a Managed Care Organization (state=TX; organization=State Auditor’s Office; publication_date=2021-06-25). Source line: [Report 7] An Audit Report on Blue Cross Blue Shield of Texas, a Managed Care Organization (state=TX; organization=State Auditor’s Office; publication_date=2021-06-25)

- [Report 6] An Audit Report on Medicaid Managed Care Contract Processes at the Health and Human Services Commission (state=TX; organization=State Auditor’s Office; publication_date=2019-01-01). Source line: [Report 6] An Audit Report on Medicaid Managed Care Contract Processes at the Health and Human Services Commission (state=TX; organization=State Auditor’s Office; publication_date=2019-01-01)
