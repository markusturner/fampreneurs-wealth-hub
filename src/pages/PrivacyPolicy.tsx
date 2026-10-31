import { Link } from 'react-router-dom'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { COMPANY_LEGAL_NAME, PRIVACY_CONTACT_EMAIL } from '@/lib/legal'

const PrivacyPolicy = () => (
  <LegalPageLayout
    title="Privacy Policy"
    path="/privacy-policy"
    description="How TruHeirs collects, uses, shares, and protects your personal and family information, and how to use your privacy rights."
  >
    <section>
      <h2>1. Who we are</h2>
      <p>
        TruHeirs is operated by {COMPANY_LEGAL_NAME} ("we," "us"), 1650 Marietta Boulevard NW Unit D58, Atlanta, GA 30318, USA.
        We are the data controller (and, under Colombia's Law 1581 of 2012, the "responsable del tratamiento") for personal data
        processed through the TruHeirs website and apps.
      </p>
    </section>

    <section>
      <h2>2. Information we collect</h2>
      <ul>
        <li>Account details: name, email, phone, mailing address, date of birth, program, and login credentials.</li>
        <li>Family and estate information you choose to enter: family members, trusts, assets, succession plans, workbooks, and uploaded documents.</li>
        <li>Financial information: linked bank or investment account data provided through our connection partners, payment records, and subscription status. We do not store full card numbers.</li>
        <li>Community content: posts, comments, messages, reactions, photos, videos, and polls.</li>
        <li>Communications: emails, support requests, AI chat conversations, and call recordings or notes when you take part in coaching calls.</li>
        <li>Device and usage data: device type, app version, push notification identifiers, pages viewed, and basic logs.</li>
      </ul>
      <p>Some of this information, such as financial and family data, may be considered sensitive. We only process it to provide the service you asked for.</p>
    </section>

    <section>
      <h2>3. How we use it and our legal bases</h2>
      <ul>
        <li>To provide your account, programs, tools, and support (performance of a contract).</li>
        <li>To keep the platform secure, prevent fraud, and moderate community content (legitimate interests).</li>
        <li>To send account, billing, security, and program notices (contract and legitimate interests).</li>
        <li>To send marketing emails, text messages, or push notifications, only when you have opted in (consent). You can withdraw consent at any time.</li>
        <li>To meet legal, tax, and accounting duties (legal obligation).</li>
      </ul>
    </section>

    <section>
      <h2>4. How we share it</h2>
      <p>We do not sell your personal information and we do not share it for cross-context behavioral advertising.</p>
      <ul>
        <li>Service providers who host, secure, or run parts of the service for us, such as cloud hosting and database providers, payment processors, email and text message providers, push notification providers, video and call recording tools, bank connection partners, and AI model providers.</li>
        <li>People you choose to share with, such as invited family members, successors, or advisors.</li>
        <li>Authorities when the law requires it, or to protect rights, safety, and property.</li>
        <li>A buyer or successor if our business is sold or merged, with notice to you.</li>
      </ul>
    </section>

    <section>
      <h2>5. Security</h2>
      <p>
        Data is encrypted in transit with TLS (HTTPS) and encrypted at rest by our hosting providers. Access is limited by role-based
        permissions, row-level access rules in our database, and optional multi-factor authentication. We keep an internal security
        incident log and will notify affected people and regulators of a data breach as required by law. No system is perfectly
        secure, so please protect your password.
      </p>
    </section>

    <section>
      <h2>6. How long we keep it</h2>
      <p>
        We keep your information while your account is active and as long as needed for the purposes above. When you delete your account,
        we delete or de-identify your personal data, except records we must keep for legal, tax, billing, fraud-prevention, or dispute reasons.
      </p>
    </section>

    <section>
      <h2>7. Your privacy rights</h2>
      <p>Depending on where you live, you may have the right to:</p>
      <ul>
        <li>Know and access the personal data we hold about you, and get a copy (portability).</li>
        <li>Correct inaccurate data.</li>
        <li>Delete your data.</li>
        <li>Object to or restrict certain processing, and withdraw consent at any time.</li>
        <li>Opt out of the sale or sharing of personal information and limit the use of sensitive personal information (we do neither).</li>
        <li>Not be treated differently for using your rights.</li>
        <li>Complain to a data protection authority.</li>
      </ul>
      <p>
        You can download your data and delete your account yourself in <Link className="underline" to="/profile-settings?tab=privacy">Profile Settings, Privacy</Link>.
        You can also email <a className="underline" href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>. We may need to verify your
        identity. We respond within 30 days (GDPR), 45 days (California), or the time limits of Colombian law. An authorized agent may
        make a request for you with your signed permission.
      </p>

      <h3>European Economic Area, UK, and Switzerland (GDPR)</h3>
      <p>
        Our legal bases are listed in section 3. Your data is processed in the United States. When we transfer data out of the EEA or UK,
        we rely on Standard Contractual Clauses or other approved safeguards.
      </p>

      <h3>California (CCPA / CPRA)</h3>
      <p>
        In the last 12 months we collected the categories listed in section 2 for the purposes in section 3 and shared them only with the
        recipients in section 4. We do not sell or share personal information, and we do not knowingly collect data from anyone under 16.
        We honor Global Privacy Control signals.
      </p>

      <h3>Colombia (Law 1581 of 2012, habeas data)</h3>
      <p>
        By accepting this policy you authorize us to process your personal data for the purposes in section 3. You have the right to know,
        update, correct, and delete your data, to ask for proof of your authorization, to be told how your data is used, to revoke your
        authorization, and to file complaints with the Superintendencia de Industria y Comercio (SIC). Inquiries are answered within 10
        business days and claims within 15 business days. Send requests to {PRIVACY_CONTACT_EMAIL}. Sensitive data is optional and you are
        not required to provide it.
      </p>
    </section>

    <section>
      <h2>8. Children</h2>
      <p>TruHeirs is only for adults 18 and older. We do not knowingly collect personal data from children. If you believe a child has given us data, contact us and we will delete it.</p>
    </section>

    <section>
      <h2>9. Communication choices</h2>
      <p>
        You can turn push notifications, update emails, marketing emails, and text messages on or off in Profile Settings, Privacy.
        Every marketing email includes an unsubscribe link. Reply STOP to any text message to opt out.
      </p>
    </section>

    <section>
      <h2>10. Changes and contact</h2>
      <p>
        We will tell you about material changes in the app and ask you to accept them. Questions? Email{' '}
        <a className="underline" href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a> or write to {COMPANY_LEGAL_NAME}, 1650 Marietta Boulevard NW Unit D58, Atlanta, GA 30318.
      </p>
    </section>
  </LegalPageLayout>
)

export default PrivacyPolicy
