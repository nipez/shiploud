import { useEffect } from 'react'
import LegalLayout from './LegalLayout'

export default function Terms() {
  useEffect(() => {
    document.title = 'Terms of Service — ShipLoud'
  }, [])

  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service (“Terms”) govern your use of <strong>ShipLoud</strong> — including{' '}
        <strong>getshiploud.com</strong>, <strong>app.getshiploud.com</strong>, the waitlist, and the early-access
        product — operated by Nicholas Perez / ShipLoud. By using ShipLoud, you agree to these Terms.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">The service</h2>
      <p>
        ShipLoud helps founders journal what they ship and generate draft posts and reply suggestions. Features
        may change, pause, or be removed as we iterate. Early access is provided <strong>as is</strong>.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Eligibility &amp; accounts</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>You must be able to form a binding contract and be at least 13 years old.</li>
        <li>You are responsible for your account credentials and for activity under your account.</li>
        <li>Provide accurate contact information (such as email) and keep it up to date.</li>
      </ul>

      <h2 className="!mt-8 text-xl font-black text-navy">Your content</h2>
      <p>
        You retain ownership of journals, drafts, notes, and other content you submit (“Your Content”). You grant
        us a limited license to host, process, and display Your Content solely to operate and improve ShipLoud
        (including generating drafts and suggestions). You are responsible for Your Content and for complying with
        third-party platform rules (including X) when you post.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Acceptable use</h2>
      <p>You agree not to:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Use ShipLoud for unlawful, harmful, or deceptive activity.</li>
        <li>Attempt to break, overload, or reverse engineer the service except as allowed by law.</li>
        <li>Upload malware or abuse APIs, rate limits, or other users.</li>
        <li>Misrepresent that AI-assisted drafts are human-written where disclosure is required.</li>
      </ul>

      <h2 className="!mt-8 text-xl font-black text-navy">AI-assisted output</h2>
      <p>
        Drafts and suggestions may be generated or assisted by automated systems. Outputs can be inaccurate or
        incomplete. You are solely responsible for reviewing, editing, and deciding what to post.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Fees</h2>
      <p>
        ShipLoud may be free during beta. Paid plans (if offered) will be described at purchase. Taxes may apply.
        Unless required by law, fees are non-refundable once charged.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Early access / as-is</h2>
      <p>
        During early access and beta, the product may be incomplete, buggy, or unavailable. We provide ShipLoud{' '}
        <strong>AS IS</strong> and <strong>AS AVAILABLE</strong>, without warranties of any kind, express or
        implied, including merchantability, fitness for a particular purpose, and non-infringement.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Termination</h2>
      <p>
        You may stop using ShipLoud at any time. We may suspend or terminate access if you violate these Terms, if
        required for security or legal reasons, or if we discontinue the product. Upon termination, your right to
        use the service ends; provisions that should survive (including limitation of liability) will survive.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, ShipLoud and Nicholas Perez will not be liable for indirect,
        incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill, arising
        from your use of the service. Our total liability for any claim relating to ShipLoud will not exceed the
        greater of (a) amounts you paid us for the service in the 12 months before the claim or (b) USD $50.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Indemnity</h2>
      <p>
        You agree to indemnify and hold harmless ShipLoud and Nicholas Perez from claims arising out of Your
        Content, your posts on third-party platforms, or your misuse of the service.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Privacy</h2>
      <p>
        Our{' '}
        <a className="font-extrabold text-orange underline decoration-orange/40 underline-offset-2" href="/privacy">
          Privacy Policy
        </a>{' '}
        describes how we handle personal information.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Michigan, USA, without regard to conflict-of-law
        rules. Courts in Michigan will have exclusive jurisdiction, except where applicable law requires otherwise.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Changes</h2>
      <p>
        We may update these Terms. We will post the new date on this page. Continued use after changes means you
        accept the updated Terms. If you disagree, stop using ShipLoud.
      </p>

      <h2 className="!mt-8 text-xl font-black text-navy">Contact</h2>
      <p>
        Questions? Email{' '}
        <a className="font-extrabold text-orange underline decoration-orange/40 underline-offset-2" href="mailto:hello@getshiploud.com">
          hello@getshiploud.com
        </a>
        .
      </p>
    </LegalLayout>
  )
}
