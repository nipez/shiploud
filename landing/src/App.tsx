import WaitlistForm from './WaitlistForm'

function SmileMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="6.5" cy="7.5" r="1.6" fill="#fff" />
      <circle cx="13.5" cy="7.5" r="1.6" fill="#fff" />
      <path
        d="M5.5 12c1.2 1.7 3 2.6 4.5 2.6s3.3-.9 4.5-2.6"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2.5 no-underline">
      <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-orange shadow-[0_3px_0_#C9440A]">
        <SmileMark />
      </span>
      <span className="text-[19px] font-black tracking-[-0.01em]">
        <span className="text-navy">Ship</span>
        <span className="text-orange">Loud</span>
      </span>
    </a>
  )
}

function WindowDots() {
  return (
    <span className="flex gap-[5px]">
      <span className="h-[9px] w-[9px] rounded-full bg-sticker-pink" />
      <span className="h-[9px] w-[9px] rounded-full bg-sticker-yellow" />
      <span className="h-[9px] w-[9px] rounded-full bg-sticker-mint" />
    </span>
  )
}

const DARK_PANEL =
  'flex flex-1 flex-col gap-[9px] rounded-2xl border border-white/[0.06] p-4 text-[#FFF8EF] [background:radial-gradient(120%_80%_at_50%_0%,#2A2438_0%,#15121F_55%,#0E0C14_100%)]'

