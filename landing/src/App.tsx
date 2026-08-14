import WaitlistForm from './WaitlistForm'
import ProductTour from './ProductTour'

const features = [
  {
    title: 'Voice drafts',
    body: 'Hooks, short lines, hard numbers. Marc Lou energy — not LinkedIn soup. Every draft sounds like you shipped something.',
    emoji: '🎙️',
    tint: 'bg-sticker-yellow',
  },
  {
    title: 'Ship journal → posts',
    body: 'Daily “what to ship/post today” prompts pulled from your actual build progress. No blank cursor. No guru threads.',
    emoji: '📓',
    tint: 'bg-sticker-mint',
  },
  {
    title: 'Reply radar',
    body: 'Who to engage today — accounts in your niche posting questions you can answer with receipts, not platitudes.',
    emoji: '📡',
    tint: 'bg-sticker-sky',
  },
  {
    title: 'Approval queue',
    body: 'Nothing goes out until you say so. Review, tweak, copy to X. Native posting lands later — control first.',
    emoji: '✅',
    tint: 'bg-sticker-pink',
  },
]

const steps = [
  {
    n: '1',
    title: 'Connect your goal',
    body: 'Tell ShipLoud what you’re building, who it’s for, and the MRR / launch target you’re chasing.',
  },
  {
    n: '2',
    title: 'Get daily drafts',
    body: 'Wake up to ship-log posts, reply targets, and a one-line prompt: what to ship or post today.',
  },
  {
    n: '3',
    title: 'Approve & post',
    body: 'Tweak in the queue, hit copy, paste into X. Loud, concrete, zero auto-spam.',
  },
]

const habitLoop = [
  {
    n: '1',
    title: 'Journal the ship',
    body: 'Log what you actually built today — not what you meant to tweet.',
  },
  {
    n: '2',
    title: 'Short options',
    body: 'A few drafts in your voice. Hooks and numbers — not webinar copy.',
  },
  {
    n: '3',
    title: 'Pick, copy, paste',
    body: 'Approve one. Copy it. Paste to X. Nothing goes out without you.',
  },
  {
    n: '4',
    title: 'Reply radar',
    body: 'Engage favorite builders already talking — not only broadcasting.',
  },
  {
    n: '5',
    title: 'Weekly receipts',
    body: 'Posts shipped + follower snapshots. See if the habit is working.',
  },
]

const stickers = [
  { label: 'Ship log', color: 'bg-sticker-yellow', rotate: '-rotate-6', top: 'top-6', left: 'left-3' },
  { label: 'Reply radar', color: 'bg-sticker-sky', rotate: 'rotate-6', top: 'top-16', right: 'right-4' },
  { label: '$10K MRR', color: 'bg-sticker-mint', rotate: 'rotate-3', top: 'top-[46%]', left: 'left-2' },
  { label: 'Day 1', color: 'bg-sticker-pink', rotate: '-rotate-3', top: 'top-[56%]', right: 'right-3' },
  { label: 'Approve first', color: 'bg-sticker-lilac', rotate: 'rotate-8', bottom: 'bottom-8', left: 'left-3' },
  { label: 'Copy → X', color: 'bg-sticker-yellow', rotate: '-rotate-8', bottom: 'bottom-16', right: 'right-4' },
]

function Sticker({
  label,
  color,
  rotate = '',
  className = '',
}: {
  label: string
  color: string
  rotate?: string
  className?: string
}) {
  return (
    <span className={`sticker ${color} ${rotate} px-3.5 py-1.5 text-sm sm:text-base ${className}`}>
      {label}
    </span>
  )
}

