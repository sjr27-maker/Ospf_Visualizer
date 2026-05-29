import { useEffect, useMemo, useRef, useState } from 'react'

export default function PacketAnimator({ hops, nodes, onHopComplete }) {
  const [pos, setPos] = useState(null)
  const frameRef = useRef(null)

  const nodeMap = useMemo(() => {
    const map = {}
    nodes.forEach(n => { map[n.id] = n })
    return map
  }, [nodes])

  useEffect(() => {
    if (!hops.length) { setPos(null); return }

    let startTime = null
    const HOP_DURATION = 600
    let lastHopIdx = -1

    function animate(timestamp) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const currentHopIdx = Math.floor(elapsed / HOP_DURATION)

      if (currentHopIdx >= hops.length) {
        const lastHop = hops[hops.length - 1]
        const dest = nodeMap[lastHop.toId]
        setPos(dest ? { x: dest.x, y: dest.y } : null)
        onHopComplete?.()
        return
      }

      const hop = hops[currentHopIdx]
      const src = nodeMap[hop.fromId]
      const dst = nodeMap[hop.toId]
      if (!src || !dst) { frameRef.current = requestAnimationFrame(animate); return }

      const t = (elapsed % HOP_DURATION) / HOP_DURATION
      setPos({ x: src.x + (dst.x - src.x) * t, y: src.y + (dst.y - src.y) * t })

      if (currentHopIdx !== lastHopIdx) {
        lastHopIdx = currentHopIdx
        onHopComplete?.(hop)
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [hops, nodeMap, onHopComplete])

  if (!pos) return null

  // Read the zoom transform from the D3 zoom group
  const zoomGroup = document.querySelector('.zoom-root')
  const transform = zoomGroup?.getAttribute('transform') ?? ''
  let tx = 0, ty = 0, scale = 1
  const match = transform.match(/translate\(([^,]+),([^)]+)\).*scale\(([^)]+)\)/)
  if (match) {
    tx = parseFloat(match[1])
    ty = parseFloat(match[2])
    scale = parseFloat(match[3])
  }

  const screenX = pos.x * scale + tx
  const screenY = pos.y * scale + ty

  return (
    <div style={{
      position: 'absolute',
      left: screenX - 8,
      top: screenY - 8,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: '#ffaa00',
      boxShadow: '0 0 14px #ffaa00, 0 0 28px #ff6600',
      pointerEvents: 'none',
      zIndex: 10,
      transition: 'none',
    }} />
  )
}