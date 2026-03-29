export type Confidence = 'High' | 'Medium' | 'Low'
export type Priority = 'High' | 'Med' | 'Low'
export type Effort = 'Low' | 'Med' | 'High'

/** Mirrors backend `CompanyProfile` (Pydantic) */
export type LegalStructure = 'LLC' | 'C-Corp' | 'S-Corp' | 'Sole Proprietorship' | 'Partnership' | 'Nonprofit'

export const LEGAL_STRUCTURES: LegalStructure[] = [
  'LLC',
  'C-Corp',
  'S-Corp',
  'Sole Proprietorship',
  'Partnership',
  'Nonprofit',
]

export const REVENUE_RANGES = ['<$1M', '$1M-$10M', '$10M-$50M', '$50M+'] as const
export const FUNDING_STAGES = ['Bootstrapped', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Public'] as const
export const CERTIFICATION_OPTIONS = ['HIPAA', 'SOC2', 'ISO27001', 'PCI-DSS'] as const
export const INDUSTRY_OPTIONS = ['Healthcare SaaS', 'FinTech', 'EdTech', 'Manufacturing', 'Retail', 'Other'] as const

export interface Company {
  name: string
  legal_structure: LegalStructure
  industry: string
  size: number
  revenue_range: string | null
  location: string
  operating_states: string[]
  operating_countries: string[]
  description: string
  handles_pii: boolean
  handles_phi: boolean
  handles_financial_data: boolean
  uses_ai_ml: boolean
  b2b: boolean
  customer_count: number | null
  certifications: string[]
  has_legal_counsel: boolean
  has_compliance_team: boolean
  funding_stage: string | null
  is_public: boolean
}

export interface Prediction {
  id: number
  topic: string
  jurisdictions: string[]
  prob6mo: number
  prob12mo: number
  prob24mo: number
  confidence: Confidence
  requirements: [string, string, string]
}

export interface SignalCard {
  title: string
  summary: string
  sourceUrl: string
  weight: string
}

export interface PrepAction {
  step: number
  title: string
  effort: Effort
}

export interface PredictionDetail {
  predictionId: number
  k2Reasoning: string
  signals: SignalCard[]
  counterfactors: string[]
  prepActions: PrepAction[]
}

export interface AlertItem {
  id: string
  priority: Priority
  title: string
  description: string
  deadline: string
  effort: Effort
}

export const defaultCompany: Company = {
  name: 'DemoHealth AI',
  legal_structure: 'LLC',
  industry: 'Healthcare SaaS',
  size: 50,
  revenue_range: '$1M-$10M',
  location: 'San Francisco, CA',
  operating_states: ['CA', 'NY', 'TX', 'FL'],
  operating_countries: ['US'],
  description:
    'We build AI-assisted clinical software for care teams, with HIPAA-aligned workflows across CA, NY, TX, and FL.',
  handles_pii: true,
  handles_phi: true,
  handles_financial_data: false,
  uses_ai_ml: true,
  b2b: true,
  customer_count: null,
  certifications: ['HIPAA'],
  has_legal_counsel: true,
  has_compliance_team: true,
  funding_stage: 'Series A',
  is_public: false,
}

export const mocks = {
  company: defaultCompany,
  predictions: [
    {
      id: 1,
      topic: 'State Health Data Privacy',
      jurisdictions: ['CA', 'NY'],
      prob6mo: 0.58,
      prob12mo: 0.72,
      prob24mo: 0.81,
      confidence: 'High' as Confidence,
      requirements: [
        'Consumer consent for PHI in secondary use',
        'Data minimization for model training sets',
        'Breach notification aligned to state windows',
      ],
    },
    {
      id: 2,
      topic: 'AI Transparency for Clinical Decision Support',
      jurisdictions: ['Federal', 'TX'],
      prob6mo: 0.45,
      prob12mo: 0.63,
      prob24mo: 0.77,
      confidence: 'High' as Confidence,
      requirements: [
        'Model cards for CDS endpoints',
        'Human-in-the-loop documentation',
        'Adverse event logging for AI-assisted outcomes',
      ],
    },
    {
      id: 3,
      topic: 'Cross-Border PHI Transfers',
      jurisdictions: ['FL', 'NY'],
      prob6mo: 0.52,
      prob12mo: 0.66,
      prob24mo: 0.74,
      confidence: 'Medium' as Confidence,
      requirements: [
        'SCC-style clauses for subprocessors',
        'Jurisdictional residency controls',
        'Audit trails for export requests',
      ],
    },
    {
      id: 4,
      topic: 'Vendor Risk & BAAs',
      jurisdictions: ['CA', 'TX'],
      prob6mo: 0.61,
      prob12mo: 0.7,
      prob24mo: 0.79,
      confidence: 'High' as Confidence,
      requirements: [
        'Annual vendor attestations',
        'Subprocessor registry with 30-day notice',
        'Right-to-audit for high-risk vendors',
      ],
    },
    {
      id: 5,
      topic: 'Algorithmic Fairness in Coverage',
      jurisdictions: ['Federal', 'CA'],
      prob6mo: 0.38,
      prob12mo: 0.55,
      prob24mo: 0.68,
      confidence: 'Medium' as Confidence,
      requirements: [
        'Disparate impact testing cadence',
        'Appeal pathways for automated denials',
        'Documentation of training data representativeness',
      ],
    },
  ] satisfies Prediction[],

  predictionDetails: {
    1: {
      predictionId: 1,
      k2Reasoning:
        'Signals from CA and NY rulemaking show converging emphasis on consumer-directed consent for secondary uses of health data. Recent draft bills reference alignment with CPRA-style rights while carving clinical treatment. Enforcement chatter in public workshops suggests a 12–18 month window for material obligations. K2 cross-references Hermes action items on policy refresh and Hex vendor inventory to prioritize consent UX and subprocessors. The trajectory is reinforced by insurer pressure on covered entities to demonstrate lineage for analytics.',
      signals: [
        {
          title: 'NY SHIELD workshop notes',
          summary: 'Regulators emphasized opt-in framing for non-treatment analytics.',
          sourceUrl: 'https://example.com/mock/ny-shield',
          weight: '0.32',
        },
        {
          title: 'CA AG stakeholder letter',
          summary: 'Requests clarity on de-identification for ML feature stores.',
          sourceUrl: 'https://example.com/mock/ca-ag',
          weight: '0.28',
        },
        {
          title: 'Industry coalition comment',
          summary: 'Unified ask for 12-month compliance runway post-final rule.',
          sourceUrl: 'https://example.com/mock/coalition',
          weight: '0.21',
        },
        {
          title: 'Peer benchmarking (Hex)',
          summary: 'Top quartile peers updated consent flows within 2 quarters.',
          sourceUrl: 'https://example.com/mock/hex-bench',
          weight: '0.19',
        },
      ],
      counterfactors: [
        'Federal preemption debates could stall state innovation.',
        'Clinical TPO carveouts may limit scope for some workflows.',
        'Vendor ecosystem readiness could extend effective dates.',
      ],
      prepActions: [
        { step: 1, title: 'Inventory PHI flows by purpose', effort: 'Med' },
        { step: 2, title: 'Redline privacy notice & consent UX', effort: 'High' },
        { step: 3, title: 'Pilot subprocessors registry', effort: 'Low' },
      ],
    },
    2: {
      predictionId: 2,
      k2Reasoning:
        'Federal CDS guidance and Texas parity bills elevate documentation for AI-assisted recommendations. Hermes signals show uptick in payer audits requesting model lineage. K2 weights recent FDA discussion papers and state insurance filings. The 12-month probability reflects comment periods closing in the next two quarters with staggered effective dates for different facility types.',
      signals: [
        {
          title: 'FDA CDS discussion paper',
          summary: 'Expectations for explainability layers on high-risk pathways.',
          sourceUrl: 'https://example.com/mock/fda-cds',
          weight: '0.34',
        },
        {
          title: 'TX DOI bulletin',
          summary: 'Clarifies documentation for algorithmic prior auth.',
          sourceUrl: 'https://example.com/mock/tx-doi',
          weight: '0.27',
        },
        {
          title: 'Peer incidents (MongoDB logs)',
          summary: 'Two near-misses tied to stale model cards.',
          sourceUrl: 'https://example.com/mock/mongo-signals',
          weight: '0.22',
        },
        {
          title: 'K2 policy cluster',
          summary: 'Cluster #14 shows bipartisan support for transparency riders.',
          sourceUrl: 'https://example.com/mock/k2-cluster',
          weight: '0.17',
        },
      ],
      counterfactors: [
        'Safe harbor for narrow CDS tools may shrink scope.',
        'Resource constraints at smaller hospitals could delay adoption.',
      ],
      prepActions: [
        { step: 1, title: 'Publish model cards for CDS endpoints', effort: 'High' },
        { step: 2, title: 'Wire adverse event logging', effort: 'Med' },
        { step: 3, title: 'Train clinical reviewers on override flows', effort: 'Low' },
      ],
    },
    3: {
      predictionId: 3,
      k2Reasoning:
        'Cross-border data flows face friction from NY and FL contract standards. K2 synthesizes procurement templates and recent enforcement letters emphasizing residency controls. MongoDB telemetry shows rising export tickets tied to analytics sandboxes. The model assigns higher weight to contractual remedies than statutory penalties in the near term.',
      signals: [
        {
          title: 'FL procurement addendum',
          summary: 'Requires in-region failover for PHI-adjacent workloads.',
          sourceUrl: 'https://example.com/mock/fl-procurement',
          weight: '0.31',
        },
        {
          title: 'NY DFS cyber letter',
          summary: 'Highlights vendor geography in third-party risk exams.',
          sourceUrl: 'https://example.com/mock/ny-dfs',
          weight: '0.29',
        },
        {
          title: 'Hermes playbooks',
          summary: 'Two clients completed SCC refresh in Q4.',
          sourceUrl: 'https://example.com/mock/hermes',
          weight: '0.22',
        },
        {
          title: 'Hex peer network',
          summary: 'Median time to subprocessors notice: 26 days.',
          sourceUrl: 'https://example.com/mock/hex-network',
          weight: '0.18',
        },
      ],
      counterfactors: [
        'Cloud regions expansion could simplify compliance.',
        'Federal cloud guidance may harmonize some controls.',
      ],
      prepActions: [
        { step: 1, title: 'Map data residency by workload', effort: 'Med' },
        { step: 2, title: 'Template SCCs for top 10 vendors', effort: 'High' },
        { step: 3, title: 'Automate export request audit trail', effort: 'Med' },
      ],
    },
    4: {
      predictionId: 4,
      k2Reasoning:
        'Business associate oversight is tightening with CA and TX contract riders. K2 sees correlated upticks in audit rights and breach notification timelines. Hermes backlog shows vendor risk reviews outpacing policy updates—signal for proactive BAA refresh cycles.',
      signals: [
        {
          title: 'TX HB-style vendor addenda',
          summary: 'New audit frequency clauses for high-risk vendors.',
          sourceUrl: 'https://example.com/mock/tx-hb',
          weight: '0.33',
        },
        {
          title: 'CA OCR-adjacent guidance',
          summary: 'Emphasis on subprocessors list accuracy.',
          sourceUrl: 'https://example.com/mock/ca-ocr',
          weight: '0.3',
        },
        {
          title: 'MongoDB change streams',
          summary: 'Spike in BAA amendment tickets post-renewals.',
          sourceUrl: 'https://example.com/mock/mongo-streams',
          weight: '0.21',
        },
        {
          title: 'K2 vendor cluster',
          summary: 'Cluster #9 correlates with SOC2 exceptions.',
          sourceUrl: 'https://example.com/mock/k2-vendor',
          weight: '0.16',
        },
      ],
      counterfactors: [
        'Standardized BAA templates may reduce negotiation drag.',
        'Insurance market softness could delay vendor churn.',
      ],
      prepActions: [
        { step: 1, title: 'Tier vendors by PHI exposure', effort: 'Low' },
        { step: 2, title: 'Annual attestations workflow', effort: 'Med' },
        { step: 3, title: 'Right-to-audit playbook', effort: 'High' },
      ],
    },
    5: {
      predictionId: 5,
      k2Reasoning:
        'Fairness expectations in automated coverage decisions are rising with federal attention and CA rulemaking echoes. K2 blends civil rights complaints data with payer tech investments in appeals tooling. Probability is moderated by long comment periods and industry push for safe harbors.',
      signals: [
        {
          title: 'Federal parity inquiry',
          summary: 'Requests data on disparate impact in prior auth.',
          sourceUrl: 'https://example.com/mock/federal-parity',
          weight: '0.3',
        },
        {
          title: 'CA stakeholder sessions',
          summary: 'Discussed annual bias testing for coverage models.',
          sourceUrl: 'https://example.com/mock/ca-fairness',
          weight: '0.28',
        },
        {
          title: 'Hermes complaints index',
          summary: 'Uptick in appeals citing model opacity.',
          sourceUrl: 'https://example.com/mock/hermes-complaints',
          weight: '0.23',
        },
        {
          title: 'Hex benchmark',
          summary: 'Leaders publish disparate impact summaries quarterly.',
          sourceUrl: 'https://example.com/mock/hex-fairness',
          weight: '0.19',
        },
      ],
      counterfactors: [
        'Legal challenges may delay enforcement.',
        'Narrow product scope could exempt some workflows.',
      ],
      prepActions: [
        { step: 1, title: 'Define fairness metrics per product', effort: 'High' },
        { step: 2, title: 'Appeals workflow for automated denials', effort: 'Med' },
        { step: 3, title: 'Document training cohorts', effort: 'Low' },
      ],
    },
  } satisfies Record<number, PredictionDetail>,

  alerts: [
    {
      id: 'a1',
      priority: 'High',
      title: 'Update Privacy Policy',
      description: 'Align consumer-facing language with anticipated consent requirements.',
      deadline: '90 days',
      effort: 'High',
    },
    {
      id: 'a2',
      priority: 'High',
      title: 'Vendor BAA Refresh',
      description: 'Renew BAAs with audit rights and subprocessors clauses.',
      deadline: '60 days',
      effort: 'Med',
    },
    {
      id: 'a3',
      priority: 'High',
      title: 'Model Cards for CDS',
      description: 'Publish documentation for clinical decision support endpoints.',
      deadline: '120 days',
      effort: 'High',
    },
    {
      id: 'a4',
      priority: 'Med',
      title: 'Subprocessor Registry',
      description: 'Centralize vendors with 30-day change notifications.',
      deadline: '45 days',
      effort: 'Med',
    },
    {
      id: 'a5',
      priority: 'Med',
      title: 'Export Request Audit Trail',
      description: 'Ensure MongoDB-backed logs capture cross-border transfers.',
      deadline: '30 days',
      effort: 'Low',
    },
    {
      id: 'a6',
      priority: 'Med',
      title: 'Fairness Testing Cadence',
      description: 'Quarterly disparate impact review for coverage models.',
      deadline: '75 days',
      effort: 'Med',
    },
    {
      id: 'a7',
      priority: 'Low',
      title: 'Staff HIPAA Refresh',
      description: 'Annual training with AI module.',
      deadline: '180 days',
      effort: 'Low',
    },
    {
      id: 'a8',
      priority: 'Low',
      title: 'Incident Runbook Update',
      description: 'Align breach timelines with strictest state windows.',
      deadline: '45 days',
      effort: 'Low',
    },
  ] satisfies AlertItem[],
}
