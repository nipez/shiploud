import { useEffect } from 'react'
import LegalLayout from './LegalLayout'

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy — ShipLoud'
  }, [])

  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how <strong>ShipLoud</strong> (operated by Nicholas Perez / ShipLoud;
        websites <strong>getshiploud.com</strong> and <strong>app.getshiploud.com</strong>) collects, uses, and
        shares information when you use our marketing site, waitlist, and early-access product.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Who we are</h2>
      <p>
        ShipLoud is an indie SaaS product that helps founders turn ship notes into social posts. Contact us at{' '}
        <a className="font-extrabold text-orange underline decoration-orange/40 underline-offset-2" href="mailto:hello@getshiploud.com">
          hello@getshiploud.com
        </a>
        .
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Information we collect</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Account &amp; contact data.</strong> Email address (and related account identifiers) when you join
          the waitlist, create an account, or sign in.
        </li>
        <li>
          <strong>Product content you create.</strong> Ship journals, notes, drafts, reply targets, setup details
          (e.g. goals, voice, project info), and similar content you enter in the app.
        </li>
        <li>
          <strong>X / social context you provide.</strong> Your X handle and public follower or profile snapshots
          you connect or paste so we can personalize drafts and reply suggestions. We treat this as product data
          you choose to share with us.
        </li>
        <li>
          <strong>First-party product analytics.</strong> Events about how you use ShipLoud (for example, pages
          viewed, features used, generate/approve actions) so we can improve the product.
        </li>
        <li>
          <strong>Technical data.</strong> Basic request metadata (IP address, browser/user agent, approximate
          location derived by our hosting provider) when you visit our sites.
        </li>
        <li>
          <strong>Cookies &amp; similar tech.</strong> We may use cookies or local storage for session, preferences,
          and waitlist/account continuity. We may use Google Analytics 4 (GA4) or similar analytics in the future;
          if enabled, GA4 may set cookies and collect usage metrics.
        </li>
      </ul>

      <h2 className="!mt-8 text-xl font-black text-navy">How we use information</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Provide, operate, and improve ShipLoud (including drafts, journals, and reply features).</li>
        <li>Communicate with you about access, product updates, and support.</li>
        <li>Secure the service, prevent abuse, and diagnose issues.</li>
        <li>Understand product usage through first-party analytics (and GA4 if we enable it).</li>
      </ul>

      <h2 className="!mt-8 text-xl font-black text-navy">How we share information</h2>
      <p>We do <strong>not sell</strong> your personal data.</p>
      <p>We share information only as needed to run the product, including with:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Cloudflare</strong> — hosting, CDN, security, and related infrastructure for our sites and app.
        </li>
        <li>
          Other vendors we may use for email, authentication, databases, AI inference, or analytics (only as
          needed to provide ShipLoud).
        </li>
        <li>Authorities if required by law, or to protect rights, safety, and the integrity of the service.</li>
      </ul>

      <h2 className="!mt-8 text-xl font-black text-navy">Data retention</h2>
      <p>
        We keep account, product, and analytics data while your account is active and for a reasonable period
        afterward (or as needed for legal, security, or operational reasons). You can ask us to delete your
        account data by emailing{' '}
        <a className="font-extrabold text-orange underline decoration-orange/40 underline-offset-2" href="mailto:hello@getshiploud.com">
          hello@getshiploud.com
        </a>
        .
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Your choices</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>You can update or delete content you store in the product (where the product allows).</li>
        <li>You can request access, correction, or deletion of personal data we hold about you.</li>
        <li>You can stop using the product and ask us to close your account.</li>
        <li>Browser controls can block cookies; some features may not work without them.</li>
      </ul>

      <h2 className="!mt-8 text-xl font-black text-navy">Security</h2>
      <p>
        We use reasonable technical and organizational measures appropriate for an early-stage product. No
        method of transmission or storage is perfectly secure.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Children</h2>
      <p>ShipLoud is not directed to children under 13, and we do not knowingly collect their personal information.</p>

      <h2 className="!mt-8 text-xl font-black text-navy">International users</h2>
      <p>
        We operate primarily from the United States. If you use ShipLoud from elsewhere, your information may be
        processed in the U.S. and other countries where our providers operate.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Changes</h2>
      <p>
        We may update this policy as the product evolves. We will post the updated date on this page. Continued
        use after changes means you accept the updated policy.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Contact</h2>
      <p>
        Questions about privacy? Email{' '}
        <a className="font-extrabold text-orange underline decoration-orange/40 underline-offset-2" href="mailto:hello@getshiploud.com">
          hello@getshiploud.com
        </a>
        .
      </p>
    </LegalLayout>
  )
}
