import * as React from 'react'
import { defaultCompany, mocks, type Company } from '@/data/mocks'

export type AppView = 'dashboard' | 'rag' | 'setup'

type ForseenContextValue = {
  company: Company
  setCompany: (c: Company) => void
  activeView: AppView
  setActiveView: (v: AppView) => void
  drillPredictionId: number | null
  setDrillPredictionId: (id: number | null) => void
  loading: boolean
  setLoading: (v: boolean) => void
  refreshMocks: () => void
  alertDone: Record<string, boolean>
  toggleAlertDone: (id: string) => void
  markAllAlertsDone: () => void
  priorityActionsChecked: Record<number, boolean>
  togglePriorityAction: (index: number) => void
}

const ForseenContext = React.createContext<ForseenContextValue | null>(null)

export function ForseenProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = React.useState<Company>({ ...defaultCompany })
  const [activeView, setActiveView] = React.useState<AppView>('setup')
  const [drillPredictionId, setDrillPredictionId] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [alertDone, setAlertDone] = React.useState<Record<string, boolean>>({})
  const [priorityActionsChecked, setPriorityActionsChecked] = React.useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  })

  const refreshMocks = React.useCallback(() => {
    setLoading(true)
    window.setTimeout(() => {
      setCompany({ ...defaultCompany })
      setAlertDone({})
      setPriorityActionsChecked({ 0: false, 1: false, 2: false })
      setLoading(false)
    }, 900)
  }, [])

  const toggleAlertDone = React.useCallback((id: string) => {
    setAlertDone((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const markAllAlertsDone = React.useCallback(() => {
    const next: Record<string, boolean> = {}
    for (const a of mocks.alerts) next[a.id] = true
    setAlertDone(next)
  }, [])

  const togglePriorityAction = React.useCallback((index: number) => {
    setPriorityActionsChecked((prev) => ({ ...prev, [index]: !prev[index] }))
  }, [])

  const value = React.useMemo(
    () => ({
      company,
      setCompany,
      activeView,
      setActiveView,
      drillPredictionId,
      setDrillPredictionId,
      loading,
      setLoading,
      refreshMocks,
      alertDone,
      toggleAlertDone,
      markAllAlertsDone,
      priorityActionsChecked,
      togglePriorityAction,
    }),
    [
      company,
      activeView,
      drillPredictionId,
      loading,
      refreshMocks,
      alertDone,
      toggleAlertDone,
      markAllAlertsDone,
      priorityActionsChecked,
      togglePriorityAction,
    ],
  )

  return <ForseenContext.Provider value={value}>{children}</ForseenContext.Provider>
}

export function useForseen() {
  const ctx = React.useContext(ForseenContext)
  if (!ctx) throw new Error('useForseen must be used within ForseenProvider')
  return ctx
}
