import * as React from 'react'
import * as d3 from 'd3'
import type { Prediction } from '@/data/mocks'

type Props = {
  predictions: Prediction[]
  className?: string
}

type Node = d3.SimulationNodeDatum & {
  id: string
  label: string
  type: 'prediction' | 'jurisdiction'
  prob?: number
}

type Link = d3.SimulationLinkDatum<Node> & {
  source: string | Node
  target: string | Node
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

export function SignalNetwork({ predictions, className }: Props) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { width, height } = useContainerSize(containerRef)

  React.useEffect(() => {
    if (!svgRef.current || width === 0 || height === 0 || predictions.length === 0) return

    // Build nodes and links
    const nodeMap = new Map<string, Node>()
    const links: Link[] = []

    predictions.forEach((p) => {
      const pId = `pred-${p.id}`
      if (!nodeMap.has(pId)) {
        nodeMap.set(pId, {
          id: pId,
          label: p.topic.length > 30 ? p.topic.slice(0, 28) + '…' : p.topic,
          type: 'prediction',
          prob: p.prob12mo,
        })
      }

      p.jurisdictions.forEach((j) => {
        const jId = `jur-${j}`
        if (!nodeMap.has(jId)) {
          nodeMap.set(jId, { id: jId, label: j, type: 'jurisdiction' })
        }
        links.push({ source: pId, target: jId })
      })
    })

    // Cross-link predictions sharing jurisdictions
    for (let i = 0; i < predictions.length; i++) {
      for (let k = i + 1; k < predictions.length; k++) {
        const shared = predictions[i].jurisdictions.filter((j) =>
          predictions[k].jurisdictions.includes(j),
        )
        if (shared.length > 0) {
          links.push({
            source: `pred-${predictions[i].id}`,
            target: `pred-${predictions[k].id}`,
          })
        }
      }
    }

    const nodes = Array.from(nodeMap.values())

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const defs = svg.append('defs')
    const grad = defs.append('radialGradient').attr('id', 'node-glow')
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#007353').attr('stop-opacity', 0.9)
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#007353').attr('stop-opacity', 0.3)

    const g = svg.append('g')

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        'link',
        d3.forceLink<Node, Link>(links).id((d) => d.id).distance(80),
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#d4d4d4')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6)

    const node = g
      .append('g')
      .selectAll<SVGGElement, Node>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )

    node
      .append('circle')
      .attr('r', (d) => (d.type === 'prediction' ? 10 + (d.prob ?? 0.5) * 14 : 8))
      .attr('fill', (d) => (d.type === 'prediction' ? 'url(#node-glow)' : '#f0f0ef'))
      .attr('stroke', (d) => (d.type === 'prediction' ? '#007353' : '#a3a3a3'))
      .attr('stroke-width', (d) => (d.type === 'prediction' ? 2 : 1.5))

    node
      .append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.type === 'prediction' ? 28 + (d.prob ?? 0.5) * 10 : 22))
      .attr('fill', '#525252')
      .attr('font-size', (d) => (d.type === 'prediction' ? '10px' : '9px'))
      .attr('font-weight', (d) => (d.type === 'prediction' ? '400' : '300'))
      .attr('pointer-events', 'none')

    node
      .filter((d) => d.type === 'prediction')
      .append('text')
      .text((d) => `${Math.round((d.prob ?? 0) * 100)}%`)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as Node).x ?? 0)
        .attr('y1', (d) => (d.source as Node).y ?? 0)
        .attr('x2', (d) => (d.target as Node).x ?? 0)
        .attr('y2', (d) => (d.target as Node).y ?? 0)

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svg.call(zoom)

    return () => {
      simulation.stop()
    }
  }, [predictions, width, height])

  return (
    <div ref={containerRef} className={className ?? 'h-64 w-full'}>
      <svg ref={svgRef} className="h-full w-full" />
    </div>
  )
}