function Logo({ className = '' }: { className?: string }) {
  return (
    <a href="#top" className={`inline-flex items-center gap-2.5 font-black tracking-tight text-navy ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-orange shadow-[0_3px_0_#C9440A]" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <circle cx="11" cy="13" r="2.4" fill="#fff" />
          <circle cx="21" cy="13" r="2.4" fill="#fff" />
          <path d="M10 20c2.2 2.4 9.8 2.4 12 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <span>
        Ship<span className="text-orange">Loud</span>
      </span>
    </a>
  )
}

function ExampleDraft() {
  return (
    <div className="relative mx-auto w-full max-w-sm px-5 pb-8 pt-6 sm:px-8">
      <Sticker label="Day 14" color="bg-sticker-yellow" rotate="-rotate-6" className="absolute left-1 top-1 z-20 !text-xs sm:left-2 sm:!text-sm" />
      <Sticker label="Copy → X" color="bg-sticker-mint" rotate="rotate-6" className="absolute right-0 top-1 z-20 hidden !text-xs sm:inline-flex sm:right-1 sm:!text-sm" />
      <Sticker label="Approve first" color="bg-sticker-pink" rotate="-rotate-3" className="absolute bottom-1 left-1/2 z-20 -translate-x-1/2 !text-xs sm:!text-sm" />

      <article className="card-soft relative overflow-hidden border-2 border-navy/10 bg-white">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange font-black text-white shadow-[0_3px_0_#C9440A]">
            SL
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-extrabold text-navy">you · building in public</p>
              <span className="text-orange text-xs">✓</span>
            </div>
            <p className="text-sm font-semibold text-muted">@you · just now</p>
          </div>
          <span className="sticker bg-sticker-lilac !px-2.5 !py-0.5 !text-[10px] !shadow-none rotate-3">
            draft
          </span>
        </div>
        <div className="space-y-3 px-4 py-4 font-bold leading-relaxed text-navy">
          <p>Day 14 of building ShipLoud.</p>
          <p>
            Waitlist: <span className="text-orange">847 → 1,204</span> (+42%)
            <br />
            Code shipped: approval queue + reply radar
            <br />
            Revenue: still $0. That’s fine.
          </p>
          <p>
            Indie hackers don’t need another “how to grow on X” thread.
            <br />
            They need drafts that sound like they actually shipped.
          </p>
          <p className="text-muted font-semibold">What’s one thing you shipped this week?</p>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm font-bold text-muted">
          <span>♡ 24</span>
          <span>↻ 7</span>
          <span>💬 11</span>
          <span className="rounded-full bg-orange/10 px-2.5 py-0.5 text-xs font-extrabold text-orange">copy → X</span>
        </div>
      </article>
    </div>
  )
}

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[248px] sm:w-[272px]">
      <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-[72%] sm:left-0 sm:translate-x-0 sm:-translate-y-[60%] sm:-left-6">
        <span className="sticker bg-sticker-yellow -rotate-6 !px-2.5 !py-1 !text-[11px] sm:!text-xs">
          today’s journal → draft
        </span>
      </div>
      <div className="absolute -right-16 top-28 z-20 hidden md:block">
        <Sticker label="Reply radar" color="bg-sticker-sky" rotate="rotate-8" />
      </div>
      <div className="absolute -left-14 bottom-24 z-20 hidden md:block">
        <Sticker label="$10K MRR" color="bg-sticker-mint" rotate="rotate-3" />
      </div>
      <div className="absolute -right-14 bottom-6 z-20 hidden lg:block">
        <Sticker label="Founding $19" color="bg-sticker-pink" rotate="-rotate-6" />
      </div>

      {/* High-fidelity iPhone 15/16-style frame (pure CSS) */}
      <div className="iphone-stage relative mx-auto">
        <div className="iphone-shadow" aria-hidden />

        <div className="iphone-device" aria-label="ShipLoud app on iPhone">
          <span className="iphone-btn iphone-btn-silent" aria-hidden />
          <span className="iphone-btn iphone-btn-vol-up" aria-hidden />
          <span className="iphone-btn iphone-btn-vol-down" aria-hidden />
          <span className="iphone-btn iphone-btn-power" aria-hidden />

          <div className="iphone-frame">
            <div className="iphone-bezel">
              <div className="iphone-screen">
                <div className="iphone-island" aria-hidden>
                  <span className="iphone-island-camera" />
                </div>

                <div className="iphone-status">
                  <span className="iphone-time">9:41</span>
                  <div className="iphone-status-spacer" aria-hidden />
                  <div className="iphone-status-right" aria-hidden>
                    <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
                      <rect x="0.5" y="3.5" width="3" height="8" rx="0.6" fill="#2B1B4D" />
                      <rect x="4.5" y="2" width="3" height="9.5" rx="0.6" fill="#2B1B4D" />
                      <rect x="8.5" y="0.5" width="3" height="11" rx="0.6" fill="#2B1B4D" />
                      <rect x="12.5" y="0.5" width="3" height="11" rx="0.6" fill="#2B1B4D" opacity="0.28" />
                    </svg>
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <path
                        d="M8 2.2c2.2 0 4.1 0.9 5.5 2.3l-1.1 1.1A6.1 6.1 0 0 0 8 3.8c-1.7 0-3.2.7-4.3 1.8L2.6 4.5A7.7 7.7 0 0 1 8 2.2Zm0 3.1c1.3 0 2.5.5 3.4 1.4L10.3 7.8A3.3 3.3 0 0 0 8 6.8c-.9 0-1.7.3-2.3.9L4.6 6.7A4.7 4.7 0 0 1 8 5.3Zm0 3.2c.6 0 1.1.2 1.5.6L8 10.6 6.5 9.1c.4-.4.9-.6 1.5-.6Z"
                        fill="#2B1B4D"
                      />
                    </svg>
                    <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                      <rect x="0.5" y="1" width="21" height="10" rx="2.2" stroke="#2B1B4D" strokeWidth="1.2" />
                      <rect x="2" y="2.6" width="16.2" height="6.8" rx="1.2" fill="#2B1B4D" />
                      <path d="M23 4.2v3.6c.9-.5.9-3.1 0-3.6Z" fill="#2B1B4D" />
                    </svg>
                  </div>
                </div>

                <div className="iphone-app">
                  <p className="font-script text-[17px] leading-none text-orange">ship notes → X</p>
                  <h3 className="mt-1.5 text-[1.15rem] font-black leading-tight text-navy">
                    Draft ready. <span className="text-orange">Approve?</span>
                  </h3>
                  <div className="mt-3 space-y-2">
                    <div className="rounded-2xl border-2 border-dashed border-navy/15 bg-white/85 p-2.5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted">
                        📓 Journal note
                      </p>
                      <p className="mt-1 text-[13px] font-bold leading-snug text-navy">
                        Day 14 · waitlist 847→1204. Shipped reply radar.
                      </p>
                    </div>
                    <div className="flex justify-center" aria-hidden>
                      <span className="text-[11px] font-extrabold text-orange">↓ becomes</span>
                    </div>
                    <div className="rounded-2xl border-2 border-navy/10 bg-white p-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted">𝕏 Draft</p>
                        <span className="sticker bg-sticker-lilac !px-2 !py-0.5 !text-[9px] !shadow-none rotate-3">
                          ready
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-bold leading-snug text-navy">
                        Day 14 of building in public.
                        <br />
                        Waitlist <span className="text-orange">+42%</span>. Shipped reply radar.
                      </p>
                    </div>
                    <button className="btn-pill mt-0.5 w-full px-4 py-2.5 text-sm" type="button" tabIndex={-1}>
                      Copy → X
                    </button>
                  </div>
                </div>

                <div className="iphone-home" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div id="top" className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-navy/5 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo className="text-lg" />
          <nav className="hidden items-center gap-6 text-sm font-bold text-navy/80 md:flex">
            <a href="#problem" className="hover:text-orange transition">The problem</a>
            <a href="#habit" className="hidden hover:text-orange transition lg:inline">The habit</a>
            <a href="#how" className="hover:text-orange transition">How it works</a>
            <a href="#tour" className="hover:text-orange transition">Inside</a>
            <a href="#features" className="hover:text-orange transition">Features</a>
            <a href="#pricing" className="hover:text-orange transition">Pricing</a>
          </nav>
          <a href="#join" className="btn-pill px-4 py-2 text-sm">
            Join waitlist
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
          {/* Floating stickers (desktop) */}
          <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden>
            {stickers.map((s) => (
              <span
                key={s.label}
                className={`sticker absolute ${s.color} ${s.rotate} ${s.top ?? ''} ${s.bottom ?? ''} ${s.left ?? ''} ${s.right ?? ''} px-3.5 py-1.5 text-sm`}
              >
                {s.label}
              </span>
            ))}
          </div>

          <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="font-script text-2xl font-semibold text-orange sm:text-3xl">build in public →</p>
              <h1 className="mt-3 max-w-xl text-4xl font-black tracking-tight text-navy sm:text-5xl sm:leading-[1.08] lg:text-[3.35rem]">
                Turn today’s ship notes into{' '}
                <span className="text-orange">X posts people actually follow.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg font-semibold leading-relaxed text-muted sm:text-xl">
                Journal what you built. Get drafts + reply targets. Approve. Copy to X.
              </p>
              <p className="mt-2 max-w-lg text-base font-bold text-navy/75 sm:text-lg">
                No auto-spam. Built for founders shipping to <span className="text-orange">$10K MRR</span> and beyond.
              </p>
              <div className="relative mt-8 max-w-xl">
                <WaitlistForm id="hero-waitlist" />
              </div>
              <p className="mt-4 text-sm font-bold text-navy/70">
                For founders shipping to <span className="text-orange">$10K MRR</span> and beyond · not engagement farmers
              </p>

              {/* Mobile sticker row */}
              <div className="mt-8 flex flex-wrap gap-2 xl:hidden">
                <Sticker label="Ship log" color="bg-sticker-yellow" rotate="-rotate-3" className="!text-xs" />
                <Sticker label="Reply radar" color="bg-sticker-sky" rotate="rotate-3" className="!text-xs" />
                <Sticker label="Zero fluff" color="bg-sticker-mint" rotate="-rotate-2" className="!text-xs" />
                <Sticker label="Founding $19" color="bg-sticker-pink" rotate="rotate-2" className="!text-xs" />
              </div>
            </div>

            <div className="relative px-2 py-12 sm:py-14">
              <PhoneMock />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section id="problem" className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="font-script text-2xl text-orange">the problem →</p>
            <h2 className="mt-2 max-w-xl text-3xl font-black tracking-tight text-navy sm:text-4xl sm:max-w-2xl">
              Bio says build in public. Feed is Cursor questions.
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  emoji: '🛠️',
                  title: 'You ship… quietly',
                  body: 'You’re at 0–1K followers. You ask good questions. You reply to every SaaS launch. Your own ship log? Still in Notes.',
                },
                {
                  emoji: '🕳️',
                  title: 'The feed gap',
                  body: 'Your timeline is tool replies and “how I grew to 10K” threads you’ll never rewrite in your voice.',
                },
                {
                  emoji: '📣',
                  title: 'What actually compounds',
                  body: 'The accounts you admire post boring, concrete updates — numbers, screenshots, “day 12” — and quietly grow.',
                },
              ].map((card) => (
                <article key={card.title} className="card-soft p-6">
                  <div className="text-3xl" aria-hidden>
                    {card.emoji}
                  </div>
                  <h3 className="mt-3 text-xl font-black text-navy">{card.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-muted">{card.body}</p>
                </article>
              ))}
            </div>

            <p className="mt-10 max-w-2xl text-lg font-extrabold text-navy">
              ShipLoud turns your build progress into posts that sound like you shipped — not like you attended a webinar.
            </p>
          </div>
        </section>

        {/* The habit — why ShipLoud exists */}
        <section id="habit" className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="font-script text-2xl text-orange">the habit →</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-navy sm:text-4xl sm:leading-[1.12]">
              ShipLoud doesn’t buy reach.
              <span className="mt-2 block">
                It makes the posting habit that actually gets founders noticed.
              </span>
            </h2>

            <div className="mt-6 max-w-2xl space-y-4 text-base font-semibold leading-relaxed text-muted sm:text-lg">
              <p>
                Most indie founders already ship. They just never say it out loud. Bio says “build in public.” Feed is Cursor questions.
              </p>
              <p>
                Growth on X — at 0–1K — comes from boring, concrete receipts: what shipped, a number, a link, a day count. Accounts like Marc Lou compound because they post that almost every day, then reply to people already in the conversation.
              </p>
            </div>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {habitLoop.map((s) => (
                <li key={s.n} className="card-soft flex flex-col p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-navy bg-orange text-sm font-black text-white shadow-[0_3px_0_#C9440A]">
                    {s.n}
                  </span>
                  <h3 className="mt-3 text-lg font-black leading-snug text-navy">{s.title}</h3>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>

            <p className="mt-10 max-w-2xl text-lg font-extrabold leading-snug text-navy">
              Noticed = consistent ship logs + replies, not a viral thread. ShipLoud turns today’s work into those posts before you talk yourself out of it.
            </p>

            <div className="card-soft mt-8 max-w-2xl border-2 border-navy/10 p-6 sm:p-7">
              <p className="font-script text-xl text-orange">the honest bit →</p>
              <p className="mt-2 font-bold leading-relaxed text-navy">
                We don’t fake engagement or auto-post. Growth still comes from you showing up. The win is you actually show up, in a voice people follow.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="font-script text-2xl text-orange">how it works →</p>
            <h2 className="mt-2 max-w-lg text-3xl font-black tracking-tight text-navy sm:max-w-xl sm:text-4xl">
              Three friendly steps. <span className="text-orange">Zero guru energy.</span>
            </h2>

            <ol className="mt-12 grid gap-5 sm:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="card-soft relative p-6 pt-10">
                  <span className="absolute -top-4 left-6 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-navy bg-orange text-lg font-black text-white shadow-[0_3px_0_#C9440A]">
                    {s.n}
                  </span>
                  <h3 className="mt-2 text-xl font-black text-navy">{s.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <ProductTour />

        {/* Features */}
        <section id="features" className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="font-script text-2xl text-orange">the toolkit →</p>
            <h2 className="mt-2 max-w-xl text-3xl font-black tracking-tight text-navy sm:text-4xl">
              Everything you need to post like you ship.
            </h2>

            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {features.map((f, i) => (
                <article
                  key={f.title}
                  className={`card-soft p-6 ${i % 2 === 0 ? '-rotate-1' : 'rotate-1'} hover:rotate-0 transition`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`sticker ${f.tint} !px-2.5 !py-1 text-xl`} aria-hidden>
                      {f.emoji}
                    </span>
                    <div>
                      <h3 className="text-xl font-black text-navy">{f.title}</h3>
                      <p className="mt-2 text-sm font-semibold leading-relaxed text-muted">{f.body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Example draft */}
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="font-script text-2xl text-orange">example draft →</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-navy sm:text-4xl">
                Hook. Short lines. <span className="text-orange">Numbers.</span>
              </h2>
              <p className="mt-4 font-semibold leading-relaxed text-muted">
                ShipLoud drafts in a build-in-public voice — the kind that gets bookmarks from other builders, not likes from bots. You approve. Then you copy to X.
              </p>
              <ul className="mt-6 space-y-3 text-sm font-bold text-navy">
                <li className="flex items-center gap-2">
                  <span className="sticker bg-sticker-yellow !px-2 !py-0.5 !text-xs">✓</span>
                  Concrete metrics over vague inspiration
                </li>
                <li className="flex items-center gap-2">
                  <span className="sticker bg-sticker-mint !px-2 !py-0.5 !text-xs">✓</span>
                  Day counters & ship receipts
                </li>
                <li className="flex items-center gap-2">
                  <span className="sticker bg-sticker-pink !px-2 !py-0.5 !text-xs">✓</span>
                  One clear CTA / question at the end
                </li>
              </ul>
            </div>
            <ExampleDraft />
          </div>
        </section>

        {/* Pricing tease */}
        <section id="pricing" className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="card-soft relative mx-auto max-w-3xl border-2 border-navy/10 px-5 pb-8 pt-8 text-center sm:px-12 sm:pb-12 sm:pt-16">
            <div className="pointer-events-none absolute left-4 top-4 hidden sm:block" aria-hidden>
              <Sticker label="Free in beta" color="bg-sticker-mint" rotate="-rotate-6" className="!text-xs sm:!text-sm" />
            </div>
            <div className="pointer-events-none absolute right-4 top-5 hidden sm:block" aria-hidden>
              <Sticker label="Founding $19" color="bg-sticker-yellow" rotate="rotate-6" className="!text-xs sm:!text-sm" />
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:hidden">
              <Sticker label="Free in beta" color="bg-sticker-mint" rotate="-rotate-3" className="!text-xs" />
              <Sticker label="Founding $19" color="bg-sticker-yellow" rotate="rotate-3" className="!text-xs" />
            </div>
            <p className="font-script text-2xl text-orange">pricing →</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-navy sm:text-4xl">
              Free while in beta.
            </h2>
            <p className="mt-3 text-lg font-bold text-muted">
              Founding members lock <span className="text-orange">$19/mo</span> forever after launch.
            </p>
            <p className="mt-2 text-sm font-semibold text-muted">
              No annual trap. No “growth mastermind.” Just the engine.
            </p>
            <div className="mx-auto mt-8 max-w-md text-left">
              <WaitlistForm id="pricing-waitlist" size="md" />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="join" className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-script text-2xl text-orange">ready when you are →</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-navy sm:text-5xl">
              Draft. Ship. Grow. <span className="text-orange">Loud.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md font-semibold text-muted">
              Join indie hackers who are done lurk-replying and ready to post what they actually build.
            </p>
            <div className="relative mx-auto mt-8 max-w-md text-left">
              <WaitlistForm id="final-waitlist" />
            </div>
            <p className="mt-4 text-xs font-bold text-muted">No spam. One email when we’re live.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-navy/10 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Logo className="text-base" />
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted">
            <a href="/privacy" className="transition hover:text-orange">
              Privacy
            </a>
            <a href="/terms" className="transition hover:text-orange">
              Terms
            </a>
            <span>© 2026 ShipLoud · getshiploud.com</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
