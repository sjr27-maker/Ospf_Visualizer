/**
 * GNS3 Parser
 * A .gns3 file is JSON. Structure:
 *   topology.nodes[]  → routers, switches, clouds
 *   topology.links[]  → each link has two "nodes" array entries with node_id + adapter info
 */

export function parseGNS3(fileContent) {
  const data = JSON.parse(fileContent)
  const topology = data.topology

  // --- Extract nodes ---
  const nodes = topology.nodes
    .filter(n => n.node_type === 'qemu' || n.node_type === 'iou' || n.node_type === 'dynamips' || n.node_type === 'vpcs' || n.node_type === 'ethernet_switch')
    .map(n => ({
      id: n.node_id,
      label: n.name,
      type: detectDeviceType(n),
      x: n.x ?? Math.random() * 800,
      y: n.y ?? Math.random() * 500,
    }))

  // Build a lookup map: node_id → label (for link labeling)
  const nodeMap = {}
  nodes.forEach(n => { nodeMap[n.id] = n })

  // --- Extract links ---
  const links = topology.links.map(l => {
    const [endA, endB] = l.nodes  // each link has exactly 2 endpoint objects
    return {
      id: l.link_id,
      source: endA.node_id,
      target: endB.node_id,
      cost: Math.floor(Math.random() * 9) + 1, // OSPF cost 1-10
    }
  }).filter(l => nodeMap[l.source] && nodeMap[l.target]) // drop links to excluded nodes

  return { nodes, links }
}

function detectDeviceType(node) {
  const name = node.name?.toLowerCase() ?? ''
  if (name.includes('sw') || node.node_type === 'ethernet_switch') return 'switch'
  if (name.includes('pc') || node.node_type === 'vpcs') return 'pc'
  return 'router' // default
}