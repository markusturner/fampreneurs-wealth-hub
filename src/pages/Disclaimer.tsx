import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { EDUCATIONAL_DISCLAIMER, TESTIMONIAL_DISCLOSURE } from '@/lib/legal'

const Disclaimer = () => (
  <LegalPageLayout
    title="Disclaimer"
    path="/disclaimer"
    description="TruHeirs content is educational only and is not legal, tax, or investment advice."
  >
    <section>
      <h2>Educational only</h2>
      <p>{EDUCATIONAL_DISCLAIMER}</p>
      <p>
        Trust templates, workbooks, structure diagrams, AI answers from Markus AI, dashboards, net worth figures, and coaching are general
        education and organizing tools. Laws differ by state and country, and your situation is unique. TruHeirs is not a law firm, CPA firm,
        broker-dealer, or registered investment adviser, and no attorney-client or fiduciary relationship is created.
      </p>
    </section>
    <section>
      <h2>AI answers</h2>
      <p>Markus AI can be wrong or out of date. Check important answers with a licensed professional.</p>
    </section>
    <section>
      <h2>Results and testimonials</h2>
      <p>{TESTIMONIAL_DISCLOSURE}</p>
      <p>
        We do not guarantee any income, savings, tax result, or asset protection. When a testimonial comes from someone who received something
        of value, such as a discount, free access, or a referral reward, we will say so.
      </p>
    </section>
    <section>
      <h2>Financial data</h2>
      <p>Balances and investment figures come from your entries or connected accounts and may be delayed or incomplete.</p>
    </section>
  </LegalPageLayout>
)

export default Disclaimer
