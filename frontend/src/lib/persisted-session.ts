import type { Company } from '@/data/mocks'
import type { AnalyzeResponse } from '@/lib/api'

/** Matches `AppView` in forseen-context (avoid circular imports) */
export type PersistedAppView = 'dashboard' | 'rag' | 'setup' | 'analysis'

/** Bump when persisted shape changes; see loadPersistedSession for migrations. */
const PERSISTED_SESSION_VERSION = 3
/** RAG history is versioned independently so main session bumps do not wipe chat. */
const RAG_STORAGE_VERSION = 1
const SESSION_KEY = 'forseen.session.v1'
const RAG_KEY = 'forseen.rag.v1'

export type RagMessage = { role: 'user' | 'assistant'; text: string }

export type PersistedSession = {
  company: Company
  activeView: PersistedAppView
  drillPredictionId: number | null
  alertDone: Record<string, boolean>
  priorityActionsChecked: Record<number, boolean>
  riskTopic: string
  riskJurisdiction: string
  lastAnalyze: AnalyzeResponse | null
}

function safeParse<T>(raw: string | null): T | null {
  if (raw == null || raw === '') return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function loadPersistedSession(): Partial<PersistedSession> | null {
  if (typeof window === 'undefined') return null
  const parsed = safeParse<{ v: number; data: PersistedSession }>(localStorage.getItem(SESSION_KEY))
  if (!parsed?.data) return null

  if (parsed.v === 1) {
    const data: PersistedSession = { ...parsed.data }
    // Former default was example copy "San Francisco, CA" — empty so placeholder shows (re-enter if real HQ).
    if (data.company.location?.trim() === 'San Francisco, CA') {
      data.company = { ...data.company, location: '' }
    }
    if (data.riskTopic?.trim() === 'State health data privacy') {
      data.riskTopic = ''
    }
    savePersistedSession(data)
    return data
  }

  if (parsed.v === 2) {
    const data: PersistedSession = { ...parsed.data }
    // Former default topic was example copy — show placeholder instead (re-enter if that was your real topic).
    if (data.riskTopic?.trim() === 'State health data privacy') {
      data.riskTopic = ''
    }
    savePersistedSession(data)
    return data
  }

  if (parsed.v !== PERSISTED_SESSION_VERSION) return null
  return parsed.data
}

export function savePersistedSession(data: PersistedSession): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ v: PERSISTED_SESSION_VERSION, data }))
  } catch {
    /* quota / private mode */
  }
}

export function loadRagMessages(): RagMessage[] {
  if (typeof window === 'undefined') return []
  const parsed = safeParse<{ v: number; messages: RagMessage[] }>(localStorage.getItem(RAG_KEY))
  if (!parsed || parsed.v !== RAG_STORAGE_VERSION || !Array.isArray(parsed.messages)) return []
  return parsed.messages
}

export function saveRagMessages(messages: RagMessage[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RAG_KEY, JSON.stringify({ v: RAG_STORAGE_VERSION, messages }))
  } catch {
    /* quota */
  }
}

export function clearAllPersistedForseen(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(RAG_KEY)
}
