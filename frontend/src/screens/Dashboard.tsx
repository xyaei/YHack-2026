import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ProbabilityGauge } from '@/components/ProbabilityGauge'
import { IconArrowRight, IconChevronDown } from '@/components/icons'
import { cn } from '@/lib/utils'
import { sortStateCodes } from '@/lib/us-states'
import { useForseen } from '@/store/forseen-context'

function formatOperatingStatesForProfile(states: string[]) {
  const n = states.length
  if (n === 0) return 'No operating states listed'
  if (n > 5) return `${n} operating state${n === 1 ? '' : 's'}`
  return sortStateCodes(states).join(', ')
}

function confidenceVariant(c: string): 'success' | 'secondary' | 'outline' {
  if (c === 'High') return 'success'
  if (c === 'Medium') return 'secondary'
  return 'outline'
}

function MockSourcesCaption() {
  const icon = 'h-3.5 w-3.5 shrink-0 object-contain'
  return (
    <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs leading-relaxed text-neutral-500">
      <span className="inline-flex items-center gap-1">
        <img src="/logo-mongodb.png" alt="" width={14} height={14} className={icon} draggable={false} />
        MongoDB
      </span>
      <span className="text-neutral-400">/</span>
      <span className="inline-flex items-center gap-1">
        <img src="/k2v2-2.png" alt="" width={14} height={14} className={icon} draggable={false} />
        K2 Think v2
      </span>
      <span className="text-neutral-400">/</span>
      <span className="inline-flex items-center gap-1">
        <img src="/logo-hermes.png" alt="" width={14} height={14} className={cn(icon, 'rounded-sm')} draggable={false} />
        Hermes
      </span>
    </p>
  )
}

