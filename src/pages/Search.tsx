import { UnifiedSearch } from "@/components/search/UnifiedSearch"
import { useSearchParams } from "react-router-dom"

export default function Search() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  return (
    <div className="container mx-auto max-w-4xl">
      <UnifiedSearch initialQuery={initialQuery} />
    </div>
  )
}