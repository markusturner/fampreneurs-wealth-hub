import { useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Languages, Copy, CheckCircle2, CalendarIcon, ArrowRight } from "lucide-react"

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

type LangKey = keyof Translations

interface Props {
  onSubmitted?: () => void
}

const LANGUAGE_LABELS: Record<LangKey, { label: string; flag: string }> = {
  english: { label: "English", flag: "🇺🇸" },
  latin: { label: "Latin", flag: "🏛️" },
  hebrew: { label: "Hebrew", flag: "🇮🇱" },
  greek: { label: "Greek", flag: "🇬🇷" },
  spanish: { label: "Spanish", flag: "🇪🇸" },
  french: { label: "French", flag: "🇫🇷" },
  portuguese: { label: "Portuguese", flag: "🇵🇹" },
  arabic: { label: "Arabic", flag: "🇸🇦" },
}

const TRUST_STEPS = [
  { value: "business", label: "Business Trust" },
  { value: "ministry", label: "Ministry Trust" },
  { value: "family", label: "Family Trust" },
] as const

type TrustStepValue = (typeof TRUST_STEPS)[number]["value"]

export function TrustNameTranslator({ onSubmitted }: Props) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [translations, setTranslations] = useState<Translations | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Per-step state (reset between trusts)
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedLanguages, setSelectedLanguages] = useState<LangKey[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [submitting, setSubmitting] = useState(false)
  const [completedTrusts, setCompletedTrusts] = useState<TrustStepValue[]>([])

  const currentTrust = TRUST_STEPS[stepIndex]
  const allDone = stepIndex >= TRUST_STEPS.length

  const toggleLanguage = (lang: LangKey) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
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
      // Reset step state for the new name
      setStepIndex(0)
      setSelectedLanguages([])
      setSelectedDate(new Date())
      setCompletedTrusts([])
    } catch (err: any) {
      console.error("Translation error:", err)
      toast({ title: "Translation failed", description: err.message || "Could not translate the name.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    if (!user?.id || !translations) return
    if (selectedLanguages.length === 0) {
      toast({ title: "Select at least one language", description: "Choose the language(s) you want to save for this trust.", variant: "destructive" })
      return
    }
    if (!selectedDate) {
      toast({ title: "Select a date", description: "Pick the date you selected this name.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      // Build translations subset from selected languages
      const selectedTranslations: Partial<Translations> = {}
      for (const lang of selectedLanguages) {
        selectedTranslations[lang] = translations[lang]
      }

      const submittedAtIso = selectedDate.toISOString()

      const { error } = await supabase.from("trust_submissions").insert([
        {
          user_id: user.id,
          trust_type: "trust_name_translator",
          submitter_name: name.trim(),
          submitted_at: submittedAtIso,
          form_data: {
            source: "trust_name_translator",
            for_trust_type: currentTrust.value,
            original_name: name.trim(),
            selected_languages: selectedLanguages,
            name_selected_date: format(selectedDate, "yyyy-MM-dd"),
            translations: selectedTranslations,
          },
        },
      ] as any)
      if (error) throw error

      const newCompleted = [...completedTrusts, currentTrust.value]
      setCompletedTrusts(newCompleted)
      const nextIndex = stepIndex + 1
      toast({
        title: `${currentTrust.label} saved`,
        description: nextIndex < TRUST_STEPS.length
          ? `Next: ${TRUST_STEPS[nextIndex].label}`
          : "All three trusts have been submitted.",
      })

      // Reset for next step
      setSelectedLanguages([])
      setSelectedDate(new Date())
      setStepIndex(nextIndex)

      if (nextIndex >= TRUST_STEPS.length) {
        onSubmitted?.()
      }
    } catch (err: any) {
      console.error("Save error:", err)
      toast({ title: "Error", description: err.message || "Failed to save translation.", variant: "destructive" })
    } finally {
      setSubmitting(false)
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
        <div className="space-y-6">
          {/* Step progress */}
          <div className="flex flex-wrap items-center gap-2">
            {TRUST_STEPS.map((t, i) => {
              const done = completedTrusts.includes(t.value)
              const active = !allDone && i === stepIndex
              return (
                <div
                  key={t.value}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    done && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                    active && "border-[#ffb500] bg-[#ffb500]/10 text-[#290a52]",
                    !done && !active && "border-border/40 text-muted-foreground"
                  )}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  {t.label}
                </div>
              )
            })}
          </div>

          {/* All translations preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Translations</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.entries(translations) as [LangKey, string][]).map(([lang, value]) => {
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
          </div>

          {/* Per-trust step */}
          {!allDone ? (
            <div className="space-y-4 rounded-lg border-2 border-[#ffb500]/40 bg-[#ffb500]/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Step {stepIndex + 1} of {TRUST_STEPS.length}
                  </div>
                  <h3 className="text-base font-semibold text-[#290a52]">
                    {currentTrust.label}
                  </h3>
                </div>
              </div>

              {/* Language selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Select language(s) for this trust</Label>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                  {(Object.keys(LANGUAGE_LABELS) as LangKey[]).map((lang) => {
                    const info = LANGUAGE_LABELS[lang]
                    const checked = selectedLanguages.includes(lang)
                    return (
                      <label
                        key={lang}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 transition-colors",
                          checked ? "border-[#ffb500] bg-[#ffb500]/10" : "border-border/40 hover:border-primary/40"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleLanguage(lang)}
                        />
                        <span className="text-base">{info.flag}</span>
                        <span className="text-sm font-medium">{info.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Date picker */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Date you selected this name</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleContinue}
                  disabled={submitting || selectedLanguages.length === 0 || !selectedDate}
                  className="gap-2 hover:!bg-[#2eb2ff] hover:!text-white"
                  style={{ backgroundColor: "#ffb500", color: "#290a52" }}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : stepIndex === TRUST_STEPS.length - 1 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {stepIndex === TRUST_STEPS.length - 1 ? "Finish" : "Continue"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              All three trusts have been submitted successfully.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
