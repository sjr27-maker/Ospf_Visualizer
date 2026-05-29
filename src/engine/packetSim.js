/**
 * Packet Simulator
 * Takes an OSPF-computed path and produces a sequence of hop events.
 * Each hop = { fromId, toId, delayMs }
 */

export function buildHopSequence(path, hopDelayMs = 600) {
  if (!path || path.length < 2) return []

  return path.slice(0, -1).map((nodeId, i) => ({
    step: i,
    fromId: nodeId,
    toId: path[i + 1],
    delayMs: i * hopDelayMs,
  }))
}

// Finds which link object corresponds to a hop (for highlighting)
export function findLink(links, fromId, toId) {
  return links.find(
    l => (l.source === fromId && l.target === toId) ||
         (l.target === fromId && l.source === toId)
  )
}