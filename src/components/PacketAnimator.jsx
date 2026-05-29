import { useEffect, useRef, useState } from 'react'

export default function PacketAnimator({ hops, nodes, onHopComplete }) {
  const [pos, setPos] = useState(null)        // { x, y } current packet position
  const [activeHop, setActiveHop] = useState(-1)
  const frameRef = useRef(null)

  const nodeMap = {}
  nodes.forEach(n => { nodeMap[n.id] = n })

  useEffect(() => {
    if (!hops.length) { setPos(null); return }

    let hopIdx = 0
    let startTime = null

    const HOP_DURATION = 600 // ms per hop

    function animate(timestamp) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime

      const currentHopIdx = Math.floor(elapsed / HOP_DURATION)
      if (currentHopIdx >= hops.length) {
        // Animation done
        const lastHop = hops[hops.length - 1]
        const dest = nodeMap[lastHop.toId]
        setPos(dest ? { x: dest.x, y: dest.y } : null)
        setActiveHop(-1)
        onHopComplete?.()
        return
      }

      const hop = hops[currentHopIdx]
      const src = nodeMap[hop.fromId]
      const dst = nodeMap[hop.toId]
      if (!src || !dst) { frameRef.current = requestAnimationFrame(animate); return }

      const hopProgress = (elapsed % HOP_DURATION) / HOP_DURATION
      const x = src.x + (dst.x - src.x) * hopProgress
      const y = src.y + (dst.y - src.y) * hopProgress

      setPos({ x, y })
      setActiveHop(currentHopIdx)
      if (currentHopIdx !== hopIdx) {
        hopIdx = currentHopIdx
        onHopComplete?.(hop)
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [hops])

  if (!pos) return null

  return (
    <div style={{
      position: 'absolute',
      left: pos.x - 8,
      top: pos.y - 8,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: '#ffaa00',
      boxShadow: '0 0 12px #ffaa00, 0 0 24px #ff6600',
      pointerEvents: 'none',
      transition: 'none',
      zIndex: 10,
    }} />
  )
}