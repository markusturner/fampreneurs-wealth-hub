import { useCallback, useMemo, useEffect, memo } from 'react'
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
  Handle,
  Position,
  MiniMap,
} from '@xyflow/react'
import { Users, Heart, Baby, Crown } from 'lucide-react'

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

// Custom Family Tree Node Component
const FamilyNode = memo(({ data }: { data: any }) => {
  const { name, relationshipLabel, generation, hasChildren, hasParents } = data
  
  // Determine icon based on relationship
  const getIcon = () => {
    if (generation === 0) return <Crown className="h-4 w-4" />
    if (relationshipLabel.includes('Parent')) return <Users className="h-4 w-4" />
    if (relationshipLabel.includes('Child')) return <Baby className="h-4 w-4" />
    return <Heart className="h-4 w-4" />
  }
  
  // Get colors based on generation
  const getColors = () => {
    switch (generation) {
      case 0:
        return {
          background: 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)',
          border: '#f59e0b',
          iconColor: '#d97706'
        }
      case 1:
        return {
          background: 'linear-gradient(135deg, #dbeafe 0%, #3b82f6 100%)',
          border: '#2563eb',
          iconColor: '#1d4ed8'
        }
      default:
        return {
          background: 'linear-gradient(135deg, #f3e8ff 0%, #a855f7 100%)',
          border: '#9333ea',
          iconColor: '#7c3aed'
        }
    }
  }
  
  const colors = getColors()
  
  return (
    <div
      className="family-node"
      style={{
        background: colors.background,
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '12px',
        minWidth: '180px',
        minHeight: '90px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        position: 'relative',
      }}
    >
      {/* Connection Handles */}
      {hasParents && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: colors.border,
            width: '8px',
            height: '8px',
            border: 'none',
          }}
        />
      )}
      {hasChildren && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: colors.border,
            width: '8px',
            height: '8px',
            border: 'none',
          }}
        />
      )}
      
      <div className="flex flex-col items-center gap-1">
        <div style={{ color: colors.iconColor }}>
          {getIcon()}
        </div>
        <div className="font-semibold text-sm text-gray-800">{name}</div>
        <div className="text-xs text-gray-600">{relationshipLabel}</div>
      </div>
    </div>
  )
})

FamilyNode.displayName = 'FamilyNode'

const nodeTypes = {
  familyNode: FamilyNode,
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

    // Preserve input description order by recording first-seen index
    const orderMap: Record<string, number> = {}
    familyMembers.forEach((m, idx) => {
      if (m?.id) orderMap[m.id] = idx
    })

    // Group by generation for positioning
    const generationGroups: { [key: number]: FamilyMember[] } = {}
    validMembers.forEach(member => {
      if (!generationGroups[member.generation]) {
        generationGroups[member.generation] = []
      }
      generationGroups[member.generation].push(member)
    })

    // Create nodes positioned by generation with improved layout
    const generations = Object.keys(generationGroups).map(Number).sort((a, b) => a - b)
    const maxGeneration = Math.max(...generations)
    
    generations.forEach(generation => {
      const members = generationGroups[generation]
      const sortedMembers = members.slice().sort((a, b) => (orderMap[a.id] ?? 0) - (orderMap[b.id] ?? 0))
      
      sortedMembers.forEach((member, index) => {
        // Better horizontal spacing based on number of members in generation
        const totalMembers = sortedMembers.length
        const spacing = Math.max(250, 180 + (totalMembers * 20)) // Adaptive spacing
        const startX = -(totalMembers - 1) * spacing / 2
        const xPosition = startX + (index * spacing)
        
        // Improved vertical positioning
        const yPosition = generation * 180 // More spacing between generations

        // Enhanced relationship detection
        let relationshipLabel = 'Family Member'
        const hasParents = member.parents && member.parents.length > 0
        const hasChildren = member.children && member.children.length > 0
        
        if (generation === 0 || (!hasParents && hasChildren)) {
          relationshipLabel = hasChildren ? 'Ancestor/Elder' : 'Elder'
        } else if (generation === maxGeneration || (hasParents && !hasChildren)) {
          relationshipLabel = 'Descendant'
        } else if (hasParents && hasChildren) {
          relationshipLabel = 'Parent/Child'
        } else if (hasChildren) {
          relationshipLabel = 'Parent'
        } else if (hasParents) {
          relationshipLabel = 'Child'
        }

        nodes.push({
          id: member.id,
          type: 'familyNode',
          position: { x: xPosition, y: yPosition },
          data: { 
            name: member.name,
            relationshipLabel,
            generation,
            hasChildren: hasChildren,
            hasParents: hasParents
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
              animated: true,
              style: { 
                stroke: '#6366f1', 
                strokeWidth: 3,
                strokeDasharray: '0'
              },
              markerEnd: {
                type: 'arrowclosed' as const,
                color: '#6366f1',
                width: 20,
                height: 20
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
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 50 }}
          attributionPosition="bottom-left"
          style={{ width: '100%', height: '100%' }}
        >
          <Controls 
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Background gap={20} size={2} color="#e2e8f0" />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.data.generation) {
                case 0: return '#f59e0b'
                case 1: return '#2563eb'
                default: return '#9333ea'
              }
            }}
            maskColor="rgba(255, 255, 255, 0.9)"
            position="bottom-right"
            style={{
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}
          />
        </ReactFlow>
      )}
    </div>
  )
}