export function Dashboard() {
  const {
    company,
    setDrillPredictionId,
    setActiveView,
    priorityActionsChecked,
    togglePriorityAction,
    displayPredictions,
    signalsTrackedCount,
    priorityRows,
    lastAnalyze,
  } = useForseen()
  const [expanded, setExpanded] = React.useState(true)
  const [priorityExpanded, setPriorityExpanded] = React.useState(true)
  const [predictionOpen, setPredictionOpen] = React.useState<Set<number>>(() => new Set())
  React.useEffect(() => {
    setPredictionOpen(new Set(displayPredictions.map((p) => p.id)))
  }, [displayPredictions])

  const togglePrediction = (id: number) => {
    setPredictionOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <motion.section
        layout
        className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-[color:var(--color-elevated)] shadow-none"
      >
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-neutral-50/80 md:p-6"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-light uppercase tracking-wider text-neutral-500">Company profile</p>
            <h1 className="text-xl font-light tracking-tight text-neutral-800">{company.name}</h1>
            <p className="text-sm text-neutral-600">
              {company.industry} · {company.size} employees ·{' '}
              {formatOperatingStatesForProfile(company.operating_states)}
            </p>
            {company.description.trim() ? (
              <p className="text-sm leading-snug text-neutral-700">{company.description.trim()}</p>
            ) : null}
          </div>
          <IconChevronDown
            className={cn('mt-1 size-5 shrink-0 text-neutral-400 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="border-t border-neutral-200/60"
            >
              <div className="space-y-3 p-5 pt-3 md:p-6 md:pt-4">
                <p className="text-sm text-neutral-600">
                  {company.legal_structure} · HQ {company.location}
                  {company.revenue_range ? ` · ${company.revenue_range}` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.certifications.map((c) => (
                    <Badge key={c} variant="outline" className="font-normal">
                      {c}
                    </Badge>
                  ))}
                  {company.handles_phi && (
                    <Badge variant="secondary" className="font-normal">
                      PHI
                    </Badge>
                  )}
                  {company.handles_pii && (
                    <Badge variant="secondary" className="font-normal">
                      PII
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-neutral-600">
                  AI/ML: {company.uses_ai_ml ? 'Yes' : 'No'} · {company.b2b ? 'B2B' : 'B2C'}
                  {company.funding_stage ? ` · ${company.funding_stage}` : ''}
                  {company.is_public ? ' · Public' : ''}
                </p>
                <Button variant="accent" size="sm" onClick={() => setActiveView('setup')}>
                  Edit in Setup
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <Card className="border-neutral-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-light text-neutral-500">Signals tracked</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-light tabular-nums">{signalsTrackedCount}</p>
          <MockSourcesCaption />
          {!lastAnalyze && (
            <p className="mt-2 text-xs text-neutral-400">Demo count — run analysis in Setup for live signals</p>
          )}
        </CardContent>
      </Card>

      <motion.section
        layout
        className="overflow-hidden rounded-3xl border border-neutral-200/70 bg-[color:var(--color-elevated)] shadow-none"
      >
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-neutral-50/80 md:p-6"
          onClick={() => setPriorityExpanded((e) => !e)}
        >
          <div className="min-w-0 space-y-1">
            <p className="text-base font-medium text-neutral-800">Priority actions</p>
            <p className="text-sm text-neutral-500">Hermes generated tasks for the next sprint</p>
          </div>
          <IconChevronDown
            className={cn('mt-1 size-5 shrink-0 text-neutral-400 transition-transform', priorityExpanded && 'rotate-180')}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {priorityExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="border-t border-neutral-200/60"
            >
              <div className="space-y-3 p-5 pt-3 md:p-6 md:pt-4">
                {priorityRows.map((a, i) => (
                  <label
                    key={a.label}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200/60 bg-[color:var(--color-muted-surface)] p-4 transition-colors hover:bg-neutral-100/80"
                  >
                    <Checkbox checked={!!priorityActionsChecked[i]} onCheckedChange={() => togglePriorityAction(i)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-light">{a.label}</span>
                        <Badge variant={a.level === 'High' ? 'default' : 'secondary'} className="text-[10px]">
                          {a.level}
                        </Badge>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <Card className="border-neutral-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-light tracking-tight">Predictions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-neutral-200" role="list">
            {displayPredictions.map((p) => {
              const isOpen = predictionOpen.has(p.id)
              return (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 md:p-5"
              >
                <div className="flex flex-col">
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full items-start justify-between gap-3 rounded-xl p-1 text-left transition-colors hover:bg-neutral-50/80 cursor-pointer"
                    onClick={() => togglePrediction(p.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePrediction(p.id) } }}
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="text-base font-light leading-snug text-neutral-800">{p.topic}</h3>
                      <div className="flex flex-wrap gap-1">
                        {p.jurisdictions.slice(0, 2).map((j) => (
                          <Badge key={j} variant="secondary" className="text-[10px]">
                            {j}
                          </Badge>
                        ))}
                        {p.jurisdictions.length > 2 && (
                          <Badge variant="muted" className="text-[10px]">
                            +{p.jurisdictions.length - 2}
                          </Badge>
                        )}
                      </div>
                      {!isOpen && (
                        <p className="text-sm tabular-nums text-neutral-600">
                          12-month probability · {Math.round(p.prob12mo * 100)}%
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="accent" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); setDrillPredictionId(p.id) }}>
                        View reasoning
                        <IconArrowRight className="size-3.5" aria-hidden />
                      </Button>
                      <IconChevronDown
                        className={cn('size-5 shrink-0 text-neutral-400 transition-transform', isOpen && 'rotate-180')}
                        aria-hidden
                      />
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 flex flex-col gap-4 border-t border-neutral-100 pt-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-8">
                            <div className="min-w-0 flex-1 space-y-3">
                              <ProbabilityGauge value={p.prob12mo} />
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-neutral-500">Confidence</span>
                                <Badge variant={confidenceVariant(p.confidence)}>{p.confidence}</Badge>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 border-t border-neutral-100 pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                              <p className="mb-2 text-xs font-light uppercase tracking-wide text-neutral-500">Likely requirements</p>
                              <ul className="space-y-1.5 text-sm text-neutral-700">
                                {p.requirements.map((r) => (
                                  <li key={r} className="flex gap-2">
                                    <span className="mt-1.5 size-1.5 shrink-0 bg-[color:var(--color-accent)]" aria-hidden />
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

    </div>
  )
}
