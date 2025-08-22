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

    // Reassign generations based on family relationships
    const assignGenerations = () => {
      const memberMap = new Map<string, FamilyMember>()
      validMembers.forEach(member => memberMap.set(member.name, member))
      
      // Reset all generations
      validMembers.forEach(member => member.generation = -1)
      
      // Find root members (those with no parents)
      const rootMembers = validMembers.filter(member => !member.parents || member.parents.length === 0)
      
      // Assign generations starting from roots
      const visited = new Set<string>()
      const assignGeneration = (member: FamilyMember, generation: number) => {
        if (visited.has(member.name) || member.generation !== -1) return
        visited.add(member.name)
        member.generation = generation
        
        // Find and assign spouse to same generation first
        if (member.children) {
          const spouses = validMembers.filter(other => 
            other.name !== member.name && 
            other.children && 
            other.children.some(child => member.children!.includes(child))
          )
          
          spouses.forEach(spouse => {
            if (spouse.generation === -1) {
              spouse.generation = generation
              visited.add(spouse.name)
            }
          })
        }
        
        // Then assign children to next generation
        if (member.children) {
          member.children.forEach(childName => {
            const child = memberMap.get(childName)
            if (child && !visited.has(child.name)) {
              assignGeneration(child, generation + 1)
            }
          })
        }
      }
      
      // Start with root members at generation 0
      rootMembers.forEach(root => assignGeneration(root, 0))
      
      // Handle any remaining members (siblings without parents specified)
      validMembers.forEach(member => {
        if (member.generation === -1) {
          // If they have children, try to infer generation from children
          if (member.children) {
            const childGenerations = member.children
              .map(childName => memberMap.get(childName))
              .filter(child => child && child.generation !== -1)
              .map(child => child!.generation)
            
            if (childGenerations.length > 0) {
              member.generation = Math.min(...childGenerations) - 1
            } else {
              member.generation = 0 // Default to root level
            }
          } else {
            member.generation = 0 // Default to root level
          }
        }
      })
    }
    
    assignGenerations()

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
      
      // Group married couples together
      const memberMap = new Map<string, FamilyMember>()
      validMembers.forEach(m => memberMap.set(m.name, m))
      
      const marriedPairs: FamilyMember[][] = []
      const singles: FamilyMember[] = []
      const processed = new Set<string>()
      
      members.forEach(member => {
        if (processed.has(member.name)) return
        
        if (member.children) {
          const spouses = members.filter(other => 
            other.name !== member.name && 
            !processed.has(other.name) &&
            other.children && 
            other.children.some(child => member.children!.includes(child))
          )
          
          if (spouses.length > 0) {
            marriedPairs.push([member, spouses[0]])
            processed.add(member.name)
            processed.add(spouses[0].name)
          } else {
            singles.push(member)
            processed.add(member.name)
          }
        } else {
          singles.push(member)
          processed.add(member.name)
        }
      })
      
      // Position married couples and singles
      const totalGroups = marriedPairs.length + singles.length
      const spacing = Math.max(300, 250 + (totalGroups * 30))
      const startX = -(totalGroups - 1) * spacing / 2
      
      let groupIndex = 0
      
      // Position married couples (side by side)
      marriedPairs.forEach(pair => {
        const groupX = startX + (groupIndex * spacing)
        const yPosition = generation * 180
        
        pair.forEach((member, pairIndex) => {
          const xPosition = groupX + (pairIndex - 0.5) * 200 // Side by side spacing
          
          let relationshipLabel = 'Family Member'
          const hasParents = member.parents && member.parents.length > 0
          const hasChildren = member.children && member.children.length > 0
          
          if (generation === 0 || (!hasParents && hasChildren)) {
            relationshipLabel = hasChildren ? 'Parent/Ancestor' : 'Elder'
          } else if (generation === maxGeneration || (hasParents && !hasChildren)) {
            relationshipLabel = 'Child/Descendant'
          } else if (hasParents && hasChildren) {
            relationshipLabel = 'Parent'
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
        groupIndex++
      })
      
      // Position singles
      singles.forEach(member => {
        const xPosition = startX + (groupIndex * spacing)
        const yPosition = generation * 180
        
        let relationshipLabel = 'Family Member'
        const hasParents = member.parents && member.parents.length > 0
        const hasChildren = member.children && member.children.length > 0
        
        if (generation === 0 || (!hasParents && hasChildren)) {
          relationshipLabel = hasChildren ? 'Parent/Ancestor' : 'Elder'
        } else if (generation === maxGeneration || (hasParents && !hasChildren)) {
          relationshipLabel = 'Child/Descendant'
        } else if (hasParents && hasChildren) {
          relationshipLabel = 'Parent'
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
        groupIndex++
      })
    })

    // Create edges for parent-child relationships
    validMembers.forEach(member => {
      if (member.parents) {
        member.parents.forEach(parentName => {
          const parentMember = validMembers.find(m => m.name.trim().toLowerCase() === (parentName || '').trim().toLowerCase())
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

    // Create edges for married couples (spouses)
    validMembers.forEach(member => {
      if (member.children) {
        const spouses = validMembers.filter(other => 
          other.name !== member.name && 
          other.id > member.id && // Avoid duplicate edges
          other.children && 
          other.children.some(child => member.children!.includes(child))
        )
        
        spouses.forEach(spouse => {
          edges.push({
            id: `marriage-${member.id}-${spouse.id}`,
            source: member.id,
            target: spouse.id,
            type: 'straight',
            style: { 
              stroke: '#ef4444', 
              strokeWidth: 2,
              strokeDasharray: '5,5'
            },
            label: '♥',
            labelStyle: { fill: '#ef4444', fontWeight: 'bold' }
          })
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