import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export default function TopologyCanvas({
  nodes, links,
  activePath,
  floodEdges,
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

    // ── Defs ──
    const defs = svg.append('defs')

    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#00ff88')

    // Grid background
    const pattern = defs.append('pattern')
      .attr('id', 'grid')
      .attr('width', 40).attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse')

    pattern.append('path')
      .attr('d', 'M 40 0 L 0 0 0 40')
      .attr('fill', 'none')
      .attr('stroke', '#0a1e35')
      .attr('stroke-width', 0.5)

    svg.append('rect')
      .attr('width', '100%').attr('height', '100%')
      .attr('fill', 'url(#grid)')

    // ── Zoom container ──
    const g = svg.append('g').attr('class', 'zoom-root')

    // ── Zoom behavior ──
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Auto fit the topology into view on load
    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const topoW = maxX - minX + 120
    const topoH = maxY - minY + 120
    const scale = Math.min(width / topoW, height / topoH, 1) * 0.85
    const tx = (width - topoW * scale) / 2 - minX * scale + 60 * scale
    const ty = (height - topoH * scale) / 2 - minY * scale + 60 * scale

    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))

    // ── Build lookups ──
    const nodeMap = {}
    nodes.forEach(n => { nodeMap[n.id] = n })

    const activeSet = new Set()
    for (let i = 0; i < activePath.length - 1; i++) {
      activeSet.add(`${activePath[i]}-${activePath[i + 1]}`)
      activeSet.add(`${activePath[i + 1]}-${activePath[i]}`)
    }

    const floodSet = new Set(floodEdges.map(e => `${e.from}-${e.to}`))

    // ── Links ──
    const linkGroup = g.append('g')

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
        .attr('stroke-width', isActive ? 3 : isFlooding ? 2 : 1)
        .attr('stroke-dasharray', isFlooding ? '6,3' : 'none')
        .attr('opacity', 0.85)

      const mx = (src.x + tgt.x) / 2
      const my = (src.y + tgt.y) / 2
      linkGroup.append('text')
        .attr('x', mx).attr('y', my - 5)
        .attr('fill', isActive ? '#00ff88' : '#1e4a6a')
        .attr('font-size', '9px')
        .attr('font-family', 'Share Tech Mono')
        .attr('text-anchor', 'middle')
        .text(`${link.cost}`)
    })

    // ── Nodes ──
    const nodeGroup = g.append('g')

    nodes.forEach(node => {
      const isSrc = node.id === selectedSrc
      const isDst = node.id === selectedDst
      const isOnPath = activePath.includes(node.id)

      const ng = nodeGroup.append('g')
        .attr('transform', `translate(${node.x},${node.y})`)
        .attr('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation()
          onSelectNode(node.id)
        })

      // Pulse ring for selected nodes
      if (isSrc || isDst) {
        ng.append('circle')
          .attr('r', 22)
          .attr('fill', 'none')
          .attr('stroke', isSrc ? '#00ff88' : '#ff4466')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.5)
      }

      if (isOnPath && !isSrc && !isDst) {
        ng.append('circle')
          .attr('r', 20)
          .attr('fill', 'none')
          .attr('stroke', '#00ccff')
          .attr('stroke-width', 1)
          .attr('opacity', 0.4)
      }

      // Node body
      ng.append('circle')
        .attr('r', 14)
        .attr('fill', isSrc ? '#002a18' : isDst ? '#2a0010' : '#080f1e')
        .attr('stroke', isSrc ? '#00ff88' : isDst ? '#ff4466' : '#1a3a6a')
        .attr('stroke-width', 1.5)

      // Icon
      ng.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '11px')
        .text(node.type === 'router' ? '⬡' : node.type === 'switch' ? '⧉' : '🖥')

      // Label
      ng.append('text')
        .attr('y', 24)
        .attr('text-anchor', 'middle')
        .attr('fill', isSrc ? '#00ff88' : isDst ? '#ff4466' : '#4a7fa5')
        .attr('font-size', '10px')
        .attr('font-family', 'Share Tech Mono')
        .text(node.label)
    })

  }, [nodes, links, activePath, floodEdges, selectedSrc, selectedDst, onSelectNode])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', background: 'transparent', cursor: 'grab' }}
    />
  )
}