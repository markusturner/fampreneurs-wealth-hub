import React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Theme Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((option) => {
            const Icon = option.icon
            return (
              <Button
                key={option.value}
                variant={theme === option.value ? 'default' : 'outline'}
                className="flex flex-col items-center space-y-2 p-4 h-auto"
                onClick={() => setTheme(option.value as any)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{option.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="theme-select">Theme Selection</Label>
        <Select value={theme} onValueChange={(value) => setTheme(value as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            {themeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <option.icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="text-sm text-muted-foreground">
        <p>Current theme: <span className="font-medium capitalize">{theme}</span></p>
        <p className="mt-1">
          {theme === 'system' 
            ? 'Automatically matches your device settings'
            : `Using ${theme} mode theme`
          }
        </p>
      </div>
    </div>
  )
}