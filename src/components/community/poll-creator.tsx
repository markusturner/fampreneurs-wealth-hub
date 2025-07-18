import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Plus, X, BarChart3 } from 'lucide-react'

interface PollCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPollCreated: (poll: {
    question: string
    options: string[]
    multiple_choice: boolean
  }) => void
}

export function PollCreator({ open, onOpenChange, onPollCreated }: PollCreatorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [multipleChoice, setMultipleChoice] = useState(false)
  const [creating, setCreating] = useState(false)

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const createPoll = async () => {
    if (!question.trim() || options.some(opt => !opt.trim())) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    const validOptions = options.filter(opt => opt.trim())
    if (validOptions.length < 2) {
      toast({
        title: "Error",
        description: "Poll must have at least 2 options",
        variant: "destructive"
      })
      return
    }

    onPollCreated({
      question: question.trim(),
      options: validOptions,
      multiple_choice: multipleChoice
    })

    // Reset form
    setQuestion('')
    setOptions(['', ''])
    setMultipleChoice(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Create Poll
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label>Options</Label>
            <div className="space-y-2 mt-1">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {options.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="multiple"
              checked={multipleChoice}
              onCheckedChange={setMultipleChoice}
            />
            <Label htmlFor="multiple">Allow multiple choices</Label>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={createPoll} disabled={creating} className="flex-1">
              Create Poll
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}