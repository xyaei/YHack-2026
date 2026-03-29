import type { Company } from '@/data/mocks'

const DEFAULT_BASE = 'http://localhost:8000'

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (raw != null && raw.trim() !== '') return raw.replace(/\/$/, '')
  return DEFAULT_BASE
}

export type ApiChatMessage = { role: string; content: string }

export type ApiPrediction = {
  topic: string
  jurisdiction: string
  probability_6mo: number
  probability_12mo: number
  probability_24mo: number
  confidence: string
  likely_requirements: string[]
  reasoning: string
  key_signals: { signal_id: string; weight: number; rationale: string }[]
  counterfactors: string[]
  recommended_preparation: string[]
}

export type ApiReport = {
  headline: string
  executive_summary: string
  priority_actions: { priority: string; action: string; deadline: string; effort: string }[]
  predictions_used: string[]
}

export type AnalyzeResponse = {
  signals: Record<string, unknown>[]
  signals_used: number
  predictions: ApiPrediction[]
  report: ApiReport
}

function companyPayload(company: Company): Record<string, unknown> {
  return {
    name: company.name,
    legal_structure: company.legal_structure,
    industry: company.industry,
    size: company.size,
    revenue_range: company.revenue_range,
    location: company.location,
    operating_states: company.operating_states,
    operating_countries: company.operating_countries,
    description: company.description,
    handles_pii: company.handles_pii,
    handles_phi: company.handles_phi,
    handles_financial_data: company.handles_financial_data,
    uses_ai_ml: company.uses_ai_ml,
    b2b: company.b2b,
    customer_count: company.customer_count,
    certifications: company.certifications,
    has_legal_counsel: company.has_legal_counsel,
    has_compliance_team: company.has_compliance_team,
    funding_stage: company.funding_stage,
    is_public: company.is_public,
  }
}

export async function postAnalyze(
  company: Company,
  topic: string,
  jurisdiction: string,
  signalLimit = 20,
): Promise<AnalyzeResponse> {
  const base = getApiBaseUrl()
  const res = await fetch(`${base}/analyze/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company: companyPayload(company),
      topic: topic.trim(),
      jurisdiction: jurisdiction.trim(),
      signal_limit: signalLimit,
    }),
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = text
    try {
      const j = JSON.parse(text) as { detail?: unknown }
      if (j.detail != null) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
    } catch {
      /* use raw text */
    }
    throw new Error(detail || `Analyze failed (${res.status})`)
  }
  return JSON.parse(text) as AnalyzeResponse
}

export async function postChat(body: {
  message: string
  history: ApiChatMessage[]
  signals?: Record<string, unknown>[] | null
  predictions?: Record<string, unknown>[] | null
  company_context?: string | null
}): Promise<{ reply: string }> {
  const base = getApiBaseUrl()
  const res = await fetch(`${base}/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: body.message,
      history: body.history,
      signals: body.signals ?? undefined,
      predictions: body.predictions ?? undefined,
      company_context: body.company_context ?? undefined,
    }),
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = text
    try {
      const j = JSON.parse(text) as { detail?: unknown }
      if (j.detail != null) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
    } catch {
      /* use raw text */
    }
    throw new Error(detail || `Chat failed (${res.status})`)
  }
  return JSON.parse(text) as { reply: string }
}

export function buildCompanyContext(company: Company): string {
  const parts = [
    company.name,
    company.industry,
    company.description?.trim(),
    `${company.legal_structure} · ${company.location}`,
    company.operating_states?.length ? `States: ${company.operating_states.join(', ')}` : '',
    company.handles_phi ? 'Handles PHI' : '',
    company.certifications?.length ? `Certifications: ${company.certifications.join(', ')}` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}
