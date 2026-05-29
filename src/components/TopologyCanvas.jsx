import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export default function TopologyCanvas({
  nodes, links,
  activePath,       // array of node IDs on current packet path
  floodEdges,       // array of { from, to } currently flooding LSA
  selectedSrc,
  selectedDst,
  onSelectNode,
}) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!nodes.length) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // ── Defs: arrow marker ──
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#00ff88')

    // ── Build node lookup ──
    const nodeMap = {}
    nodes.forEach(n => { nodeMap[n.id] = n })

    // ── Active path set for quick lookup ──
    const activeSet = new Set()
    for (let i = 0; i < activePath.length - 1; i++) {
      activeSet.add(`${activePath[i]}-${activePath[i+1]}`)
      activeSet.add(`${activePath[i+1]}-${activePath[i]}`)
    }

    // ── Flood edge set ──
    const floodSet = new Set(floodEdges.map(e => `${e.from}-${e.to}`))

    // ── Draw links ──
    const linkGroup = svg.append('g').attr('class', 'links')

    links.forEach(link => {
      const src = nodeMap[link.source]
      const tgt = nodeMap[link.target]
      if (!src || !tgt) return

      const isActive = activeSet.has(`${link.source}-${link.target}`)
      const isFlooding = floodSet.has(`${link.source}-${link.target}`) ||
                         floodSet.has(`${link.target}-${link.source}`)

      linkGroup.append('line')
        .attr('x1', src.x).attr('y1', src.y)
        .attr('x2', tgt.x).attr('y2', tgt.y)
        .attr('stroke', isActive ? '#00ff88' : isFlooding ? '#ffaa00' : '#1e3a5f')
        .attr('stroke-width', isActive ? 3 : isFlooding ? 2 : 1.5)
        .attr('stroke-dasharray', isFlooding ? '6,3' : 'none')
        .attr('opacity', 0.9)

      // Cost label
      const mx = (src.x + tgt.x) / 2
      const my = (src.y + tgt.y) / 2
      linkGroup.append('text')
        .attr('x', mx).attr('y', my - 6)
        .attr('fill', isActive ? '#00ff88' : '#4a7fa5')
        .attr('font-size', '11px')
        .attr('font-family', 'Share Tech Mono')
        .attr('text-anchor', 'middle')
        .text(`cost:${link.cost}`)
    })

    // ── Draw nodes ──
    const nodeGroup = svg.append('g').attr('class', 'nodes')

    nodes.forEach(node => {
      const isSrc = node.id === selectedSrc
      const isDst = node.id === selectedDst
      const isOnPath = activePath.includes(node.id)

      const g = nodeGroup.append('g')
        .attr('transform', `translate(${node.x},${node.y})`)
        .attr('cursor', 'pointer')
        .on('click', () => onSelectNode(node.id))

      // Glow ring for selected/path nodes
      if (isSrc || isDst || isOnPath) {
        g.append('circle')
          .attr('r', 26)
          .attr('fill', 'none')
          .attr('stroke', isSrc ? '#00ff88' : isDst ? '#ff4466' : '#00ccff')
          .attr('stroke-width', 2)
          .attr('opacity', 0.6)
      }

      // Node body
      g.append('circle')
        .attr('r', 18)
        .attr('fill', isSrc ? '#003322' : isDst ? '#330011' : '#0a1628')
        .attr('stroke', isSrc ? '#00ff88' : isDst ? '#ff4466' : '#1e4a7a')
        .attr('stroke-width', 2)

      // Router icon (text)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', node.type === 'router' ? '14px' : '12px')
        .text(node.type === 'router' ? '⬡' : node.type === 'switch' ? '⧉' : '🖥')

      // Label
      g.append('text')
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('fill', isSrc ? '#00ff88' : isDst ? '#ff4466' : '#7ab3d4')
        .attr('font-size', '11px')
        .attr('font-family', 'Share Tech Mono')
        .text(node.label)
    })

  }, [nodes, links, activePath, floodEdges, selectedSrc, selectedDst])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  )
}