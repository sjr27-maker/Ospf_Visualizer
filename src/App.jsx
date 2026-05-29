import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import TopologyCanvas from './components/TopologyCanvas'
import OSPFPanel from './components/OSPFPanel'
import PacketAnimator from './components/PacketAnimator'
import { parseGNS3 } from './engine/gns3Parser'
import { generateLSAs, runSPF, buildRoutingTable, simulateLSAFlood } from './engine/ospf'
import { buildHopSequence } from './engine/packetSim'

export default function App() {
  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])
  const [lsdb, setLsdb] = useState({})
  const [selectedSrc, setSelectedSrc] = useState(null)
  const [selectedDst, setSelectedDst] = useState(null)
  const [routingTable, setRoutingTable] = useState([])
  const [activePath, setActivePath] = useState([])
  const [hops, setHops] = useState([])
  const [floodEdges, setFloodEdges] = useState([])
  const [log, setLog] = useState([])
  const [phase, setPhase] = useState('idle') // idle | flooding | routing | sending
  const canvasRef = useRef(null) 
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Sync state if user presses Escape to exit fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const nodeMap = useMemo(() => {
    const map = {}
    nodes.forEach(n => { map[n.id] = n })
    return map
  }, [nodes])

  const addLog = (msg, type = 'INFO') => {
    const time = new Date().toTimeString().slice(0, 8)
    setLog(prev => [{ msg, type, time }, ...prev].slice(0, 50))
  }

  // ── Import GNS3 file ──────────────────────────────────────────────────────
  const handleFileImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const { nodes: n, links: l } = parseGNS3(ev.target.result)
        setNodes(n)
        setLinks(l)
        const db = generateLSAs(n, l)
        setLsdb(db)
        setActivePath([])
        setHops([])
        setSelectedSrc(null)
        setSelectedDst(null)
        setRoutingTable([])
        setLog([])
        addLog(`Topology loaded: ${n.length} nodes, ${l.length} links`, 'INFO')
        addLog('LSDB built. All routers have full topology map.', 'INFO')
      } catch (err) {
        addLog(`Parse error: ${err.message}`, 'ERROR')
      }
    }
    reader.readAsText(file)
  }

  // ── Node selection (click = src, second click = dst) ─────────────────────
  const handleSelectNode = useCallback((nodeId) => {
    if (!selectedSrc || (selectedSrc && selectedDst)) {
      // Start fresh selection
      setSelectedSrc(nodeId)
      setSelectedDst(null)
      setActivePath([])
      setHops([])
      // Compute routing table from this source
      const spf = runSPF(nodeId, lsdb)
      const rt = buildRoutingTable(nodeId, spf, nodeMap)
      setRoutingTable(rt)
      addLog(`SPF computed from ${nodeMap[nodeId]?.label}`, 'INFO')
    } else {
      setSelectedDst(nodeId)
      addLog(`Destination set: ${nodeMap[nodeId]?.label}`, 'INFO')
    }
  }, [selectedSrc, selectedDst, lsdb, nodeMap])

  // ── Send packet ───────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!selectedSrc || !selectedDst) return

    // Phase 1: LSA flood animation
    setPhase('flooding')
    const floodEvents = simulateLSAFlood(selectedSrc, lsdb)
    addLog(`LSA flood initiated from ${nodeMap[selectedSrc]?.label}`, 'LSA')

    let maxStep = Math.max(...floodEvents.map(e => e.step), 0)
    floodEvents.forEach((evt, i) => {
      setTimeout(() => {
        setFloodEdges(prev => [...prev, { from: evt.from, to: evt.to }])
        addLog(`LSA: ${nodeMap[evt.from]?.label} → ${nodeMap[evt.to]?.label}`, 'LSA')
      }, i * 180)
    })

    // Phase 2: After flood, compute path & animate packet
    const floodDuration = (floodEvents.length + 2) * 180
    setTimeout(() => {
      setFloodEdges([])
      setPhase('sending')

      const spf = runSPF(selectedSrc, lsdb)
      const dest = spf[selectedDst]

      if (!dest || dest.path.length === 0) {
        addLog(`No route to ${nodeMap[selectedDst]?.label}`, 'ERROR')
        setPhase('idle')
        return
      }

      setActivePath(dest.path)
      const hopSeq = buildHopSequence(dest.path)
      setHops(hopSeq)

      addLog(`Best path (cost ${dest.cost}): ${dest.path.map(id => nodeMap[id]?.label).join(' → ')}`, 'HOP')
      dest.path.forEach((id, i) => {
        if (i === 0) return
        setTimeout(() => {
          addLog(`HOP ${i}: Packet at ${nodeMap[id]?.label}`, 'HOP')
        }, i * 600)
      })
    }, floodDuration)
  }

  const handleHopComplete = () => {
    setTimeout(() => {
      setPhase('idle')
      setActivePath([])
      setHops([])
    }, 1200)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '56px 1fr 300px',
      height: '100vh',
      background: '#030810',
      color: '#7ab3d4',
      fontFamily: 'Rajdhani, sans-serif',
    }}>

      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '0 24px',
        background: '#060e1a',
        borderBottom: '1px solid #0d2a44',
      }}>
        <div style={{ color: '#00ff88', fontWeight: 700, fontSize: 20, letterSpacing: 3 }}>
          OSPF<span style={{ color: '#00ccff' }}>·VIZ</span>
        </div>

        <label style={btnStyle}>
          IMPORT .GNS3
          <input type="file" accept=".gns3" onChange={handleFileImport} style={{ display: 'none' }} />
        </label>

        <div style={{ color: '#2a5a8a', fontSize: 13 }}>
          {nodes.length ? `${nodes.length} nodes · ${links.length} links` : 'No topology loaded'}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#4a7fa5' }}>
            SRC: <span style={{ color: '#00ff88' }}>{selectedSrc ? nodeMap[selectedSrc]?.label : '—'}</span>
            {'  '}DST: <span style={{ color: '#ff4466' }}>{selectedDst ? nodeMap[selectedDst]?.label : '—'}</span>
          </div>
          <button
            onClick={handleSend}
            disabled={!selectedSrc || !selectedDst || phase !== 'idle'}
            style={{
              ...btnStyle,
              background: selectedSrc && selectedDst && phase === 'idle' ? '#003322' : '#0a1020',
              borderColor: selectedSrc && selectedDst && phase === 'idle' ? '#00ff88' : '#1a3a5a',
              color: selectedSrc && selectedDst && phase === 'idle' ? '#00ff88' : '#2a4a6a',
              cursor: selectedSrc && selectedDst && phase === 'idle' ? 'pointer' : 'not-allowed',
            }}
          >
            {phase === 'flooding' ? 'FLOODING LSAs...' : phase === 'sending' ? 'SENDING...' : 'SEND PACKET'}
          </button>
        </div>
      </div>
       <button onClick={toggleFullscreen} style={btnStyle}>
  {isFullscreen ? '⊠ EXIT FULL' : '⊡ FULLSCREEN'}
