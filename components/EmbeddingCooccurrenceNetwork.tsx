import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

interface EmbeddingCooccurrenceNetworkProps {
  data: any[]
  topN?: number
}

export default function EmbeddingCooccurrenceNetwork({ data, topN = 5 }: EmbeddingCooccurrenceNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedEdge, setSelectedEdge] = useState<any>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<any>(null)
  const simulationRef = useRef<any>(null)

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return

    const cooccurrence: Record<string, { 
      count: number
      classPairs: Record<string, number>
    }> = {}
    
    const allEmbeddings = new Set<string>()

    data.forEach(row => {
      if (!row.topEmbeddings || !row.classes) return
      
      const classPair = `${row.classes.c1Name} vs ${row.classes.c2Name}`
      const topEmbs = row.topEmbeddings.slice(0, topN).map((e: any) => e.id)
      
      topEmbs.forEach((e: string) => allEmbeddings.add(e))

      for (let i = 0; i < topEmbs.length; i++) {
        for (let j = i + 1; j < topEmbs.length; j++) {
          const pairKey = [topEmbs[i], topEmbs[j]].sort().join('|||')
          
          if (!cooccurrence[pairKey]) {
            cooccurrence[pairKey] = { count: 0, classPairs: {} }
          }
          
          cooccurrence[pairKey].count++
          cooccurrence[pairKey].classPairs[classPair] = (cooccurrence[pairKey].classPairs[classPair] || 0) + 1
        }
      }
    })

    const nodes = Array.from(allEmbeddings).map(emb => ({ id: emb }))

    const links = Object.entries(cooccurrence)
      .filter(([_, data]) => data.count > 1)
      .map(([pairKey, data]) => {
        const [e1, e2] = pairKey.split('|||')
        return {
          source: e1,
          target: e2,
          value: data.count,
          classPairs: data.classPairs
        }
      })

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = 550

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35))
    
    simulationRef.current = simulation

    const g = svg.append('g')

    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    
    svg.call(zoom as any)

    const getConnectedNodes = (nodeId: string) => {
      const connected = new Set([nodeId])
      links.forEach((link: any) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source
        const targetId = typeof link.target === 'object' ? link.target.id : link.target
        if (sourceId === nodeId) connected.add(targetId)
        if (targetId === nodeId) connected.add(sourceId)
      })
      return connected
    }

    const isEdgeConnected = (edgeData: any, nodeId: string | null) => {
      if (!nodeId) return true
      const sourceId = typeof edgeData.source === 'object' ? edgeData.source.id : edgeData.source
      const targetId = typeof edgeData.target === 'object' ? edgeData.target.id : edgeData.target
      return sourceId === nodeId || targetId === nodeId
    }

    const isSameEdge = (e1: any, e2: any) => {
      if (!e1 || !e2) return false
      const s1 = typeof e1.source === 'object' ? e1.source.id : e1.source
      const t1 = typeof e1.target === 'object' ? e1.target.id : e1.target
      const s2 = typeof e2.source === 'object' ? e2.source.id : e2.source
      const t2 = typeof e2.target === 'object' ? e2.target.id : e2.target
      return (s1 === s2 && t1 === t2) || (s1 === t2 && t1 === s2)
    }

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', (d: any) => Math.sqrt(d.value))
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d: any) {
        // Only allow hover if: no node selected OR edge connects to selected node
        // AND no edge is currently frozen
        if (isEdgeConnected(d, selectedNode) && !selectedEdge) {
          d3.select(this)
            .attr('stroke', '#3b82f6')
            .attr('stroke-opacity', 0.9)
            .attr('stroke-width', Math.sqrt(d.value) * 1.5)
          
          setHoveredEdge(d)
        }
      })
      .on('mouseleave', function(event, d: any) {
        // Only reset if no edge is frozen and this edge is hoverable
        if (isEdgeConnected(d, selectedNode) && !selectedEdge) {
          // Return to base state based on node selection
          const baseOpacity = selectedNode && isEdgeConnected(d, selectedNode) ? 0.8 : 0.5
          const baseWidth = selectedNode && isEdgeConnected(d, selectedNode) 
            ? Math.sqrt(d.value) * 1.2
            : Math.sqrt(d.value)
          
          d3.select(this)
            .attr('stroke', '#999')
            .attr('stroke-opacity', baseOpacity)
            .attr('stroke-width', baseWidth)
          
          setHoveredEdge(null)
        }
      })
      .on('click', function(event, d: any) {
        event.stopPropagation()
        
        // Only allow edge click if: no node selected OR edge connects to selected node
        if (isEdgeConnected(d, selectedNode)) {
          const clickingSameEdge = isSameEdge(selectedEdge, d)
          
          // Reset all edges first
          link.each(function(linkData: any) {
            const baseOpacity = selectedNode && isEdgeConnected(linkData, selectedNode) ? 0.8 : 0.5
            const baseWidth = selectedNode && isEdgeConnected(linkData, selectedNode)
              ? Math.sqrt(linkData.value) * 1.2
              : Math.sqrt(linkData.value)
            
            d3.select(this)
              .attr('stroke', '#999')
              .attr('stroke-opacity', selectedNode && !isEdgeConnected(linkData, selectedNode) ? 0.05 : baseOpacity)
              .attr('stroke-width', baseWidth)
          })
          
          if (clickingSameEdge) {
            // Unfreeze
            setSelectedEdge(null)
          } else {
            // Freeze this edge
            d3.select(this)
              .attr('stroke', '#3b82f6')
              .attr('stroke-opacity', 0.9)
              .attr('stroke-width', Math.sqrt(d.value) * 1.5)
            
            setSelectedEdge(d)
          }
        }
      })

    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 20)
      .attr('fill', '#10b981')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', function(event, d: any) {
        event.stopPropagation()
        
        simulation.stop()
        
        const newSelected = selectedNode === d.id ? null : d.id
        setSelectedNode(newSelected)
        setSelectedEdge(null)
        setHoveredEdge(null)
        
        if (newSelected) {
          const connected = getConnectedNodes(newSelected)
          
          node
            .transition().duration(200)
            .attr('opacity', (n: any) => connected.has(n.id) ? 1 : 0.15)
            .attr('fill', (n: any) => n.id === newSelected ? '#ef4444' : '#10b981')
          
          link
            .transition().duration(200)
            .attr('stroke', '#999')
            .attr('stroke-opacity', (l: any) => isEdgeConnected(l, newSelected) ? 0.8 : 0.05)
            .attr('stroke-width', (l: any) => {
              return isEdgeConnected(l, newSelected) ? Math.sqrt(l.value) * 1.2 : Math.sqrt(l.value)
            })
          
          labels
            .transition().duration(200)
            .attr('opacity', (n: any) => connected.has(n.id) ? 1 : 0.15)
        } else {
          node
            .transition().duration(200)
            .attr('opacity', 1)
            .attr('fill', '#10b981')
          link
            .transition().duration(200)
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.5)
            .attr('stroke-width', (d: any) => Math.sqrt(d.value))
          labels
            .transition().duration(200)
            .attr('opacity', 1)
          
          simulation.alpha(0.3).restart()
        }
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)

    const labels = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d: any) => d.id)
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#fff')
      .style('pointer-events', 'none')

    node.append('title')
      .text((d: any) => d.id)

    svg.on('click', () => {
      setSelectedNode(null)
      setSelectedEdge(null)
      setHoveredEdge(null)
      node.transition().duration(200).attr('opacity', 1).attr('fill', '#10b981')
      link.transition().duration(200)
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', (d: any) => Math.sqrt(d.value))
      labels.transition().duration(200).attr('opacity', 1)
      simulation.alpha(0.3).restart()
    })

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y)

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y)
    })

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [data, topN, selectedNode, selectedEdge])

  useEffect(() => {
    if (selectedNode === null && simulationRef.current) {
      simulationRef.current.alpha(0.3).restart()
    }
  }, [selectedNode])

  const displayEdge = selectedEdge || hoveredEdge

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 550, border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }} />
      
      {displayEdge && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: '#fff',
          border: '2px solid #3b82f6',
          borderRadius: 8,
          padding: 16,
          maxWidth: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#3b82f6' }}>
            {(typeof displayEdge.source === 'object' ? displayEdge.source.id : displayEdge.source)} ↔ {(typeof displayEdge.target === 'object' ? displayEdge.target.id : displayEdge.target)}
          </div>
          <div style={{ fontSize: 13, marginBottom: 8, color: '#666' }}>
            Co-occurred {displayEdge.value} times
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Class Pair Distribution:</div>
          <div style={{ fontSize: 12, maxHeight: 150, overflow: 'auto' }}>
            {Object.entries(displayEdge.classPairs)
              .sort((a: any, b: any) => b[1] - a[1])
              .map(([pair, count]: any) => (
                <div key={pair} style={{ padding: '2px 0', color: '#444' }}>
                  • {pair}: <strong>{count}</strong>
                </div>
              ))}
          </div>
        </div>
      )}
      
      <div style={{ marginTop: 12, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Click node to focus • Click edge to freeze details • Drag nodes • Scroll to zoom
        {selectedNode && <span style={{ marginLeft: 12, color: '#ef4444', fontWeight: 600 }}>Selected: {selectedNode}</span>}
        {selectedEdge && <span style={{ marginLeft: 12, color: '#3b82f6', fontWeight: 600 }}>Edge Frozen</span>}
      </div>
    </div>
  )
}