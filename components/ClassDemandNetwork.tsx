import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

interface ClassDemandNetworkProps {
  data: any[]
}

export default function ClassDemandNetwork({ data }: ClassDemandNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<any>(null)
  const simulationRef = useRef<any>(null)

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return

    const classPairCounts: Record<string, number> = {}
    const allClasses = new Set<string>()

    data.forEach(row => {
      if (!row.classes) return
      
      const c1 = row.classes.c1Name
      const c2 = row.classes.c2Name
      
      allClasses.add(c1)
      allClasses.add(c2)
      
      const pairKey = [c1, c2].sort().join('|||')
      classPairCounts[pairKey] = (classPairCounts[pairKey] || 0) + 1
    })

    const nodes = Array.from(allClasses).map(cls => ({ id: cls, label: cls }))
    const links: any[] = []
    Object.entries(classPairCounts).forEach(([pairKey, count]) => {
      const [c1, c2] = pairKey.split('|||')
      if (c1 !== c2) {
        links.push({ source: c1, target: c2, value: count })
      }
    })

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = 500

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50))
    
    simulationRef.current = simulation

    const g = svg.append('g')

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
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

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt(d.value) * 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d: any) {
        // Allow hover on any edge that's connected to selected node (or all if no selection)
        if (isEdgeConnected(d, selectedNode)) {
          d3.select(this)
            .attr('stroke', '#3b82f6')
            .attr('stroke-opacity', 0.9)
          
          setHoveredEdge(d)
        }
      })
      .on('mouseleave', function(event, d: any) {
        if (isEdgeConnected(d, selectedNode)) {
          // Return to appropriate state
          const isConnected = selectedNode && isEdgeConnected(d, selectedNode)
          const opacity = isConnected ? 0.8 : 0.6
          
          d3.select(this)
            .attr('stroke', '#999')
            .attr('stroke-opacity', opacity)
          
          setHoveredEdge(null)
        }
      })

    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 25)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', function(event, d: any) {
        event.stopPropagation()
        
        simulation.stop()
        
        const newSelected = selectedNode === d.id ? null : d.id
        setSelectedNode(newSelected)
        setHoveredEdge(null)
        
        if (newSelected) {
          const connected = getConnectedNodes(newSelected)
          
          node
            .transition().duration(200)
            .attr('opacity', (n: any) => connected.has(n.id) ? 1 : 0.15)
            .attr('fill', (n: any) => n.id === newSelected ? '#ef4444' : '#3b82f6')
          
          link
            .transition().duration(200)
            .attr('stroke-opacity', (l: any) => {
              return isEdgeConnected(l, newSelected) ? 0.8 : 0.05
            })
            .attr('stroke-width', (l: any) => {
              return isEdgeConnected(l, newSelected) ? Math.sqrt(l.value) * 2.5 : Math.sqrt(l.value) * 2
            })
          
          labels
            .transition().duration(200)
            .attr('opacity', (n: any) => connected.has(n.id) ? 1 : 0.15)
        } else {
          node
            .transition().duration(200)
            .attr('opacity', 1)
            .attr('fill', '#3b82f6')
          link
            .transition().duration(200)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', (d: any) => Math.sqrt(d.value) * 2)
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
      .text((d: any) => d.label)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#fff')
      .style('pointer-events', 'none')

    node.append('title')
      .text((d: any) => d.label)

    svg.on('click', () => {
      setSelectedNode(null)
      setHoveredEdge(null)
      node.transition().duration(200).attr('opacity', 1).attr('fill', '#3b82f6')
      link.transition().duration(200).attr('stroke-opacity', 0.6).attr('stroke-width', (d: any) => Math.sqrt(d.value) * 2)
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
  }, [data, selectedNode])

  useEffect(() => {
    if (selectedNode === null && simulationRef.current) {
      simulationRef.current.alpha(0.3).restart()
    }
  }, [selectedNode])

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 500, border: '1px solid #eee', borderRadius: 8, background: '#fafafa' }} />
      
      {hoveredEdge && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: '#fff',
          border: '2px solid #3b82f6',
          borderRadius: 8,
          padding: 16,
          maxWidth: 250,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#3b82f6' }}>
            {(typeof hoveredEdge.source === 'object' ? hoveredEdge.source.id : hoveredEdge.source)} ↔ {(typeof hoveredEdge.target === 'object' ? hoveredEdge.target.id : hoveredEdge.target)}
          </div>
          <div style={{ fontSize: 14, color: '#444' }}>
            <strong>{hoveredEdge.value}</strong> tests between these classes
          </div>
        </div>
      )}
      
      <div style={{ marginTop: 12, fontSize: 13, color: '#666', textAlign: 'center' }}>
        Click node to focus • Hover edge for test count • Drag nodes • Scroll to zoom
        {selectedNode && <span style={{ marginLeft: 12, color: '#ef4444', fontWeight: 600 }}>Selected: {selectedNode}</span>}
      </div>
    </div>
  )
}