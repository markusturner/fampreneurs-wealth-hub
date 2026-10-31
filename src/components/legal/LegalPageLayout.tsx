import { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { LEGAL_EFFECTIVE_DATE } from '@/lib/legal'

export function LegalPageLayout({ title, description, path, children }: {
  title: string
  description: string
  path: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{`${title} - TruHeirs`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://truheirs.app${path}`} />
      </Helmet>
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/auth" className="text-lg font-bold text-foreground">TruHeirs</Link>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/privacy-policy">Privacy</Link>
            <Link className="hover:text-foreground" to="/terms-of-service">Terms</Link>
            <Link className="hover:text-foreground" to="/community-guidelines">Guidelines</Link>
            <Link className="hover:text-foreground" to="/disclaimer">Disclaimer</Link>
            <Link className="hover:text-foreground" to="/dmca">DMCA</Link>
          </nav>
        </div>
      </header>
      <main id="main-content" className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {LEGAL_EFFECTIVE_DATE}</p>
        <div className="legal-prose mt-8 space-y-6 text-sm leading-relaxed text-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
          {children}
        </div>
      </main>
    </div>
  )
}