export default function App() {
  return (
    <div id="top" className="min-h-dvh">
      <nav className="sticky top-0 z-50 border-b border-line bg-[rgba(251,246,233,.92)] backdrop-blur">
        <div className="mx-auto flex max-w-[1160px] items-center gap-6 px-6 py-3">
          <Logo />
          <div className="ml-3 hidden flex-1 items-center gap-[22px] md:flex">
            {[
              ['#gap', 'The gap'],
              ['#how', 'How it works'],
              ['#inside', 'Inside'],
              ['#pricing', 'Pricing'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="whitespace-nowrap text-[13.5px] font-extrabold text-navy no-underline hover:text-orange"
              >
                {label}
              </a>
            ))}
          </div>
          <a href="#pricing" className="btn-pill ml-auto whitespace-nowrap px-5 py-2.5 text-[13.5px]">
            Join waitlist
          </a>
        </div>
      </nav>

      <header className="mx-auto grid max-w-[1160px] items-center gap-8 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-[72px]">
        <div>
          <p className="mb-2.5 font-script text-[27px] font-bold text-orange">build in public →</p>
          <h1 className="mb-[18px] text-4xl font-black leading-[1.04] tracking-[-0.02em] text-balance sm:text-[58px]">
            Turn today's ship notes into <span className="text-orange">X posts people actually follow.</span>
          </h1>
          <p className="mb-[26px] max-w-[520px] text-lg font-bold leading-[1.55] text-muted text-pretty">
            Journal what you built. Pick a short draft that sounds like you. Post to X from the app, or copy. Nothing
            goes out without your tap.
          </p>
          <WaitlistForm id="hero-waitlist" source="marketing-hero" />
          <p className="mt-3.5 text-[13px] font-bold text-muted">
            Free in beta · one email when we're live · for founders shipping to{' '}
            <span className="font-black text-orange">$10K MRR</span> and beyond, not engagement farmers.
          </p>
          <div className="mt-[26px] flex flex-wrap items-center gap-2">
            {['ship journal', '3 short drafts', 'you tap Post', 'replies on X', 'weekly receipts'].map((chip, i) => (
              <span key={chip} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-[13px] font-black text-orange">→</span>}
                <span className="rounded-full border-[1.5px] border-line bg-cream-2 px-3 py-1 text-xs font-extrabold">
                  {chip}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[460px]">
          <span className="sticker absolute -top-[30px] right-2.5 z-[3] rotate-[5deg] bg-sticker-yellow px-[15px] py-[7px] text-[13.5px]">
            Approve first
          </span>
          <span className="sticker absolute bottom-0.5 -left-1.5 z-[3] -rotate-[7deg] bg-sticker-sky px-[15px] py-[7px] text-[13.5px]">
            Day 1
          </span>
          <span className="sticker absolute -bottom-3.5 right-[22px] z-[3] rotate-[8deg] bg-sticker-mint px-[15px] py-[7px] text-[13.5px]">
            Zero fluff
          </span>

          <div className="card-soft relative z-[1] max-w-[400px] -rotate-2 rounded-3xl px-[22px] py-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10.5px] font-black tracking-[0.09em] text-orange">SHIP JOURNAL · TODAY</span>
              <span className="text-[11.5px] font-extrabold text-muted">Aug 14</span>
            </div>
            <p className="mb-0.5 text-[11px] font-extrabold text-muted">What shipped</p>
            <p className="mb-2.5 text-sm font-extrabold leading-snug">ShipLoud landing live at getshiploud.com</p>
            <p className="mb-0.5 text-[11px] font-extrabold text-muted">Numbers</p>
            <p className="mb-2.5 text-sm font-extrabold leading-snug">~9 followers · $0 MRR · 1 product shipped</p>
            <p className="mb-0.5 text-[11px] font-extrabold text-muted">Blocker / lesson</p>
            <p className="text-sm font-extrabold leading-snug">X login blocked. Decision: dogfood before pitch.</p>
          </div>
          <p className="relative z-[2] ml-[46%] my-0.5 -rotate-4 whitespace-nowrap font-script text-2xl font-bold text-orange">
            you approve →
          </p>
          <div className="relative z-[2] ml-11 max-w-[400px] rotate-2 rounded-3xl border border-white/10 px-[22px] py-5 text-[#FFF8EF] shadow-[0_18px_40px_rgba(43,27,77,.22)] [background:radial-gradient(120%_80%_at_50%_0%,#2A2438_0%,#15121F_55%,#0E0C14_100%)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10.5px] font-black tracking-[0.09em] text-[rgba(255,214,170,.75)]">
                DRAFT · FITS ONE POST
              </span>
              <span className="text-[11.5px] font-extrabold text-[rgba(245,240,255,.5)]">81/280</span>
            </div>
            <p className="mb-4 whitespace-pre-line text-[14.5px] font-bold leading-[1.55]">
              {`Shipped today.
ShipLoud landing

Not waiting for perfect.
getshiploud.com`}
            </p>
            <div className="flex gap-2">
              <span className="inline-flex items-center whitespace-nowrap rounded-full bg-orange px-[18px] py-[9px] text-[13px] font-black text-white shadow-[0_3px_0_#C9440A]">
                Post to X
              </span>
              <span className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-white/20 px-[18px] py-[9px] text-[13px] font-extrabold text-[#FFF8EF]/90">
                Copy
              </span>
            </div>
          </div>
        </div>
      </header>

      <section id="gap" className="mx-auto max-w-[1160px] px-6 py-14">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">the problem →</p>
        <h2 className="mb-[34px] max-w-[640px] text-[40px] font-black leading-[1.12] tracking-[-0.02em] text-balance">
          Bio says build in public.
          <br />
          Feed is Cursor questions.
        </h2>
        <div className="mb-[22px] grid gap-[18px] md:grid-cols-3">
          {[
            {
              n: '01',
              title: 'You ship… quietly',
              body: '0–1K followers. You ask good questions. You reply to every SaaS launch. Your own ship log is still in Notes.',
            },
            {
              n: '02',
              title: 'The feed gap',
              body: 'Your timeline is tool replies and "how I grew to 10K" threads you\'ll never rewrite in your voice.',
            },
            {
              n: '03',
              title: 'What actually compounds',
              body: 'The accounts you admire post boring, concrete updates. Numbers, screenshots, day 12. And quietly grow.',
            },
          ].map((c) => (
            <div key={c.n} className="card-soft rounded-[26px] p-6">
              <p className="mb-2 font-script text-2xl font-bold text-orange">{c.n}</p>
              <h3 className="mb-2 text-[17px] font-black">{c.title}</h3>
              <p className="text-sm font-bold leading-[1.55] text-muted text-pretty">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="max-w-[640px] text-[16.5px] font-extrabold text-pretty">
          ShipLoud turns your build progress into posts that sound like you shipped —{' '}
          <span className="bg-[linear-gradient(transparent_62%,#FFE566_62%)]">not like you attended a webinar.</span>
        </p>
      </section>

      <section id="how" className="mx-auto max-w-[1160px] px-6 py-14">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">the habit →</p>
        <h2 className="mb-[34px] max-w-[760px] text-[40px] font-black leading-[1.12] tracking-[-0.02em] text-balance">
          ShipLoud doesn't buy reach. It makes the posting habit that actually gets founders noticed.
        </h2>
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['1', 'Journal the ship', 'What shipped, numbers, blocker, link. Two minutes.'],
            ['2', 'Get short options', 'A few drafts in your voice. From the journal, not thin air.'],
            ['3', 'Approve & post', 'Post to X from the app, or copy. Nothing sends itself.'],
            ['4', 'Reply to builders', 'You write it. Tap Reply on X. Mark "I posted it."'],
            ['5', 'See the receipts', 'Posts, replies, follower snapshots. Was the habit real?'],
          ].map(([n, title, body]) => (
            <div key={n} className="rounded-[22px] border border-line bg-card p-[18px]">
              <span className="mb-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange text-[12.5px] font-black text-white shadow-[0_2px_0_#C9440A]">
                {n}
              </span>
              <h3 className="mb-1.5 text-[14.5px] font-black">{title}</h3>
              <p className="text-[12.5px] font-bold leading-normal text-muted">{body}</p>
            </div>
          ))}
        </div>
        <p className="mb-7 text-[16.5px] font-extrabold">
          Noticed = <span className="bg-[linear-gradient(transparent_62%,#FFE566_62%)]">consistent ship logs + replies</span>,
          not a viral thread.
        </p>
        <div className="grid items-stretch gap-[18px] lg:grid-cols-2">
          <div className="card-soft rounded-[26px] p-[26px]">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-black tracking-[0.08em] text-orange">SHIPLOUD IS</p>
                {[
                  'A ship journal that drafts your posts',
                  'An approve-first queue: Post to X, or copy',
                  'A feed of builders you chose, for replies you write',
                  'Weekly receipts of what you actually did',
                ].map((line) => (
                  <p key={line} className="mb-[9px] text-[13.5px] font-extrabold leading-snug last:mb-0">
                    <span className="text-orange">✓</span>&nbsp; {line}
                  </p>
                ))}
              </div>
              <div>
                <p className="mb-3 text-xs font-black tracking-[0.08em] text-muted">SHIPLOUD IS NOT</p>
                {[
                  'A scheduler',
                  'An auto-reply bot (X blocks those. Good.)',
                  'An algorithm or a growth hack',
                  'A fake waitlist screenshot',
                ].map((line) => (
                  <p key={line} className="mb-[9px] text-[13.5px] font-bold leading-snug text-muted last:mb-0">
                    <span className="font-black">✕</span>&nbsp; {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-[26px] border-[1.5px] border-dashed border-line bg-cream-2 p-[26px]">
            <p className="mb-2.5 font-script text-[26px] font-bold text-orange">the honest bit →</p>
            <p className="text-[16.5px] font-extrabold leading-relaxed text-pretty">
              We don't fake engagement or auto-post. Growth still comes from you showing up. The win is you actually
              show up, in a voice people follow.
            </p>
          </div>
        </div>
      </section>

      <section id="inside" className="mx-auto max-w-[1160px] px-6 py-14">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">see it →</p>
        <h2 className="mb-2.5 text-[40px] font-black leading-[1.12] tracking-[-0.02em]">Journal. Drafts. Replies.</h2>
        <p className="mb-[30px] text-[15.5px] font-bold text-muted">
          The loop in three screens. Short, concrete, ready to approve.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_12px_28px_rgba(43,27,77,.1)]">
              <div className="flex items-center gap-2.5 border-b border-line bg-[linear-gradient(180deg,#FFFDF7_0%,#F7F0DE_100%)] px-3.5 py-[11px]">
                <WindowDots />
                <span className="whitespace-nowrap text-[12.5px] font-extrabold text-muted">
                  <span className="font-black text-orange">01</span> Ship journal
                </span>
              </div>
              <div className="flex flex-1 flex-col bg-cream p-3">
                <div className={DARK_PANEL}>
                  <p className="text-[10px] font-black tracking-[0.09em] text-[rgba(255,214,170,.72)]">TODAY · SHIPLOUD</p>
                  <p className="text-base font-black text-[#FFFDF8]">What actually shipped</p>
                  {[
                    'ShipLoud landing live at getshiploud.com',
                    '~9 followers · $0 MRR · 1 product shipped',
                    'X login blocked. Decision: dogfood before pitch.',
                  ].map((line) => (
                    <div
                      key={line}
                      className="rounded-[10px] border border-white/10 bg-white/[0.04] px-[11px] py-[9px] text-[12.5px] font-bold leading-snug"
                    >
                      {line}
                    </div>
                  ))}
                  <span className="mt-auto inline-flex items-center justify-center whitespace-nowrap rounded-full bg-orange px-4 py-[9px] text-[12.5px] font-black text-white shadow-[0_3px_0_#C9440A]">
                    Save today's entry
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[13.5px] font-extrabold">Log it in two minutes. This is the source of truth.</p>
          </div>

          <div>
            <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_12px_28px_rgba(43,27,77,.1)]">
              <div className="flex items-center gap-2.5 border-b border-line bg-[linear-gradient(180deg,#FFFDF7_0%,#F7F0DE_100%)] px-3.5 py-[11px]">
                <WindowDots />
                <span className="whitespace-nowrap text-[12.5px] font-extrabold text-muted">
                  <span className="font-black text-orange">02</span> Pick a draft
                </span>
              </div>
              <div className="flex flex-1 flex-col bg-cream p-3">
                <div className={DARK_PANEL}>
                  <p className="text-[10px] font-black tracking-[0.09em] text-[rgba(255,214,170,.72)]">
                    DRAFTS · FROM YOUR JOURNAL
                  </p>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-[11px]">
                    <div className="mb-[7px] flex justify-between">
                      <span className="inline-flex rounded-full bg-sticker-yellow px-2 py-0.5 text-[9.5px] font-black tracking-wide text-navy">
                        FITS ONE POST
                      </span>
                      <span className="text-[10.5px] font-extrabold text-[rgba(245,240,255,.5)]">81/280</span>
                    </div>
                    <p className="whitespace-pre-line text-[12.5px] font-bold leading-normal">
                      {`Shipped today.
ShipLoud landing

Not waiting for perfect.
getshiploud.com`}
                    </p>
                    <div className="mt-2.5 flex gap-[7px]">
                      <span className="inline-flex whitespace-nowrap rounded-full bg-orange px-[13px] py-[7px] text-[11.5px] font-black text-white shadow-[0_3px_0_#C9440A]">
                        Post to X
                      </span>
                      <span className="inline-flex whitespace-nowrap rounded-full border-[1.5px] border-white/20 px-[13px] py-[7px] text-[11.5px] font-extrabold text-[#FFF8EF]/90">
                        Copy
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-[11px] opacity-65">
                    <p className="whitespace-pre-line text-[12.5px] font-bold leading-normal">
                      {`~9 followers · $0 MRR
ShipLoud landing

Posting the receipt.`}
                    </p>
                  </div>
                  <p className="mt-auto text-[11px] font-bold text-[rgba(245,240,255,.55)]">
                    3 options · regen if they're dry · nothing posts itself
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[13.5px] font-extrabold">Three short options. Pick one. You tap Post.</p>
          </div>

          <div>
            <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_12px_28px_rgba(43,27,77,.1)]">
              <div className="flex items-center gap-2.5 border-b border-line bg-[linear-gradient(180deg,#FFFDF7_0%,#F7F0DE_100%)] px-3.5 py-[11px]">
                <WindowDots />
                <span className="whitespace-nowrap text-[12.5px] font-extrabold text-muted">
                  <span className="font-black text-orange">03</span> Reply radar
                </span>
              </div>
              <div className="flex flex-1 flex-col bg-cream p-3">
                <div className={DARK_PANEL}>
                  <p className="text-[10px] font-black tracking-[0.09em] text-[rgba(255,214,170,.72)]">
                    REPLY RADAR · YOUR BUILDERS
                  </p>
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-[11px]">
                    <p className="mb-1 text-[12.5px] font-black text-[#FFB088]">@a_builder_you_added</p>
                    <p className="text-xs font-bold leading-snug text-[#FFF8EF]/78">
                      Short post about shipping ugly MVPs before polishing distribution.
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-white/[0.06] bg-black/28 px-[11px] py-[9px]">
                    <p className="mb-1 text-[9.5px] font-extrabold tracking-wide text-[rgba(255,214,170,.7)]">
                      YOUR REPLY · YOU WRITE IT
                    </p>
                    <p className="text-xs font-bold leading-snug">
                      Shipping the ugly version today. Landing live, $0. Polish can wait.
                    </p>
                  </div>
                  <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-orange px-4 py-[9px] text-[12.5px] font-black text-white shadow-[0_3px_0_#C9440A]">
                    Reply on X
                  </span>
                  <p className="mt-auto text-[11px] font-bold text-[rgba(245,240,255,.55)]">
                    Opens X with your text ready. You tap Post. Then mark "I posted it."
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[13.5px] font-extrabold">
              Reply to builders you chose. In your voice, not a bot's.
            </p>
          </div>
        </div>
        <p className="mx-auto mt-[26px] max-w-[560px] text-center text-[13px] font-bold text-muted text-pretty">
          Approve-first, always. Originals post through the official X API when you connect. Replies are yours: ShipLoud
          opens X with your text ready.
        </p>
      </section>

      <section id="pricing" className="mx-auto max-w-[1160px] px-6 pb-20 pt-16 text-center">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">ready when you are →</p>
        <h2 className="mb-[30px] text-[46px] font-black leading-tight tracking-[-0.02em]">
          Draft. Ship. Grow. <span className="text-orange">Loud.</span>
        </h2>
        <div className="card-soft relative mx-auto max-w-[560px] rounded-[28px] px-9 py-[38px]">
          <span className="sticker absolute -top-4 left-[26px] -rotate-[5deg] bg-sticker-mint px-3.5 py-1.5 text-[12.5px]">
            Free in beta
          </span>
          <span className="sticker absolute -top-4 right-[26px] rotate-[4deg] bg-sticker-pink px-3.5 py-1.5 text-[12.5px]">
            Founding $19
          </span>
          <h3 className="mb-2.5 text-[28px] font-black">Free while in beta.</h3>
          <p className="mb-6 text-[15px] font-bold leading-relaxed text-muted text-pretty">
            Founding members lock <span className="font-black text-navy">$19/mo forever</span> after launch. No annual
            trap. No growth mastermind. Just the engine.
          </p>
          <div className="mx-auto flex justify-center">
            <WaitlistForm id="pricing-waitlist" source="marketing-pricing" />
          </div>
          <p className="mt-4 text-[12.5px] font-bold text-muted">No spam. One email when we're live.</p>
        </div>
      </section>

      <footer className="border-t border-line bg-cream-2">
        <div className="mx-auto flex max-w-[1160px] items-center gap-3.5 px-6 py-[22px]">
          <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[9px] bg-orange">
            <SmileMark size={15} />
          </span>
          <span className="text-[13px] font-extrabold">© 2026 ShipLoud · getshiploud.com</span>
          <span className="flex-1" />
          <a href="/privacy" className="text-[13px] font-extrabold text-muted no-underline hover:text-orange">
            Privacy
          </a>
          <a href="/terms" className="text-[13px] font-extrabold text-muted no-underline hover:text-orange">
            Terms
          </a>
          <a href="#pricing" className="text-[13px] font-extrabold text-muted no-underline hover:text-orange">
            Waitlist
          </a>
        </div>
      </footer>
    </div>
  )
}
