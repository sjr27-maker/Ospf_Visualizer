/**
 * OSPF Engine
 *
 * Real OSPF flow:
 * 1. Each router sends Hello packets → discovers neighbors
 * 2. Each router floods LSAs (Link State Advertisements) to ALL routers
 * 3. Every router builds an identical LSDB (Link State Database)
 * 4. Every router independently runs Dijkstra SPF on the LSDB
 * 5. Each router builds its routing table from the SPF tree
 */

// ─── Step 1: Generate LSAs ───────────────────────────────────────────────────
// Each router produces one LSA: "I am R1, my neighbors are R2(cost4), R3(cost2)"
export function generateLSAs(nodes, links) {
  const lsas = {}

  nodes.forEach(node => {
    const neighbors = []
    links.forEach(link => {
      if (link.source === node.id) {
        neighbors.push({ neighborId: link.target, cost: link.cost })
      } else if (link.target === node.id) {
        neighbors.push({ neighborId: link.source, cost: link.cost })
      }
    })
    lsas[node.id] = {
      routerId: node.id,
      label: node.label,
      neighbors,
      seqNumber: 1, // in real OSPF this increments on topology change
    }
  })

  return lsas // this IS the LSDB once flooded
}

// ─── Step 2: Run Dijkstra SPF from a source node ─────────────────────────────
// Returns: { [destinationId]: { cost, path: [id, id, ...] } }
export function runSPF(sourceId, lsdb) {
  const dist = {}   // shortest known distance to each node
  const prev = {}   // previous node on shortest path
  const visited = new Set()

  // Initialize
  Object.keys(lsdb).forEach(id => {
    dist[id] = Infinity
    prev[id] = null
  })
  dist[sourceId] = 0

  // Priority queue (simple array sort — fine for small topologies)
  const queue = [{ id: sourceId, cost: 0 }]

  while (queue.length > 0) {
    // Pick lowest-cost unvisited node
    queue.sort((a, b) => a.cost - b.cost)
    const { id: current } = queue.shift()

    if (visited.has(current)) continue
    visited.add(current)

    const lsa = lsdb[current]
    if (!lsa) continue

    lsa.neighbors.forEach(({ neighborId, cost }) => {
      if (visited.has(neighborId)) return
      const newCost = dist[current] + cost
      if (newCost < dist[neighborId]) {
        dist[neighborId] = newCost
        prev[neighborId] = current
        queue.push({ id: neighborId, cost: newCost })
      }
    })
  }

  // Reconstruct paths
  const result = {}
  Object.keys(lsdb).forEach(destId => {
    if (destId === sourceId) return
    const path = []
    let cur = destId
    while (cur !== null) {
      path.unshift(cur)
      cur = prev[cur]
    }
    result[destId] = {
      cost: dist[destId],
      path: path.length > 1 ? path : [], // empty = unreachable
    }
  })

  return result
}

// ─── Step 3: Build routing table ─────────────────────────────────────────────
// Format: [{ destination, nextHop, cost, path }]
export function buildRoutingTable(sourceId, spfResult, nodeMap) {
  return Object.entries(spfResult)
    .filter(([, v]) => v.path.length > 0)
    .map(([destId, { cost, path }]) => ({
      destination: nodeMap[destId]?.label ?? destId,
      destinationId: destId,
      nextHop: nodeMap[path[1]]?.label ?? '—',
      cost,
      path,
    }))
    .sort((a, b) => a.cost - b.cost)
}

// ─── Step 4: Simulate LSA flood sequence ─────────────────────────────────────
// Returns an ordered list of flood events for animation
// Real OSPF: originating router sends LSA to all neighbors,
// each neighbor re-floods to its neighbors (except the one it received from)
export function simulateLSAFlood(originId, lsdb) {
  const events = []
  const seen = new Set()
  const queue = [{ from: null, to: originId, step: 0 }]

  while (queue.length > 0) {
    const { from, to, step } = queue.shift()
    const key = `${from}-${to}`
    if (seen.has(key)) continue
    seen.add(key)

    if (from !== null) {
      events.push({ from, to, step, type: 'LSA_FLOOD' })
    }

    const lsa = lsdb[to]
    if (!lsa) continue

    lsa.neighbors.forEach(({ neighborId }) => {
      if (neighborId !== from) {
        queue.push({ from: to, to: neighborId, step: step + 1 })
      }
    })
  }

  return events
}