import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'

const APPLICATION_URL = 'https://famlytics.io/f/the-family-business-accelerator-d3q4x7'
// Replace with your actual VSL video (YouTube/Vimeo embed URL)
const VIDEO_EMBED_URL = 'https://www.youtube.com/embed/I5U-q4WvCVg'

export default function Apply() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const refCode = params.get('ref')
      if (refCode) {
        sessionStorage.setItem('affiliate_ref', refCode)
        localStorage.setItem('affiliate_ref', refCode)
      }
      let visitorId = localStorage.getItem('visitor_id')
      if (!visitorId) {
        visitorId = crypto.randomUUID()
        localStorage.setItem('visitor_id', visitorId)
      }
      supabase.from('page_views').insert({
        page_path: '/apply',
        visitor_id: visitorId,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        ref_code: refCode || null,
      }).then(() => {})
    } catch (e) {
      console.error('page view tracking failed', e)
    }
  }, [])

  // Build application URL with ref attribution so the form submission can be tied back
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const refCode = params?.get('ref') || (typeof window !== 'undefined' ? localStorage.getItem('affiliate_ref') : null)
  const applicationSrc = refCode
    ? `${APPLICATION_URL}#ref=${encodeURIComponent(refCode)}`
    : APPLICATION_URL

  return (
    <main className="min-h-screen bg-white">
      <Helmet>
        <title>Apply — The Fampreneurs</title>
        <meta name="description" content="Watch the video and apply to join The Fampreneurs — building strong family business legacies." />
        <link rel="canonical" href="https://truheirs.app/apply" />
      </Helmet>

      {/* Header */}
      <header className="py-8 flex justify-center">
        <img
          src="/lovable-uploads/cb7af8d2-0809-4d9d-8fa4-acfb507144de.png"
          alt="The Fampreneurs"
          className="h-16 object-contain"
        />
      </header>

      <section className="max-w-4xl mx-auto px-4 pb-16">
        {/* Step 1 */}
        <h1 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: '#290a52' }}>
          STEP 1: WATCH THIS VIDEO
        </h1>

        <div className="mt-6 rounded-xl overflow-hidden shadow-lg" style={{ backgroundColor: '#290a52' }}>
          <div className="text-center py-3 font-bold text-sm md:text-base" style={{ backgroundColor: '#ffb500', color: '#290a52' }}>
            🔊 CLICK TO TURN SOUND ON. THEN APPLY BELOW!
          </div>
          <div className="aspect-video">
            <iframe
              src={VIDEO_EMBED_URL}
              title="Apply video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Step 2 */}
        <h2 className="mt-14 text-center text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: '#290a52' }}>
          STEP 2: APPLY BELOW
        </h2>
        <p className="text-center text-muted-foreground mt-2 italic">
          (Only Apply AFTER You've Watched The Entire Video!)
        </p>

        <div className="mt-6 rounded-xl overflow-hidden border shadow-sm bg-white">
          <iframe
            src={applicationSrc}
            title="Application Form"
            className="w-full"
            style={{ height: '900px', border: 'none' }}
            allow="camera; microphone; autoplay; clipboard-write"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-xs" style={{ backgroundColor: '#290a52', color: '#ffffff' }}>
        <div className="max-w-3xl mx-auto px-4 space-y-3">
          <div className="font-bold tracking-widest">THE FAMPRENEURS</div>
          <p>© {new Date().getFullYear()} Social Business Solutions, LLC. All Rights Reserved.</p>
          <p className="opacity-80">
            This site is not a part of the Facebook website or Facebook Inc. FACEBOOK is a trademark of FACEBOOK, Inc.
          </p>
        </div>
      </footer>
    </main>
  )
}
