import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { Prediction } from '@/data/mocks'

type Props = { prediction: Prediction }

export function ProbTimeline({ prediction }: Props) {
  const data = [
    { t: '6 mo', p: Math.round(prediction.prob6mo * 100) },
    { t: '12 mo', p: Math.round(prediction.prob12mo * 100) },
    { t: '24 mo', p: Math.round(prediction.prob24mo * 100) },
  ]

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="probFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#007353" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#007353" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 11 }} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#737373', fontSize: 11 }} width={32} />
          <Area type="monotone" dataKey="p" stroke="#007353" strokeWidth={2} fill="url(#probFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
