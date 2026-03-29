import * as React from 'react'
import * as d3 from 'd3'
import type { Prediction } from '@/data/mocks'

type Props = {
  predictions: Prediction[]
  className?: string
}

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = React.useState({ width: 0, height: 0 })

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) setSize({ width, height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return size
}

export function RiskRadar({ predictions, className }: Props) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { width: cw, height: ch } = useContainerSize(containerRef)

  React.useEffect(() => {
    if (!svgRef.current || cw === 0 || ch === 0 || predictions.length === 0) return

    const size = Math.min(cw, ch)
    const margin = 50
    const radius = (size - margin * 2) / 2
    if (radius <= 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${size} ${size}`)

    const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`)

    const n = predictions.length
    const angleSlice = (Math.PI * 2) / n
    const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius])

    // Grid rings
    const levels = 4
    for (let i = 1; i <= levels; i++) {
      const r = (radius / levels) * i
      g.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', '#e5e5e5')
        .attr('stroke-width', 0.8)

      g.append('text')
        .attr('x', 4)
        .attr('y', -r - 2)
        .attr('fill', '#a3a3a3')
        .attr('font-size', '8px')
        .attr('font-weight', '300')
        .text(`${Math.round((i / levels) * 100)}%`)
    }

    // Axis lines + labels
    predictions.forEach((p, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const labelR = radius + 16

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#e5e5e5')
        .attr('stroke-width', 0.8)

      const lx = Math.cos(angle) * labelR
      const ly = Math.sin(angle) * labelR
      const label = p.topic.length > 22 ? p.topic.slice(0, 20) + '…' : p.topic

      g.append('text')
        .attr('x', lx)
        .attr('y', ly)
        .attr('text-anchor', Math.abs(lx) < 5 ? 'middle' : lx > 0 ? 'start' : 'end')
        .attr('dominant-baseline', Math.abs(ly) < 5 ? 'middle' : ly > 0 ? 'hanging' : 'auto')
        .attr('fill', '#525252')
        .attr('font-size', '9px')
        .attr('font-weight', '300')
        .text(label)
    })

    // Area polygons for each time horizon
    const horizons = [
      { key: 'prob24mo' as const, color: '#007353', opacity: 0.12 },
      { key: 'prob12mo' as const, color: '#007353', opacity: 0.25 },
      { key: 'prob6mo' as const, color: '#007353', opacity: 0.45 },
    ]

    horizons.forEach(({ key, color, opacity }) => {
      const points: [number, number][] = predictions.map((p, i) => {
        const angle = angleSlice * i - Math.PI / 2
        const val = p[key]
        const r = rScale(val)
        return [Math.cos(angle) * r, Math.sin(angle) * r]
      })
      if (points.length > 0) points.push(points[0])

      const line = d3
        .line<[number, number]>()
        .x((d) => d[0])
        .y((d) => d[1])
        .curve(d3.curveLinearClosed)

      g.append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', color)
        .attr('fill-opacity', opacity)
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', opacity + 0.2)
    })

    // Data points for 12-month
    predictions.forEach((p, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const r = rScale(p.prob12mo)
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r

      g.append('circle').attr('cx', x).attr('cy', y).attr('r', 4).attr('fill', '#007353').attr('stroke', '#fff').attr('stroke-width', 1.5)

      g.append('text')
        .attr('x', x)
        .attr('y', y - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#007353')
        .attr('font-size', '9px')
        .attr('font-weight', '500')
        .text(`${Math.round(p.prob12mo * 100)}%`)
    })
  }, [predictions, cw, ch])

  return (
    <div ref={containerRef} className={className ?? 'aspect-square w-full'}>
      <svg ref={svgRef} className="h-full w-full" />
    </div>
  )
}
