import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

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


export function TrustNameTranslator({ onSubmitted }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [translations, setTranslations] = useState<Translations | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedTrustTypes, setSelectedTrustTypes] = useState<string[]>([])

  const TRUST_TYPE_OPTIONS = [
    { value: "family", label: "Family Trust" },
    { value: "business", label: "Business Trust" },
    { value: "ministry", label: "Ministry Trust" },
  ]

  const toggleTrustType = (value: string) => {
    setSelectedTrustTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const handleTranslate = async () => {
    if (!name.trim()) {
      toast({ title: "Missing field", description: "Please enter a name.", variant: "destructive" })
      return
    }

    setLoading(true)
    setTranslations(null)
    try {
      const { data, error } = await supabase.functions.invoke("translate-trust-name", {
        body: { name: name.trim() },
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
    if (selectedTrustTypes.length === 0) {
      toast({ title: "Select at least one trust type", description: "Choose Family, Business, and/or Ministry.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const rows = selectedTrustTypes.map((tt) => ({
        user_id: user.id,
        trust_type: tt,
        submitter_name: name.trim(),
        form_data: {
          source: "trust_name_translator",
          original_name: name.trim(),
          selected_trust_types: selectedTrustTypes,
          translations,
        },
      }))
      const { error } = await supabase.from("trust_submissions").insert(rows as any)
      if (error) throw error
      toast({ title: "Submitted!", description: `Saved for: ${selectedTrustTypes.join(", ")}` })
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
      <div className="space-y-2 max-w-md">
        <Label htmlFor="trust-name">Your Name (English)</Label>
        <Input
          id="trust-name"
          placeholder="e.g. John Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <Button
        onClick={handleTranslate}
        disabled={loading || !name.trim()}
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
              const isRtl = lang === "arabic" || lang === "hebrew"
              return (
                <Card key={lang} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{info.flag}</span>
                        <Badge variant="outline" className="text-xs font-medium">{info.label}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleCopy(lang, value)}
                      >
                        {copiedKey === lang ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p
                      className={`text-sm font-medium text-foreground leading-relaxed break-words ${isRtl ? "text-right font-serif" : ""}`}
                      dir={isRtl ? "rtl" : "ltr"}
                    >
                      {value}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="space-y-3 rounded-lg border border-border/50 p-4">
            <Label className="text-sm font-semibold">Select trust type(s) to submit</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {TRUST_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer rounded-md border border-border/40 px-3 py-2 hover:border-primary/40 transition-colors"
                >
                  <Checkbox
                    checked={selectedTrustTypes.includes(opt.value)}
                    onCheckedChange={() => toggleTrustType(opt.value)}
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || selectedTrustTypes.length === 0}
            className="gap-2 hover:!bg-[#2eb2ff] hover:!text-white"
            style={{ backgroundColor: "#ffb500", color: "#290a52" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Submit Translation
          </Button>
        </div>
      )}
    </div>
  )
}
