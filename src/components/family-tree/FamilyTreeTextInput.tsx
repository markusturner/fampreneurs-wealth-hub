import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

interface FamilyMember {
  id: string
  name: string
  generation: number
  parents?: string[]
  children?: string[]
}

interface FamilyTreeTextInputProps {
  onFamilyDataChange: (members: FamilyMember[]) => void
}

export function FamilyTreeTextInput({ onFamilyDataChange }: FamilyTreeTextInputProps) {
  const [textInput, setTextInput] = useState(`John Smith
├─ married to Mary Johnson
├─ children: 
│  ├─ David Smith
│  │  ├─ married to Sarah Wilson
│  │  └─ children: Emma Smith, Lucas Smith
│  └─ Lisa Smith
│     └─ children: Michael Brown
└─ parents: Robert Smith, Helen Smith`)

  const parseFamilyText = (text: string): FamilyMember[] => {
    const lines = text.split('\n').filter(line => line.trim())
    const members: FamilyMember[] = []
    const relationships: { [key: string]: { parents: string[], children: string[] } } = {}

    // Simple parsing - extract names and relationships
    lines.forEach(line => {
      const cleanLine = line.replace(/[├─└│]/g, '').trim()
      
      if (cleanLine.includes('married to')) {
        const [person1, person2] = cleanLine.split('married to').map(s => s.trim())
        if (person1 && person2) {
          if (!relationships[person1]) relationships[person1] = { parents: [], children: [] }
          if (!relationships[person2]) relationships[person2] = { parents: [], children: [] }
        }
      } else if (cleanLine.includes('children:')) {
        // Skip the "children:" line itself
        return
      } else if (cleanLine.includes('parents:')) {
        const [person, parentsStr] = cleanLine.split('parents:').map(s => s.trim())
        if (person && parentsStr) {
          const parents = parentsStr.split(',').map(p => p.trim())
          if (!relationships[person]) relationships[person] = { parents: [], children: [] }
          relationships[person].parents = parents
          
          parents.forEach(parent => {
            if (!relationships[parent]) relationships[parent] = { parents: [], children: [] }
            if (!relationships[parent].children.includes(person)) {
              relationships[parent].children.push(person)
            }
          })
        }
      } else if (cleanLine && !cleanLine.includes(':')) {
        // This is likely a person's name
        const names = cleanLine.split(',').map(s => s.trim()).filter(Boolean)
        names.forEach(name => {
          if (!relationships[name]) relationships[name] = { parents: [], children: [] }
        })
      }
    })

    // Convert to FamilyMember objects
    Object.keys(relationships).forEach((name, index) => {
      const rel = relationships[name]
      // Simple generation calculation based on parent/child relationships
      let generation = 1
      if (rel.parents.length > 0) generation = 2
      if (rel.children.length > 0 && rel.parents.length === 0) generation = 0

      members.push({
        id: `person-${index}`,
        name,
        generation,
        parents: rel.parents.length > 0 ? rel.parents : undefined,
        children: rel.children.length > 0 ? rel.children : undefined
      })
    })

    return members
  }

  useEffect(() => {
    const familyData = parseFamilyText(textInput)
    onFamilyDataChange(familyData)
  }, [textInput, onFamilyDataChange])

  const handleExampleLoad = () => {
    setTextInput(`The Johnson Family
├─ William Johnson (Great Grandfather)
│  ├─ married to Margaret O'Brien
│  └─ children: Robert Johnson, Patricia Johnson
├─ Robert Johnson (Grandfather) 
│  ├─ married to Dorothy Smith
│  └─ children: Michael Johnson, Susan Johnson, Jennifer Johnson
├─ Michael Johnson (Father)
│  ├─ married to Lisa Davis
│  └─ children: Tommy Johnson, Sarah Johnson
├─ Tommy Johnson (Son)
└─ Sarah Johnson (Daughter)`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4" />
            How to format your family tree
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <p>• Use simple text with names on separate lines</p>
          <p>• Add "married to [spouse name]" for marriages</p>
          <p>• Add "children: [name1], [name2]" for children</p>
          <p>• Add "parents: [parent1], [parent2]" for parents</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleExampleLoad}
            className="mt-2"
          >
            Load Example
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="family-text">Describe Your Family Tree</Label>
        <Textarea
          id="family-text"
          placeholder="Enter your family information here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
        />
      </div>
    </div>
  )
}