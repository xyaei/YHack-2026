import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useForseen } from '@/store/forseen-context'
import { IconArrowRight } from '@/components/icons'

type AnalysisPhase = 'config' | 'retrieving' | 'predicting' | 'generating' | 'complete'

function JurisdictionBadge({ jurisdiction }: { jurisdiction: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[color:var(--color-accent-muted)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-accent)]">
      {jurisdiction}
    </span>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('rounded-full border-2 border-current/30 border-t-current', className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  )
}

function ModelBadge({
  name,
  status = 'idle'
}: {
  name: string
  status?: 'idle' | 'loading' | 'complete'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
        status === 'complete' && 'bg-emerald-100 text-emerald-700',
        status === 'loading' && 'bg-amber-100 text-amber-700',
        status === 'idle' && 'bg-neutral-100 text-neutral-500'
      )}
    >
      {status === 'loading' && <LoadingSpinner className="size-3" />}
      {status === 'complete' && (
        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {name}
    </span>
  )
}

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, '').trim()
}

function SignalCard({ signal, delay = 0 }: { signal: Record<string, unknown>; delay?: number }) {
  const title = stripHtml((signal.title as string) || (signal.name as string) || 'Untitled Document')
  const summary = stripHtml((signal.summary as string) || (signal.content as string) || 'No summary available')
  const sourceUrl = signal.source_url as string | undefined
  const jurisdiction = (signal.jurisdiction as string) || 'Federal'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="border-neutral-200/60 bg-[color:var(--color-elevated)] transition-shadow hover:shadow-md h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-medium text-neutral-800 line-clamp-2">{title}</h3>
            <JurisdictionBadge jurisdiction={jurisdiction} />
          </div>
          <p className="text-xs text-neutral-500 line-clamp-3 mb-3">{summary}</p>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[color:var(--color-accent)] hover:underline"
            >
              View source
            </a>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StreamingTimelineStep({
  model,
  title,
  description,
  output,
  status = 'idle',
  isLast = false,
}: {
  model: string
  title: string
  description: string
  output?: string
  status?: 'idle' | 'loading' | 'complete'
  isLast?: boolean
}) {
  return (
    <div className="relative">
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute -left-[29px] top-1 flex size-4 items-center justify-center rounded-full transition-colors',
          status === 'complete' && 'bg-[color:var(--color-accent)]',
          status === 'loading' && 'bg-amber-500',
          status === 'idle' && 'bg-neutral-300'
        )}
      >
        {status === 'loading' ? (
          <LoadingSpinner className="size-2.5 text-white" />
        ) : (
          <div className="size-2 rounded-full bg-white" />
        )}
      </div>

      {/* Connecting line */}
      {!isLast && (
        <div
          className={cn(
            'absolute -left-[22px] top-5 h-full w-0.5 transition-colors',
            status === 'complete' ? 'bg-[color:var(--color-accent)]' : 'bg-neutral-200'
          )}
        />
      )}

      <div className="pb-8">
        <div className="flex items-center gap-2 mb-2">
          <ModelBadge name={model} status={status} />
          <h3 className={cn(
            'text-sm font-medium transition-colors',
            status === 'idle' ? 'text-neutral-400' : 'text-neutral-800'
          )}>
            {title}
          </h3>
        </div>
        <p className={cn(
          'text-xs mb-2 transition-colors',
          status === 'idle' ? 'text-neutral-400' : 'text-neutral-500'
        )}>
          {description}
        </p>
        <AnimatePresence>
          {output && status === 'complete' && (
            <motion.div
              className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 border border-neutral-100"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <p className="line-clamp-3">{output}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ProbabilityCard({
  period,
  probability,
  delay = 0,
}: {
  period: string
  probability: number
  delay?: number
}) {
  const percentage = Math.round(probability * 100)
  const colorClass =
    percentage >= 70
      ? 'text-red-600'
      : percentage >= 40
        ? 'text-amber-600'
        : 'text-emerald-600'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="border-neutral-200/60 bg-[color:var(--color-elevated)]">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-neutral-500 mb-1">{period}</p>
          <motion.p
            className={cn('text-2xl font-light tabular-nums', colorClass)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.2 }}
          >
            {percentage}%
          </motion.p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function AnalysisConfigView({ onStart }: { onStart: () => void }) {
  const {
    company,
    riskTopic,
    setRiskTopic,
    riskJurisdiction,
    setRiskJurisdiction,
  } = useForseen()

  return (
    <div className="min-h-screen bg-[color:var(--color-page)] flex items-center justify-center p-6 md:p-8">
      <motion.div
        className="w-full max-w-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-[color:var(--color-accent-muted)]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <svg className="size-8 text-[color:var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-light tracking-tight text-neutral-800 md:text-3xl">
            Regulatory Analysis
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Configure your compliance scan for <span className="text-neutral-700">{company.name}</span>
          </p>
        </div>

        {/* Config Form */}
        <Card className="border-neutral-200/60 bg-[color:var(--color-elevated)]">
          <CardContent className="p-6">
            <p className="text-sm text-neutral-600 mb-6">
              We'll fetch regulatory signals and analyze them against your company profile to predict compliance requirements.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="risk-topic">Topic</Label>
                <Input
                  id="risk-topic"
                  value={riskTopic}
                  onChange={(e) => setRiskTopic(e.target.value)}
                  placeholder="e.g. State health data privacy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk-jurisdiction">Jurisdiction</Label>
                <Input
                  id="risk-jurisdiction"
                  value={riskJurisdiction}
                  onChange={(e) => setRiskJurisdiction(e.target.value)}
                  placeholder="e.g. CA or Federal"
                />
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="accent"
                size="lg"
                className="w-full gap-2"
                disabled={!riskTopic.trim() || !riskJurisdiction.trim()}
                onClick={onStart}
              >
                Run Analysis
                <IconArrowRight className="size-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-neutral-500">
          You can always run additional analyses from the dashboard later.
        </p>
      </motion.div>
    </div>
  )
}

function StreamingAnalysisView({ shouldRunAnalysis }: { shouldRunAnalysis: boolean }) {
  const {
    company,
    lastAnalyze,
    setActiveView,
    riskTopic,
    riskJurisdiction,
    runAnalyze,
    analyzeError,
    analyzeLoading,
  } = useForseen()

  // If we already have data and shouldn't run, start at complete
  const [phase, setPhase] = React.useState<AnalysisPhase>(
    lastAnalyze && !shouldRunAnalysis ? 'complete' : 'retrieving'
  )
  const [visibleDocuments, setVisibleDocuments] = React.useState(
    lastAnalyze && !shouldRunAnalysis ? Math.min(lastAnalyze.signals.length, 6) : 0
  )
  const [showPredictions, setShowPredictions] = React.useState(!shouldRunAnalysis && !!lastAnalyze)
  const [showRequirements, setShowRequirements] = React.useState(!shouldRunAnalysis && !!lastAnalyze)
  const [showActions, setShowActions] = React.useState(!shouldRunAnalysis && !!lastAnalyze)
  const [apiComplete, setApiComplete] = React.useState(!shouldRunAnalysis && !!lastAnalyze)
  const hasStartedRef = React.useRef(false)
  const hasAnimatedRef = React.useRef(!shouldRunAnalysis && !!lastAnalyze)

  // Start the API call (only once)
  React.useEffect(() => {
    if (!shouldRunAnalysis) return
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    // Just trigger the API call - we'll watch for completion separately
    runAnalyze()
  }, [shouldRunAnalysis, runAnalyze])

  // Watch for API completion and animate phases
  React.useEffect(() => {
    // Only animate if we were running analysis and now have data
    if (!shouldRunAnalysis) return
    if (hasAnimatedRef.current) return
    if (!lastAnalyze) return
    if (analyzeLoading) return

    hasAnimatedRef.current = true
    setApiComplete(true)

    let mounted = true

    const animatePhases = async () => {
      // Phase 2: Show retrieval complete, move to predicting
      await new Promise(r => setTimeout(r, 600))
      if (!mounted) return
      setPhase('predicting')

      // Phase 3: Move to generating
      await new Promise(r => setTimeout(r, 800))
      if (!mounted) return
      setPhase('generating')

      // Phase 4: Complete
      await new Promise(r => setTimeout(r, 800))
      if (!mounted) return
      setPhase('complete')
    }

    animatePhases()

    return () => { mounted = false }
  }, [shouldRunAnalysis, lastAnalyze, analyzeLoading])

  // Progressive document reveal - starts as soon as data arrives
  React.useEffect(() => {
    if (apiComplete && lastAnalyze && visibleDocuments < Math.min(lastAnalyze.signals.length, 6)) {
      const timer = setTimeout(() => {
        setVisibleDocuments(v => v + 1)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [apiComplete, lastAnalyze, visibleDocuments])

  // Show predictions when prediction phase completes
  React.useEffect(() => {
    if ((phase === 'generating' || phase === 'complete') && lastAnalyze && !showPredictions) {
      const timer = setTimeout(() => setShowPredictions(true), 300)
      return () => clearTimeout(timer)
    }
  }, [phase, lastAnalyze, showPredictions])

  // Show requirements when generation phase completes
  React.useEffect(() => {
    if (phase === 'complete' && lastAnalyze && !showRequirements) {
      const timer = setTimeout(() => setShowRequirements(true), 400)
      return () => clearTimeout(timer)
    }
  }, [phase, lastAnalyze, showRequirements])

  // Show actions after requirements
  React.useEffect(() => {
    if (phase === 'complete' && showRequirements && !showActions) {
      const timer = setTimeout(() => setShowActions(true), 500)
      return () => clearTimeout(timer)
    }
  }, [phase, showRequirements, showActions])

  const getStepStatus = (step: 'retrieve' | 'predict' | 'generate') => {
    const phaseOrder: AnalysisPhase[] = ['retrieving', 'predicting', 'generating', 'complete']
    const stepPhases = {
      retrieve: 'retrieving',
      predict: 'predicting',
      generate: 'generating',
    } as const

    const currentIndex = phaseOrder.indexOf(phase)
    const stepIndex = phaseOrder.indexOf(stepPhases[step])

    if (currentIndex > stepIndex) return 'complete'
    if (currentIndex === stepIndex) return 'loading'
    return 'idle'
  }

  const signals = lastAnalyze?.signals ?? []
  const signals_used = lastAnalyze?.signals_used ?? 0
  const prediction = lastAnalyze?.prediction
  const report = lastAnalyze?.report

  return (
    <div className="min-h-screen bg-[color:var(--color-page)] p-6 md:p-8 lg:p-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          className="mb-8 md:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-light tracking-tight text-neutral-800 md:text-3xl">
            Regulatory Analysis
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Analyzing <span className="text-neutral-700">{company.name}</span>
            {riskTopic && (
              <>
                {' '} · <span className="text-neutral-700">{riskTopic}</span>
              </>
            )}
            {riskJurisdiction && (
              <>
                {' '} · <JurisdictionBadge jurisdiction={riskJurisdiction} />
              </>
            )}
          </p>
        </motion.div>

        {/* Error State */}
        {analyzeError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <p className="text-sm text-red-700">{analyzeError}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => setActiveView('setup')}
            >
              Go back to setup
            </Button>
          </motion.div>
        )}

        {/* Chain of Reasoning - Always visible during analysis */}
        <motion.section
          className="mb-10 md:mb-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-lg font-medium text-neutral-800 mb-6">
            Chain of Reasoning
          </h2>
          <div className="relative border-l-2 border-neutral-200 pl-6 ml-2">
            <StreamingTimelineStep
              model="MongoDB"
              title="Document Retrieval"
              description="Vector search across regulatory corpus using semantic embeddings"
              output={getStepStatus('retrieve') === 'complete' && apiComplete ? `Retrieved ${signals_used} relevant signals from database` : undefined}
              status={getStepStatus('retrieve')}
            />
            <StreamingTimelineStep
              model="K2 Think v2"
              title="Prediction Analysis"
              description="Deep reasoning model analyzing regulatory signals and company profile"
              output={getStepStatus('predict') === 'complete' && prediction?.reasoning ? (prediction.reasoning.slice(0, 200) + (prediction.reasoning.length > 200 ? '...' : '')) : undefined}
              status={getStepStatus('predict')}
            />
            <StreamingTimelineStep
              model="Hermes"
              title="Report Generation"
              description="Executive report synthesis with actionable recommendations"
              output={getStepStatus('generate') === 'complete' && report?.executive_summary ? (report.executive_summary.slice(0, 200) + (report.executive_summary.length > 200 ? '...' : '')) : undefined}
              status={getStepStatus('generate')}
              isLast
            />
          </div>
        </motion.section>

        {/* Documents Section - Streams in as soon as data arrives */}
        <AnimatePresence>
          {apiComplete && signals.length > 0 && (
            <motion.section
              className="mb-10 md:mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-lg font-medium text-neutral-800 mb-4">
                Retrieved Documents ({signals_used})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {signals.slice(0, 6).map((signal, idx) => (
                  idx < visibleDocuments && (
                    <SignalCard key={idx} signal={signal} delay={0} />
                  )
                ))}
              </div>
              {signals.length > 6 && visibleDocuments >= 6 && (
                <motion.p
                  className="mt-4 text-xs text-neutral-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  + {signals.length - 6} more documents analyzed
                </motion.p>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Analysis Results - Streams in progressively */}
        <AnimatePresence>
          {showPredictions && prediction && (
            <motion.section
              className="mb-10 md:mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-lg font-medium text-neutral-800 mb-6">
                Analysis Results
              </h2>

              {/* Probability Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <ProbabilityCard
                  period="6 months"
                  probability={prediction.probability_6mo}
                  delay={0}
                />
                <ProbabilityCard
                  period="12 months"
                  probability={prediction.probability_12mo}
                  delay={0.15}
                />
                <ProbabilityCard
                  period="24 months"
                  probability={prediction.probability_24mo}
                  delay={0.3}
                />
              </div>

              {/* Confidence & Topic */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-neutral-200/60 bg-[color:var(--color-elevated)]">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Confidence</p>
                        <p className="text-sm font-medium text-neutral-800">{prediction.confidence}</p>
                      </div>
                      <div className="h-8 w-px bg-neutral-200" />
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Topic</p>
                        <p className="text-sm font-medium text-neutral-800">{prediction.topic}</p>
                      </div>
                      <div className="h-8 w-px bg-neutral-200" />
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Jurisdiction</p>
                        <p className="text-sm font-medium text-neutral-800">{prediction.jurisdiction}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Likely Requirements */}
        <AnimatePresence>
          {showRequirements && prediction && prediction.likely_requirements && prediction.likely_requirements.length > 0 && (
            <motion.section
              className="mb-10 md:mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Likely Requirements
              </h3>
              <div className="space-y-2">
                {prediction.likely_requirements.slice(0, 3).map((req, idx) => (
                  <motion.div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent-muted)] text-xs font-medium text-[color:var(--color-accent)]">
                      {idx + 1}
                    </span>
                    <span>{req}</span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Priority Actions */}
        <AnimatePresence>
          {showActions && report && report.priority_actions && report.priority_actions.length > 0 && (
            <motion.section
              className="mb-10 md:mb-14"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-sm font-medium text-neutral-700 mb-3">
                Priority Actions ({report.priority_actions.length})
              </h3>
              <div className="space-y-2">
                {report.priority_actions.slice(0, 4).map((action, idx) => (
                  <motion.div
                    key={idx}
                    className="flex items-start justify-between gap-4 rounded-lg border border-neutral-200/60 bg-[color:var(--color-elevated)] p-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          'mt-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                          action.priority === 'High'
                            ? 'bg-red-100 text-red-700'
                            : action.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        )}
                      >
                        {action.priority}
                      </span>
                      <span className="text-sm text-neutral-700">{action.action}</span>
                    </div>
                    {action.deadline && (
                      <span className="shrink-0 text-xs text-neutral-500">
                        {action.deadline}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Navigation - Shows after everything is complete */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              className="flex justify-center pt-4 pb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Button
                variant="accent"
                size="lg"
                onClick={() => setActiveView('dashboard')}
                className="gap-2 px-8"
              >
                Continue to Dashboard
                <IconArrowRight className="size-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function RegulatoryAnalysisScreen() {
  const { lastAnalyze } = useForseen()
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)

  // If we have data and aren't currently analyzing, show completed results
  if (lastAnalyze && !isAnalyzing) {
    return <StreamingAnalysisView shouldRunAnalysis={false} />
  }

  // If we're analyzing, show streaming view and run API
  if (isAnalyzing) {
    return <StreamingAnalysisView shouldRunAnalysis={true} />
  }

  // Otherwise show config
  return <AnalysisConfigView onStart={() => setIsAnalyzing(true)} />
}