</button>

      {/* ── Canvas ── */}
      <div ref={canvasRef} style={{ position: 'relative', overflow: 'hidden', background: '#030810' }}>
        <TopologyCanvas
          nodes={nodes}
          links={links}
          activePath={activePath}
          floodEdges={floodEdges}
          selectedSrc={selectedSrc}
          selectedDst={selectedDst}
          onSelectNode={handleSelectNode}
        />
        <PacketAnimator
          hops={hops}
          nodes={nodes}
          onHopComplete={handleHopComplete}
        />
        {!nodes.length && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12, color: '#1a3a5a',
            fontFamily: 'Share Tech Mono',
          }}>
            <div style={{ fontSize: 48 }}>⬡</div>
            <div>Import a .gns3 file or use sample.gns3 from /public</div>
          </div>
        )}
      </div>

      {/* ── Bottom Panel ── */}
      <div style={{ borderTop: '1px solid #0d2a44', padding: 12, overflow: 'hidden' }}>
        <OSPFPanel lsdb={lsdb} routingTable={routingTable} log={log} nodeMap={nodeMap} />
      </div>

    </div>
  )
}

const btnStyle = {
  background: '#0a1628',
  border: '1px solid #1e4a7a',
  color: '#7ab3d4',
  padding: '6px 14px',
  borderRadius: 3,
  fontSize: 13,
  fontFamily: 'Share Tech Mono',
  cursor: 'pointer',
  letterSpacing: 1,
}