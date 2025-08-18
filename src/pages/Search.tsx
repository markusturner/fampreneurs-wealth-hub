import { NavHeader } from "@/components/dashboard/nav-header"
import { UnifiedSearch } from "@/components/search/UnifiedSearch"
import { useSearchParams } from "react-router-dom"

export default function Search() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto">
          <UnifiedSearch initialQuery={initialQuery} />
        </div>
      </div>
    </div>
  )
}