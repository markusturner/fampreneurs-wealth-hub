import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Lock, Server, KeyRound, Trash2, FileText, AlertTriangle, ShieldCheck, UserX, Umbrella, ClipboardCheck, Eye, Usb, BookOpen } from 'lucide-react';
import { navigateToRoute } from '@/utils/navigation';

const Item = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="w-5 h-5" style={{ color: '#FFB500' }} />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-2">{children}</CardContent>
  </Card>
);

const Security = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Security & Trust — TruHeirs</title>
        <meta name="description" content="How TruHeirs protects your documents, encrypts data, controls access, and handles incidents." />
        <link rel="canonical" href="https://truheirs.app/security" />
      </Helmet>

      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigateToRoute('/welcome')} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#290A52' }}>T</div>
            <span className="text-lg font-bold" style={{ color: '#ffb500' }}>TruHeirs</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-10 max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{ backgroundColor: 'rgba(41, 10, 82, 0.1)' }}>
            <Shield className="w-8 h-8" style={{ color: '#290A52' }} />
          </div>
          <h1 className="text-4xl font-bold mb-3">Security & Trust</h1>
          <p className="text-muted-foreground">
            This page is maintained by TruHeirs to answer common security and privacy questions about the platform. It reflects
            current controls we have enabled; it is not an independent certification.
          </p>
        </div>

        <div className="space-y-4">
          <Item icon={Lock} title="1. Are documents encrypted in transit and at rest?">
            Yes. All traffic between your device and TruHeirs runs over HTTPS/TLS. Files and database records are stored on
            Supabase infrastructure, which encrypts data at rest using AES-256, and backups inherit the same encryption.
          </Item>

          <Item icon={UserX} title="2. Who inside the company has access to my documents?">
            Access is limited to the platform owner (Markus Turner) and a small number of authorized administrators who need
            it to operate and support the app. Row-Level Security policies prevent staff and other users from reading your
            private trust documents through the app; direct database access is restricted, logged, and used only for support
            or legal requests.
          </Item>

          <Item icon={Server} title="3. Where are documents stored, and are backups encrypted?">
            Documents, database records, and file uploads are hosted on Supabase (built on AWS) in secure U.S. data centers.
            Supabase performs automated encrypted backups on a rolling schedule, so backup copies carry the same AES-256
            encryption as the live data.
          </Item>

          <Item icon={KeyRound} title="4. Does the TruHeirs app support multi-factor authentication?">
            Yes. You can enable two-factor authentication (2FA) from Profile Settings → Security. Once enabled, every sign-in
            requires your password plus a one-time code from your authenticator app.
          </Item>

          <Item icon={Trash2} title="5. How do I permanently delete my data if I leave?">
            You can request full account and document deletion by emailing privacy@truheirs.com from your registered email.
            We will permanently remove your profile, uploaded documents, trust submissions, and messages from live systems
            within 30 days, and encrypted backup copies age out on the standard backup retention cycle.
          </Item>

          <Item icon={FileText} title="6. Do you have a written privacy policy?">
            Yes — see our <button className="underline" style={{ color: '#290A52' }} onClick={() => navigateToRoute('/privacy-policy')}>Privacy Policy</button>. It covers what we collect, how we use it, who we share it with, and your rights.
          </Item>

          <Item icon={AlertTriangle} title="7. What is your protocol if there is ever a data breach?">
            If we confirm a breach that affects your personal information, we will (a) contain and investigate the incident,
            (b) notify affected users by email within 72 hours of confirmation, (c) explain what data was involved and what
            steps to take, and (d) report to regulators where required by law. Notices will come from a truheirs.com address.
            You can also report a suspected incident yourself from <b>Profile Settings → Security → Report incident</b>.
          </Item>

          <Item icon={ShieldCheck} title="8. What happens to my trust if my data is stolen after a breach?">
            Your legal trust document exists independently of the app — a data compromise does not invalidate or transfer
            ownership of the trust. In a worst case we help you re-secure your account (password reset, new 2FA, revoked
            sessions via the <b>Lock account</b> button in Profile Settings → Security) and, if any signed originals were
            exposed, coordinate with your trust attorney to reissue or re-notarize the affected documents. Use the
            <b> Request reissue</b> button in Profile Settings → Security to start that workflow.
          </Item>

          <Item icon={Shield} title="9. How bad could damage be if the website were hacked?">
            The most sensitive fields (passwords, 2FA secrets, API keys) are stored as one-way hashes or encrypted tokens, so
            they cannot be read even from a full database copy. Documents you upload live in a private storage bucket that
            requires an authenticated, signed URL to open. We do not store full Social Security numbers, bank passwords, or
            card numbers on our servers — banking is handled through Plaid's tokenized connection.
          </Item>

          <Item icon={UserX} title="10. What about identity fraud if my trust falls into the wrong hands?">
            A copy of your trust document alone cannot be used to move assets — funding changes require notarized signatures
            and, for real estate or accounts, third-party verification with the custodian. If you ever suspect your documents
            were exposed, use the <b>Lock account</b> button in Profile Settings → Security to sign out of every device
            instantly, then email privacy@truheirs.com — we will force a password + 2FA reset and connect you with your
            trust attorney to reissue the affected documents.
          </Item>

          <Item icon={Umbrella} title="11. What insurance protection do you offer?">
            TruHeirs is actively evaluating cyber liability and technology E&amp;O coverage for the platform. A policy has not
            yet been bound, so we do not want to overstate coverage. Once a policy is in force, this page will be updated
            with the carrier, coverage limits, and what it protects against. In the meantime, all of the technical safeguards
            above are in place, and no coverage on our side replaces your own homeowners, umbrella, or identity-theft policy
            for personal losses.
          </Item>

          <Item icon={Eye} title="12. Are admins who access my data logged and regularly reviewed?">
            Yes. Every admin action inside the app (viewing submissions, editing records, changing roles, unlocking accounts)
            is written to an audit log with the admin's user ID, timestamp, and IP. Direct database access on Supabase is also
            logged at the platform level. Markus Turner reviews the admin audit log at least monthly and after any support
            ticket that involved looking at customer data.
          </Item>

          <Item icon={ClipboardCheck} title="13. Are admins audited, and how often?">
            Yes. Admin accounts and their role assignments are reviewed on a quarterly cadence: we confirm each admin still
            needs the role, rotate credentials, and remove any accounts that are no longer active. Ad-hoc reviews also happen
            immediately whenever an admin leaves, changes responsibility, or if suspicious activity is flagged in the log.
          </Item>

          <Item icon={Usb} title="14. Do you support hardware security keys (YubiKey, HSM, PIV/PKI smart cards)?">
            Not yet. Today TruHeirs supports app-based TOTP two-factor authentication (Google Authenticator, Authy, 1Password,
            etc.), which is phishing-resistant when paired with a strong password. Hardware security keys such as YubiKey and
            other FIDO2/WebAuthn devices are on our roadmap; HSMs and PIV/PKI smart cards are reserved for enterprise
            deployments and are not available on the standard consumer plan. If hardware-key support is important to you,
            email privacy@truheirs.com and we will prioritize it.
          </Item>

          <Item icon={BookOpen} title="15. Do you have a formal security trust center page?">
            This page is our security trust center. It brings together our security practices (encryption, access controls,
            admin audits, incident response, MFA), links to the <button className="underline" style={{ color: '#290A52' }} onClick={() => navigateToRoute('/privacy-policy')}>Privacy Policy</button>, and explains the
            controls Supabase provides at the platform layer. It is app-owner editable content, not an independent third-party
            certification. Formal SOC 2 / ISO 27001 attestations are not yet in place; when they are, they will be linked here.
          </Item>

        </div>

        <div className="text-center mt-12 py-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Have another security question? Email <a className="underline" href="mailto:privacy@truheirs.com">privacy@truheirs.com</a>.
          </p>
          <Button onClick={() => navigateToRoute('/welcome')} size="lg" className="text-white hover:opacity-90" style={{ backgroundColor: '#290A52' }}>
            Return to TruHeirs
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Security;
