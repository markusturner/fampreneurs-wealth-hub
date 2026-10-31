import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { PRIVACY_CONTACT_EMAIL } from '@/lib/legal'

const CommunityGuidelines = () => (
  <LegalPageLayout
    title="Community Guidelines"
    path="/community-guidelines"
    description="Rules for posting, commenting, and messaging in TruHeirs communities."
  >
    <p>Our communities are for families building and protecting a legacy. Keep it respectful, private, and helpful.</p>
    <section>
      <h2>Not allowed</h2>
      <ul>
        <li>Harassment, bullying, threats, or hate speech.</li>
        <li>Sexual, violent, or graphic content.</li>
        <li>Spam, scams, pyramid schemes, or unapproved selling.</li>
        <li>Sharing anyone's private details, documents, or account numbers without permission.</li>
        <li>Posting content you do not own or have rights to share.</li>
        <li>Promising income or results, or giving advice while claiming to be a licensed professional when you are not.</li>
        <li>Impersonating another person or TruHeirs staff.</li>
      </ul>
    </section>
    <section>
      <h2>Keep in mind</h2>
      <ul>
        <li>Posts from members and coaches are educational, not legal, tax, or investment advice.</li>
        <li>If you share a result or testimonial, say if it is not typical and if you got anything in return for sharing it.</li>
        <li>What is said on calls and in the community stays in the community.</li>
      </ul>
    </section>
    <section>
      <h2>Reporting and blocking</h2>
      <p>
        Open the menu on any message to report it or block its author. Blocked members' messages are hidden from you. Our moderators review
        reports, usually within 24 hours, and may remove content, warn, suspend, or remove members. Urgent safety issues: email {PRIVACY_CONTACT_EMAIL}.
      </p>
    </section>
  </LegalPageLayout>
)

export default CommunityGuidelines
