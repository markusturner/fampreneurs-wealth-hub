import { useCallback, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'

interface FamilyMember {
  id: string
  name: string
  generation: number
  parents?: string[]
  children?: string[]
}

interface DynamicFamilyTreeVisualizationProps {
  familyMembers: FamilyMember[]
}

export function DynamicFamilyTreeVisualization({ familyMembers }: DynamicFamilyTreeVisualizationProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!familyMembers.length) {
      return { nodes: [], edges: [] }
    }

    // Normalize and filter invalid entries (names must exist)
    const validMembers = familyMembers
      .map((m) => ({ ...m, name: (m.name || '').trim() }))
      .filter((m) => m.name && m.name.length > 1)

    if (validMembers.length === 0) {
      return { nodes: [], edges: [] }
    }

    const nodes: Node[] = []
    const edges: Edge[] = []

    // Group by generation for positioning
    const generationGroups: { [key: number]: FamilyMember[] } = {}
    validMembers.forEach(member => {
      if (!generationGroups[member.generation]) {
        generationGroups[member.generation] = []
      }
      generationGroups[member.generation].push(member)
    })

    // Create nodes positioned by generation
    Object.keys(generationGroups).forEach(gen => {
      const generation = parseInt(gen)
      const members = generationGroups[generation]
      
      members.forEach((member, index) => {
        const xPosition = (index - (members.length - 1) / 2) * 200
        const yPosition = generation * 150

        nodes.push({
          id: member.id,
          type: 'default',
          position: { x: xPosition, y: yPosition },
          data: { 
            label: (
              <div className="text-center font-semibold">{member.name}</div>
            )
          },
          style: {
            background: generation === 0 ? '#fef3c7' : generation === 1 ? '#dbeafe' : '#f3e8ff',
            border: '2px solid #d1d5db',
            borderRadius: '8px',
            width: 160,
            height: 80,
            fontSize: '12px'
          }
        })
      })
    })

    // Create edges for parent-child relationships
    validMembers.forEach(member => {
      if (member.parents) {
        member.parents.forEach(parentName => {
          const parentMember = validMembers.find(m => m.name === (parentName || '').trim())
          if (parentMember) {
            edges.push({
              id: `${parentMember.id}-${member.id}`,
              source: parentMember.id,
              target: member.id,
              type: 'smoothstep',
              style: { stroke: '#6b7280', strokeWidth: 2 },
              markerEnd: {
                type: 'arrowclosed' as const,
                color: '#6b7280'
              }
            })
          }
        })
      }
    })

    return { nodes, edges }
  }, [familyMembers])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  return (
    <div className="h-full w-full">
      {nodes.length === 0 ? (
        <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
          No family members generated yet. Click “Generate Family Tree”.
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 50 }}
          attributionPosition="bottom-left"
          style={{ width: '100%', height: '100%' }}
        >
          <Controls />
          <Background gap={12} size={1} />
        </ReactFlow>
      )}
    </div>
  )
}