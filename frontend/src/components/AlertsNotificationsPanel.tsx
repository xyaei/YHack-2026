import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { IconBell } from '@/components/icons'
import { mocks } from '@/data/mocks'
import { cn } from '@/lib/utils'
import { useForseen } from '@/store/forseen-context'

function effortToPct(e: string): number {
  if (e === 'High') return 85
  if (e === 'Med') return 55
  return 30
}

export function AlertsNotificationsPanel() {
  const { alertDone, toggleAlertDone, markAllAlertsDone, loading, setLoading } = useForseen()
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  const openAlerts = mocks.alerts.filter((a) => !alertDone[a.id])
  const openCount = openAlerts.length

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onDown)
      document.addEventListener('keydown', onKey)
    }
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const runPipeline = () => {
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      toast.message('Demo mode — simulating pipeline', { description: 'Hermes pipeline triggered (mock).' })
    }, 1200)
  }

  return (
    <div ref={wrapRef} className="relative">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className={cn('relative shrink-0 rounded-xl border-neutral-200/80', open && 'bg-neutral-100')}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <IconBell className="size-5" aria-hidden />
        {openCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[10px] font-bold text-white">
            {openCount > 9 ? '9+' : openCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-neutral-200/80 bg-[color:var(--color-elevated)] shadow-lg md:w-[min(90vw,24rem)]"
          role="dialog"
          aria-label="Alerts and notifications"
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-light text-neutral-800">Alerts</p>
            <div className="flex flex-wrap justify-end gap-1.5">
              <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={openCount === 0} onClick={() => markAllAlertsDone()}>
                Mark all done
              </Button>
              <Button variant="accent" size="sm" className="h-8 text-xs" disabled={loading} onClick={runPipeline}>
                {loading ? '…' : 'Regenerate'}
              </Button>
            </div>
          </div>
          <div className="max-h-[min(70dvh,24rem)] overflow-y-auto p-3">
            {openCount === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">No open alerts.</p>
            ) : (
              <ul className="space-y-2">
                {openAlerts.map((a) => (
                  <li key={a.id}>
                    <Card className="border-neutral-200/90 shadow-none">
                      <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-3 pb-2">
                        <Checkbox checked={!!alertDone[a.id]} onCheckedChange={() => toggleAlertDone(a.id)} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <CardTitle className="text-sm font-light leading-snug">{a.title}</CardTitle>
                            <Badge variant="outline" className="text-[10px]">
                              {a.priority}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-neutral-600">{a.description}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-1 px-3 pb-3 pt-0">
                        <div className="flex justify-between text-[10px] text-neutral-500">
                          <span>Effort</span>
                          <span>{a.effort}</span>
                        </div>
                        <Progress value={effortToPct(a.effort)} className="h-1" />
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
