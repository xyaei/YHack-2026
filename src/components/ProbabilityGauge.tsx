import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

type Props = {
  value: number
  label?: string
  className?: string
}

export function ProbabilityGauge({ value, label = '12-mo', className }: Props) {
  const pct = Math.round(value * 100)

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-light uppercase tracking-wide text-neutral-500">{label}</span>
        <span className="text-sm font-light tabular-nums text-neutral-800">{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  )
}
