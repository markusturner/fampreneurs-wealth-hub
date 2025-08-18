import { useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Family tree node type
const nodeTypes = {};

// Initial family tree data
const initialNodes: Node[] = [
  // Grandparents generation
  {
    id: 'grandfather',
    type: 'default',
    data: { label: 'Robert Smith\n(Grandfather)\n1935-2018' },
    position: { x: 150, y: 0 },
    style: { 
      background: '#e3f2fd', 
      border: '2px solid #1976d2',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
  {
    id: 'grandmother',
    type: 'default',
    data: { label: 'Mary Smith\n(Grandmother)\n1938-2020' },
    position: { x: 300, y: 0 },
    style: { 
      background: '#fce4ec', 
      border: '2px solid #c2185b',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
  
  // Parents generation
  {
    id: 'father',
    type: 'default',
    data: { label: 'John Smith\n(Father)\n1960' },
    position: { x: 100, y: 150 },
    style: { 
      background: '#e8f5e8', 
      border: '2px solid #388e3c',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
  {
    id: 'mother',
    type: 'default',
    data: { label: 'Susan Smith\n(Mother)\n1962' },
    position: { x: 250, y: 150 },
    style: { 
      background: '#fff3e0', 
      border: '2px solid #f57c00',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
  {
    id: 'uncle',
    type: 'default',
    data: { label: 'Michael Smith\n(Uncle)\n1958' },
    position: { x: 400, y: 150 },
    style: { 
      background: '#f3e5f5', 
      border: '2px solid #7b1fa2',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
  
  // Current generation
  {
    id: 'self',
    type: 'default',
    data: { label: 'YOU\n(Current Head)\n1985' },
    position: { x: 50, y: 300 },
    style: { 
      background: '#ffecb3', 
      border: '3px solid #f9a825',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px',
      fontWeight: 'bold'
    },
  },
  {
    id: 'sibling1',
    type: 'default',
    data: { label: 'Sarah Smith\n(Sister)\n1987' },
    position: { x: 200, y: 300 },
    style: { 
      background: '#e1f5fe', 
      border: '2px solid #0277bd',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
  {
    id: 'sibling2',
    type: 'default',
    data: { label: 'David Smith\n(Brother)\n1990' },
    position: { x: 350, y: 300 },
    style: { 
      background: '#f1f8e9', 
      border: '2px solid #558b2f',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
  {
    id: 'cousin',
    type: 'default',
    data: { label: 'James Smith\n(Cousin)\n1988' },
    position: { x: 500, y: 300 },
    style: { 
      background: '#fafafa', 
      border: '2px solid #616161',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
  
  // Next generation
  {
    id: 'child1',
    type: 'default',
    data: { label: 'Emma Smith\n(Daughter)\n2015' },
    position: { x: 0, y: 450 },
    style: { 
      background: '#fce4ec', 
      border: '2px solid #ad1457',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
  {
    id: 'child2',
    type: 'default',
    data: { label: 'Oliver Smith\n(Son)\n2018' },
    position: { x: 150, y: 450 },
    style: { 
      background: '#e3f2fd', 
      border: '2px solid #1565c0',
      borderRadius: '8px',
      width: 120,
      height: 80,
      fontSize: '10px'
    },
  },
];

const initialEdges: Edge[] = [
  // Grandparents to parents
  { id: 'e1', source: 'grandfather', target: 'father', type: 'smoothstep', style: { stroke: '#666' } },
  { id: 'e2', source: 'grandmother', target: 'father', type: 'smoothstep', style: { stroke: '#666' } },
  { id: 'e3', source: 'grandfather', target: 'uncle', type: 'smoothstep', style: { stroke: '#666' } },
  { id: 'e4', source: 'grandmother', target: 'uncle', type: 'smoothstep', style: { stroke: '#666' } },
  
  // Parents to children
  { id: 'e5', source: 'father', target: 'self', type: 'smoothstep', style: { stroke: '#f9a825', strokeWidth: 3 } },
  { id: 'e6', source: 'mother', target: 'self', type: 'smoothstep', style: { stroke: '#f9a825', strokeWidth: 3 } },
  { id: 'e7', source: 'father', target: 'sibling1', type: 'smoothstep', style: { stroke: '#666' } },
  { id: 'e8', source: 'mother', target: 'sibling1', type: 'smoothstep', style: { stroke: '#666' } },
  { id: 'e9', source: 'father', target: 'sibling2', type: 'smoothstep', style: { stroke: '#666' } },
  { id: 'e10', source: 'mother', target: 'sibling2', type: 'smoothstep', style: { stroke: '#666' } },
  
  // Uncle to cousin
  { id: 'e11', source: 'uncle', target: 'cousin', type: 'smoothstep', style: { stroke: '#666' } },
  
  // Current generation to next
  { id: 'e12', source: 'self', target: 'child1', type: 'smoothstep', style: { stroke: '#f9a825', strokeWidth: 2 } },
  { id: 'e13', source: 'self', target: 'child2', type: 'smoothstep', style: { stroke: '#f9a825', strokeWidth: 2 } },
];

export function FamilyTreeVisualization() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}