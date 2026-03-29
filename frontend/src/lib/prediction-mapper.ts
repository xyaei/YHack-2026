import type { Confidence, Effort, Prediction, PredictionDetail } from '@/data/mocks'
import type { ApiPrediction } from '@/lib/api'

export const LIVE_PREDICTION_ID = 1

function mapConfidence(c: string): Confidence {
  const x = c.toLowerCase()
  if (x === 'high') return 'High'
  if (x === 'medium') return 'Medium'
  return 'Low'
}

function tripleRequirements(reqs: string[]): [string, string, string] {
  const a = reqs[0] ?? '—'
  const b = reqs[1] ?? reqs[0] ?? '—'
  const c = reqs[2] ?? reqs[1] ?? reqs[0] ?? '—'
  return [a, b, c]
}

export function apiPredictionToUi(pred: ApiPrediction, id = LIVE_PREDICTION_ID): Prediction {
  return {
    id,
    topic: pred.topic,
    jurisdictions: pred.jurisdiction.includes(',')
      ? pred.jurisdiction.split(',').map((s) => s.trim()).filter(Boolean)
      : [pred.jurisdiction],
    prob6mo: pred.probability_6mo,
    prob12mo: pred.probability_12mo,
    prob24mo: pred.probability_24mo,
    confidence: mapConfidence(pred.confidence),
    requirements: tripleRequirements(pred.likely_requirements),
  }
}

function findSourceUrl(signalId: string, signals: Record<string, unknown>[]): string {
  const needle = signalId.toLowerCase()
  // Exact match first
  for (const s of signals) {
    if (typeof s.title === 'string' && s.title.toLowerCase() === needle) {
      return s.source_url as string
    }
  }
  // Substring match: signal title contains the id or vice versa
  for (const s of signals) {
    if (typeof s.title === 'string') {
      const hay = s.title.toLowerCase()
      if (hay.includes(needle) || needle.includes(hay)) {
        return s.source_url as string
      }
    }
  }
  return '#'
}

export function apiPredictionToDetail(
  pred: ApiPrediction,
  signals: Record<string, unknown>[] = [],
  predictionId: number = LIVE_PREDICTION_ID,
): PredictionDetail {
  return {
    predictionId,
    k2Reasoning: pred.reasoning,
    signals: pred.key_signals.map((ks) => ({
      title: ks.signal_id,
      summary: ks.rationale,
      sourceUrl: findSourceUrl(ks.signal_id, signals),
      weight: ks.weight.toFixed(2),
    })),
    counterfactors: pred.counterfactors,
    prepActions: pred.recommended_preparation.map((title, i) => ({
      step: i + 1,
      title,
      effort: 'Med' as Effort,
    })),
  }
}

export function priorityActionsFromReport(
  actions: { priority: string; action: string; deadline: string; effort: string }[],
): { label: string; level: 'High' | 'Med' | 'Low' }[] {
  return actions.map((a) => ({
    label: a.action,
    level:
      a.priority.toLowerCase() === 'high'
        ? 'High'
        : a.priority.toLowerCase() === 'low'
          ? 'Low'
          : 'Med',
  }))
}
