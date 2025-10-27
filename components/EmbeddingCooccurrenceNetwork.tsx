import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { EmbeddingCooccurrence, EmbeddingCooccurrenceByClass } from '@/lib/types'

interface EmbeddingCooccurrenceNetworkProps {
  cooccurrenceData: EmbeddingCooccurrence[]
  cooccurrenceByClass: EmbeddingCooccurrenceByClass[]
}

export default function EmbeddingCooccurrenceNetwork({ cooccurrenceData, cooccurrenceByClass }: EmbeddingCooccurrenceNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [clickFrozenEdge, setClickFrozenEdge] = useState<any>(null)
  const [hoveredEdge, setHoveredEdge] = useState<any>(null)
  const simulationRef = useRef<any>(null)
  const nodeSelectionRef = useRef<any>(null)
  const linkSelectionRef = useRef<any>(null)
  const labelSelectionRef = useRef<any>(null)

  useEffect(() => {
    if (!cooccurrenceData || cooccurrenceData.length === 0 || !svgRef.current) return
    
    const allEmbeddings = new Set<string>()
    cooccurrenceData.forEach(item => {
      allEmbeddings.add(item.embedding1)
      allEmbeddings.add(item.embedding2)
    })

    const nodes = Array.from(allEmbeddings).map(emb => ({ id: emb }))

    // Build links with class pair distribution
    const links = cooccurrenceData.map(item => {
      // Find class pair breakdown for this embedding pair
      const classPairBreakdown: Record<string, number> = {}
      
      cooccurrenceByClass
        .filter(cb => 
          (cb.embedding1 === item.embedding1 && cb.embedding2 === item.embedding2) ||
          (cb.embedding1 === item.embedding2 && cb.embedding2 === item.embedding1)
        )
        .forEach(cb => {
          const classPair = `${cb.class1} vs ${cb.class2}`
          classPairBreakdown[classPair] = cb.count
        })

      return {
        source: item.embedding1,
        target: item.embedding2,
        value: item.cooccurrence_count,
        classPairs: classPairBreakdown
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
      .style('pointer-events', 'auto')
      .on('mouseenter', function(event, d: any) {
        // Don't interfere with click-frozen edges
        if (clickFrozenEdge && isSameEdge(clickFrozenEdge, d)) return
        
        // Highlight this edge
        d3.select(this)
          .attr('stroke', '#3b82f6')
          .attr('stroke-opacity', 0.9)
          .attr('stroke-width', Math.sqrt(d.value) * 1.5)
        
        setHoveredEdge(d)
      })
      .on('mouseleave', function(event, d: any) {
        // Don't reset if this edge is click-frozen
        if (clickFrozenEdge && isSameEdge(clickFrozenEdge, d)) return
        
        // Reset to base state based on current selection
        // We need to recalculate because selectedNode might have changed
        const currentlySelected = selectedNode
        const isConnected = !currentlySelected || (
          (typeof d.source === 'object' ? d.source.id : d.source) === currentlySelected ||
          (typeof d.target === 'object' ? d.target.id : d.target) === currentlySelected
        )
        const baseOpacity = currentlySelected && isConnected ? 0.8 : 0.5
        const baseWidth = currentlySelected && isConnected ? Math.sqrt(d.value) * 1.2 : Math.sqrt(d.value)
        
        d3.select(this)
          .attr('stroke', '#999')
          .attr('stroke-opacity', baseOpacity)
          .attr('stroke-width', baseWidth)
        
        setHoveredEdge(null)
      })
      .on('click', function(event, d: any) {
        event.stopPropagation()
        
        const clickingSameEdge = clickFrozenEdge && isSameEdge(clickFrozenEdge, d)
        
        if (clickingSameEdge) {
          // Unfreeze - recalculate base state
          const currentlySelected = selectedNode
          const isConnected = !currentlySelected || (
            (typeof d.source === 'object' ? d.source.id : d.source) === currentlySelected ||
            (typeof d.target === 'object' ? d.target.id : d.target) === currentlySelected
          )
          const baseOpacity = currentlySelected && isConnected ? 0.8 : 0.5
          const baseWidth = currentlySelected && isConnected ? Math.sqrt(d.value) * 1.2 : Math.sqrt(d.value)
          
          d3.select(this)
            .attr('stroke', '#999')
            .attr('stroke-opacity', baseOpacity)
            .attr('stroke-width', baseWidth)
          
          setClickFrozenEdge(null)
        } else {
          // Reset previous frozen edge if exists
          if (clickFrozenEdge) {
            link.each(function(linkData: any) {
              if (isSameEdge(linkData, clickFrozenEdge)) {
                const currentlySelected = selectedNode
                const isConnected = !currentlySelected || (
                  (typeof linkData.source === 'object' ? linkData.source.id : linkData.source) === currentlySelected ||
                  (typeof linkData.target === 'object' ? linkData.target.id : linkData.target) === currentlySelected
                )
                const baseOpacity = currentlySelected && isConnected ? 0.8 : 0.5
                const baseWidth = currentlySelected && isConnected ? Math.sqrt(linkData.value) * 1.2 : Math.sqrt(linkData.value)
                d3.select(this)
                  .attr('stroke', '#999')
                  .attr('stroke-opacity', baseOpacity)
                  .attr('stroke-width', baseWidth)
              }
            })
          }
          
          // Freeze this edge
          d3.select(this)
            .attr('stroke', '#3b82f6')
            .attr('stroke-opacity', 0.9)
            .attr('stroke-width', Math.sqrt(d.value) * 1.5)
          
          setClickFrozenEdge(d)
        }
      })
    
    linkSelectionRef.current = link

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
        setClickFrozenEdge(null)
        setHoveredEdge(null)
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)
    
    nodeSelectionRef.current = node

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
    
    labelSelectionRef.current = labels

    node.append('title')
      .text((d: any) => d.id)

    svg.on('click', () => {
      setSelectedNode(null)
      setClickFrozenEdge(null)
      setHoveredEdge(null)
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
  }, [cooccurrenceData, cooccurrenceByClass])

  // Handle node selection changes
  useEffect(() => {
    if (!nodeSelectionRef.current || !linkSelectionRef.current || !labelSelectionRef.current) return

    const node = nodeSelectionRef.current
    const link = linkSelectionRef.current
    const labels = labelSelectionRef.current

    if (selectedNode) {
      // Build connected set
      const connected = new Set([selectedNode])
      link.each(function(l: any) {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source
        const targetId = typeof l.target === 'object' ? l.target.id : l.target
        if (sourceId === selectedNode) connected.add(targetId)
        if (targetId === selectedNode) connected.add(sourceId)
      })

      // Update nodes
      node.each(function(n: any) {
        d3.select(this)
          .attr('opacity', connected.has(n.id) ? 1 : 0.15)
          .attr('fill', n.id === selectedNode ? '#ef4444' : '#10b981')
      })

      // Update links - disable pointer events on unconnected edges
      link.each(function(l: any) {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source
        const targetId = typeof l.target === 'object' ? l.target.id : l.target
        const isConnected = sourceId === selectedNode || targetId === selectedNode

        d3.select(this)
          .attr('stroke-opacity', isConnected ? 0.8 : 0.05)
          .attr('stroke-width', isConnected ? Math.sqrt(l.value) * 1.2 : Math.sqrt(l.value))
          .style('pointer-events', isConnected ? 'auto' : 'none')
      })

      // Update labels
      labels.each(function(n: any) {
        d3.select(this).attr('opacity', connected.has(n.id) ? 1 : 0.15)
      })
    } else {
      // Reset all
      node.attr('opacity', 1).attr('fill', '#10b981')
      link
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', (d: any) => Math.sqrt(d.value))
        .style('pointer-events', 'auto')
      labels.attr('opacity', 1)

      if (simulationRef.current) {
        simulationRef.current.alpha(0.3).restart()
      }
    }
  }, [selectedNode])

  const displayEdge = clickFrozenEdge || hoveredEdge

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
        Click node to focus • Click edge to freeze • Hover edge for details • Drag nodes • Scroll to zoom
        {selectedNode && <span style={{ marginLeft: 12, color: '#ef4444', fontWeight: 600 }}>Selected: {selectedNode}</span>}
        {clickFrozenEdge && <span style={{ marginLeft: 12, color: '#3b82f6', fontWeight: 600 }}>Edge Frozen</span>}
      </div>
    </div>
  )
}