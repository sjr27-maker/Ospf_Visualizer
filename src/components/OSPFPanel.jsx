export default function OSPFPanel({ lsdb, routingTable, log, nodeMap }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '12px',
      height: '100%',
      fontFamily: 'Share Tech Mono',
      fontSize: '12px',
      color: '#7ab3d4',
    }}>

      {/* LSDB */}
      <div style={panelStyle}>
        <div style={headerStyle}>LINK STATE DATABASE</div>
        {Object.values(lsdb).map(lsa => (
          <div key={lsa.routerId} style={{ marginBottom: 10 }}>
            <div style={{ color: '#00ff88' }}>▶ {lsa.label}</div>
            {lsa.neighbors.map(nb => (
              <div key={nb.neighborId} style={{ paddingLeft: 12, color: '#4a7fa5' }}>
                └─ {nodeMap[nb.neighborId]?.label ?? nb.neighborId}
                <span style={{ color: '#ffaa00', marginLeft: 6 }}>cost={nb.cost}</span>
              </div>
            ))}
          </div>
        ))}
        {!Object.keys(lsdb).length && <div style={{ color: '#2a4a6a' }}>Import topology to populate LSDB</div>}
      </div>

      {/* Routing Table */}
      <div style={panelStyle}>
        <div style={headerStyle}>ROUTING TABLE (SPF)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 8, color: '#2a5a8a', borderBottom: '1px solid #1a3a5a', paddingBottom: 4 }}>
          <span>DEST</span><span>NEXT-HOP</span><span>COST</span>
        </div>
        {routingTable.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
            <span style={{ color: '#00ccff' }}>{row.destination}</span>
            <span style={{ color: '#7ab3d4' }}>{row.nextHop}</span>
            <span style={{ color: '#ffaa00' }}>{row.cost}</span>
          </div>
        ))}
        {!routingTable.length && <div style={{ color: '#2a4a6a' }}>Select a source node to compute SPF</div>}
      </div>

      {/* Packet Log */}
      <div style={panelStyle}>
        <div style={headerStyle}>PACKET TRACE</div>
        <div style={{ overflowY: 'auto', maxHeight: '260px' }}>
          {log.map((entry, i) => (
            <div key={i} style={{ marginBottom: 6, borderLeft: '2px solid #1a4a6a', paddingLeft: 8 }}>
              <span style={{ color: '#2a6a8a' }}>[{entry.time}] </span>
              <span style={{ color: entry.type === 'HOP' ? '#00ff88' : entry.type === 'LSA' ? '#ffaa00' : '#7ab3d4' }}>
                {entry.msg}
              </span>
            </div>
          ))}
          {!log.length && <div style={{ color: '#2a4a6a' }}>No packets sent yet</div>}
        </div>
      </div>

    </div>
  )
}

const panelStyle = {
  background: '#060e1a',
  border: '1px solid #0d2a44',
  borderRadius: 4,
  padding: '12px',
  overflowY: 'auto',
}

const headerStyle = {
  color: '#00ccff',
  fontSize: '10px',
  letterSpacing: '2px',
  marginBottom: 12,
  borderBottom: '1px solid #0d2a44',
  paddingBottom: 6,
}