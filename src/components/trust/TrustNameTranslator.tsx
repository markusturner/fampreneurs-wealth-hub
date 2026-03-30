import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Languages, Copy, CheckCircle2 } from "lucide-react"

interface Translations {
  english: string
  latin: string
  hebrew: string
  greek: string
  spanish: string
  french: string
  portuguese: string
  arabic: string
}

interface Props {
  onSubmitted?: () => void
}

const LANGUAGE_LABELS: Record<keyof Translations, { label: string; flag: string }> = {
  english: { label: "English", flag: "🇺🇸" },
  latin: { label: "Latin", flag: "🏛️" },
  hebrew: { label: "Hebrew", flag: "🇮🇱" },
  greek: { label: "Greek", flag: "🇬🇷" },
  spanish: { label: "Spanish", flag: "🇪🇸" },
  french: { label: "French", flag: "🇫🇷" },
  portuguese: { label: "Portuguese", flag: "🇵🇹" },
  arabic: { label: "Arabic", flag: "🇸🇦" },
}

const TRUST_TYPES = [
  { value: "family", label: "Family Trust" },
  { value: "business", label: "Business Trust" },
  { value: "ministry", label: "Ministry Trust" },
]

export function TrustNameTranslator({ onSubmitted }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [trustType, setTrustType] = useState("")
  const [translations, setTranslations] = useState<Translations | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleTranslate = async () => {
    if (!name.trim() || !trustType) {
      toast({ title: "Missing fields", description: "Please enter a name and select a trust type.", variant: "destructive" })
      return
    }

    setLoading(true)
    setTranslations(null)
    try {
      const { data, error } = await supabase.functions.invoke("translate-trust-name", {
        body: { name: name.trim(), trustType },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setTranslations(data.translations)
    } catch (err: any) {
      console.error("Translation error:", err)
      toast({ title: "Translation failed", description: err.message || "Could not translate the name.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id || !translations) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("trust_submissions")
        .insert({
          user_id: user.id,
          trust_type: "trust_name_translator",
          submitter_name: name.trim(),
          form_data: {
            original_name: name.trim(),
            trust_type: trustType,
            translations,
          },
        } as any)
      if (error) throw error
      toast({ title: "Saved!", description: "Your translated trust name has been recorded." })
      onSubmitted?.()
    } catch (err: any) {
      console.error("Save error:", err)
      toast({ title: "Error", description: "Failed to save translation.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="trust-name">Your Name (English)</Label>
          <Input
            id="trust-name"
            placeholder="e.g. John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Trust Type</Label>
          <Select value={trustType} onValueChange={setTrustType}>
            <SelectTrigger>
              <SelectValue placeholder="Select trust type" />
            </SelectTrigger>
            <SelectContent>
              {TRUST_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleTranslate}
        disabled={loading || !name.trim() || !trustType}
        className="gap-2"
        style={{ backgroundColor: "#ffb500", color: "#290a52" }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
        {loading ? "Translating..." : "Translate Trust Name"}
      </Button>

      {/* Results */}
      {translations && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Translations</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.entries(translations) as [keyof Translations, string][]).map(([lang, value]) => {
              const info = LANGUAGE_LABELS[lang]
              if (!info) return null
              return (
                <Card key={lang} className="border-border/50">
                  <CardContent className="p-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{info.flag}</span>
                        <Badge variant="outline" className="text-xs">{info.label}</Badge>
                      </div>
                      <p className="text-sm text-foreground break-words" dir={lang === "arabic" || lang === "hebrew" ? "rtl" : "ltr"}>
                        {value}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleCopy(lang, value)}
                    >
                      {copiedKey === lang ? (
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 hover:!bg-[#2eb2ff] hover:!text-white"
            style={{ backgroundColor: "#ffb500", color: "#290a52" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Translation
          </Button>
        </div>
      )}
    </div>
  )
}
