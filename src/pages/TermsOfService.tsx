import { Link } from 'react-router-dom'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { COMPANY_LEGAL_NAME, PRIVACY_CONTACT_EMAIL } from '@/lib/legal'

const TermsOfService = () => (
  <LegalPageLayout
    title="Terms of Service"
    path="/terms-of-service"
    description="The terms that govern your use of the TruHeirs platform, programs, and community."
  >
    <section>
      <h2>1. Agreement</h2>
      <p>
        These Terms are a contract between you and {COMPANY_LEGAL_NAME} ("TruHeirs," "we"). By creating an account or using TruHeirs you agree
        to these Terms, our <Link className="underline" to="/privacy-policy">Privacy Policy</Link>, and our{' '}
        <Link className="underline" to="/community-guidelines">Community Guidelines</Link>. If you signed a separate program agreement, that
        agreement also applies and controls if the two conflict.
      </p>
    </section>

    <section>
      <h2>2. Eligibility</h2>
      <p>You must be at least 18 years old and able to form a binding contract. Accounts for anyone under 18 are not allowed and will be closed.</p>
    </section>

    <section>
      <h2>3. Educational service only</h2>
      <p>
        TruHeirs provides education, templates, and organizing tools about trusts, estates, family business, and wealth. We are not a law firm,
        accounting firm, broker-dealer, or registered investment adviser, and nothing on TruHeirs (including AI answers, workbooks, generated
        documents, and coaching) is legal, tax, or investment advice. Using TruHeirs does not create an attorney-client or fiduciary relationship.
        Have a licensed professional in your state or country review any document or plan before you rely on it. See our{' '}
        <Link className="underline" to="/disclaimer">Disclaimer</Link>.
      </p>
    </section>

    <section>
      <h2>4. No guarantee of results</h2>
      <p>
        We do not promise any income, savings, tax outcome, asset protection, or other result. Testimonials and examples are individual
        experiences, are not typical, and do not mean you will get the same results.
      </p>
    </section>

    <section>
      <h2>5. Your account</h2>
      <ul>
        <li>Give accurate information and keep it current.</li>
        <li>Keep your password private. You are responsible for activity on your account.</li>
        <li>Tell us right away at {PRIVACY_CONTACT_EMAIL} if you think your account was accessed without permission.</li>
      </ul>
    </section>

    <section>
      <h2>6. Community and user content</h2>
      <p>
        You keep ownership of what you post. You give us a non-exclusive license to host, display, and share it inside TruHeirs to run the service.
        You must follow the <Link className="underline" to="/community-guidelines">Community Guidelines</Link>. There is no tolerance for objectionable
        content or abusive users. You can report content and block members, and we may remove content or suspend accounts that break the rules,
        usually within 24 hours of a valid report.
      </p>
    </section>

    <section>
      <h2>7. Copyright (DMCA)</h2>
      <p>
        We respond to valid notices of copyright infringement and terminate repeat infringers. See our <Link className="underline" to="/dmca">DMCA policy</Link>{' '}
        for how to send a takedown notice or counter-notice.
      </p>
    </section>

    <section>
      <h2>8. Payments and cancellation</h2>
      <ul>
        <li>Paid plans are billed in advance at the price shown when you buy.</li>
        <li>Fees are non-refundable except where the law or your program agreement says otherwise.</li>
        <li>We will give at least 30 days' notice before changing subscription prices.</li>
        <li>You can cancel a subscription at any time. It ends at the close of the current billing period.</li>
        <li>App store purchases are also governed by Apple's or Google's terms, and are managed in your store account.</li>
      </ul>
    </section>

    <section>
      <h2>9. Messages</h2>
      <p>
        If you opt in, we may send push notifications, emails, and text messages. Consent to marketing messages is never a condition of purchase.
        You can opt out at any time in Profile Settings, by using the unsubscribe link in an email, or by replying STOP to a text.
      </p>
    </section>

    <section>
      <h2>10. Acceptable use</h2>
      <ul>
        <li>No illegal activity, fraud, harassment, or spam.</li>
        <li>No attempts to access other accounts or data, or to break or overload the service.</li>
        <li>No copying, reselling, or sharing program materials without written permission.</li>
      </ul>
    </section>

    <section>
      <h2>11. Disclaimers and limits of liability</h2>
      <p>
        The service is provided "as is" and "as available." To the extent the law allows, we disclaim implied warranties, and our total liability
        for any claim is limited to the amount you paid us in the 12 months before the claim. Some places do not allow these limits, so they may not apply to you.
      </p>
    </section>

    <section>
      <h2>12. Ending your account</h2>
      <p>
        You can delete your account at any time in Profile Settings, Privacy. We may suspend or end accounts that break these Terms. Access may also end when
        your program term ends unless you keep an active subscription.
      </p>
    </section>

    <section>
      <h2>13. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the State of New York, without regard to conflict-of-law rules. Disputes will be resolved by binding
        arbitration under the rules of the American Arbitration Association, except where local consumer law gives you the right to go to court.
      </p>
    </section>

    <section>
      <h2>14. Contact</h2>
      <p>{COMPANY_LEGAL_NAME}, 1650 Marietta Boulevard NW Unit D58, Atlanta, GA 30318. Email: {PRIVACY_CONTACT_EMAIL}.</p>
    </section>
  </LegalPageLayout>
)

export default TermsOfService
