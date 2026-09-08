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
              ['#rhythm', 'Daily loop'],
              ['#how', 'How it works'],
              ['#inside', 'Inside'],
              ['#on-x', 'On X'],
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
          <p className="mb-2.5 font-script text-[27px] font-bold text-orange">know where to reply →</p>
          <h1 className="mb-[18px] text-4xl font-black leading-[1.04] tracking-[-0.02em] text-balance sm:text-[58px]">
            Reply to the builders who matter.{' '}
            <span className="text-orange">You write it. X posts it.</span>
          </h1>
          <p className="mb-[26px] max-w-[520px] text-lg font-bold leading-[1.55] text-muted text-pretty">
            Public posts from people you add. Active ones first. No auto-spam. Built for founders shipping
            toward $10K MRR.
          </p>
          <WaitlistForm id="hero-waitlist" source="marketing-hero" />
          <p className="mt-3.5 text-[13px] font-bold text-muted">
            Free in beta · one email when we're live · for founders shipping to{' '}
            <span className="font-black text-orange">$10K MRR</span> and beyond, not engagement farmers.
          </p>
          <div className="mt-[26px] flex flex-wrap items-center gap-2">
            {['add builders', 'Reply radar', 'write it', 'Reply on X', 'I posted it'].map((chip, i) => (
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
            You write it
          </span>
          <span className="sticker absolute bottom-0.5 -left-1.5 z-[3] -rotate-[7deg] bg-sticker-sky px-[15px] py-[7px] text-[13.5px]">
            Active first
          </span>
          <span className="sticker absolute -bottom-3.5 right-[22px] z-[3] rotate-[8deg] bg-sticker-mint px-[15px] py-[7px] text-[13.5px]">
            Receipts
          </span>

          <div className="relative z-[1] max-w-[400px] -rotate-2 rounded-3xl border border-white/10 px-[22px] py-5 text-[#FFF8EF] shadow-[0_18px_40px_rgba(43,27,77,.22)] [background:radial-gradient(120%_80%_at_50%_0%,#2A2438_0%,#15121F_55%,#0E0C14_100%)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10.5px] font-black tracking-[0.09em] text-[rgba(255,214,170,.75)]">
                REPLY RADAR · ACTIVE FIRST
              </span>
              <span className="text-[11.5px] font-extrabold text-[rgba(245,240,255,.5)]">3 replies today</span>
            </div>
            <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-[11px]">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[12.5px] font-black text-[#FFB088]">@marclou</span>
                <span className="rounded-full bg-[#7C6CF0] px-2 py-px text-[9.5px] font-black tracking-wide text-white">
                  START HERE
                </span>
              </div>
              <p className="text-xs font-bold leading-snug text-[#FFF8EF]/78">
                Today is a special day for me. I've made $3M with my 36 startups.
              </p>
            </div>
            <div className="rounded-[10px] border border-white/[0.06] bg-black/28 px-[11px] py-[9px]">
              <p className="mb-1 text-[9.5px] font-extrabold tracking-wide text-[rgba(255,214,170,.7)]">
                YOUR REPLY · YOU WRITE IT
              </p>
              <p className="text-xs font-bold leading-snug">
                Congrats on the $3M. Which of the 36 taught you the most about distribution?
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="inline-flex items-center whitespace-nowrap rounded-full bg-orange px-[18px] py-[9px] text-[13px] font-black text-white shadow-[0_3px_0_#C9440A]">
                Reply on X
              </span>
              <span className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-white/20 px-[18px] py-[9px] text-[13px] font-extrabold text-[#FFF8EF]/90">
                I posted it
              </span>
            </div>
          </div>
          <p className="relative z-[2] ml-[38%] mt-3 -rotate-4 whitespace-nowrap font-script text-2xl font-bold text-orange">
            opens X ready →
          </p>
        </div>
      </header>

      <section id="gap" className="mx-auto max-w-[1160px] px-6 py-14">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">the problem →</p>
        <h2 className="mb-[34px] max-w-[720px] text-[40px] font-black leading-[1.12] tracking-[-0.02em] text-balance">
          You lurk-reply or go quiet.
          <br />
          The builders who matter keep shipping.
        </h2>
        <div className="mb-[22px] grid gap-[18px] md:grid-cols-3">
          {[
            {
              n: '01',
              title: 'The feed is noise',
              body: 'Timeline is tool replies and "how I grew to 10K" threads. The posts worth answering get buried.',
            },
            {
              n: '02',
              title: 'You show up late — or not at all',
              body: '0–1K followers. You mean to reply to launches, numbers, blockers, asks. Then the day ends.',
            },
            {
              n: '03',
              title: 'What actually compounds',
              body: 'Showing up in the threads that matter — ship notes, real questions, receipts. Conversation-first, not broadcast-first.',
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
          ShipLoud is the habit of shipping loud in{' '}
          <span className="bg-[linear-gradient(transparent_62%,#FFE566_62%)]">the replies that matter.</span>
        </p>
      </section>

      <section id="rhythm" className="mx-auto max-w-[1160px] px-6 py-14">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">the daily loop →</p>
        <h2 className="mb-3 max-w-[760px] text-[40px] font-black leading-[1.12] tracking-[-0.02em] text-balance">
          Know where to reply. Write it. Post on X. Mark it.
        </h2>
        <p className="mb-[34px] max-w-[560px] text-[16.5px] font-bold leading-[1.55] text-muted text-pretty">
          Reply radar surfaces public posts from builders you chose. Active ones first. Execution is still yours.
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['01', 'Add builders', 'Anyone you care about. Suggested starter list — same for everyone, not an algorithm.'],
            ['02', 'Open Reply radar', 'Public posts only. Active ones float up — more likes, reposts, replies in your feed.'],
            ['03', 'Write the reply', 'Your voice. Short. Concrete. No auto AI dump on every card.'],
            ['04', 'Reply on X', 'Opens X with your text ready. You tap Post. We don’t auto-send.'],
            ['05', 'I posted it', 'One tap. Counted in receipts. Soft goal: a few replies today.'],
          ].map(([n, title, body]) => (
            <div key={n} className="rounded-[22px] border border-line bg-card p-[18px]">
              <p className="mb-2 font-script text-2xl font-bold text-orange">{n}</p>
              <h3 className="mb-1.5 text-[15px] font-black">{title}</h3>
              <p className="text-[12.5px] font-bold leading-normal text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1160px] px-6 py-14">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">the habit →</p>
        <h2 className="mb-[34px] max-w-[760px] text-[40px] font-black leading-[1.12] tracking-[-0.02em] text-balance">
          ShipLoud doesn’t buy reach. It makes the reply habit that gets founders noticed.
        </h2>
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['1', 'Add builders', 'People whose threads you want to show up in.'],
            ['2', 'Scan the radar', 'Active first. Launches, numbers, blockers, asks.'],
            ['3', 'Write your reply', 'You write every word. Optional ideas only if you ask.'],
            ['4', 'Reply on X', 'Intent URL opens X. You tap Post. Then mark I posted it.'],
            ['5', 'See the receipts', 'Replies posted. Was the habit real this week?'],
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
          Noticed = <span className="bg-[linear-gradient(transparent_62%,#FFE566_62%)]">showing up in the right threads</span>,
          not a viral broadcast.
        </p>
        <div className="grid items-stretch gap-[18px] lg:grid-cols-2">
          <div className="card-soft rounded-[26px] p-[26px]">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-black tracking-[0.08em] text-orange">SHIPLOUD IS</p>
                {[
                  'Reply radar: public posts from builders you chose',
                  'Active first — relative to your list, honestly',
                  'You write it · Reply on X · I posted it',
                  'Weekly receipts of replies you actually sent',
                ].map((line) => (
                  <p key={line} className="mb-[9px] text-[13.5px] font-extrabold leading-snug last:mb-0">
                    <span className="text-orange">✓</span>&nbsp; {line}
                  </p>
                ))}
              </div>
              <div>
                <p className="mb-3 text-xs font-black tracking-[0.08em] text-muted">SHIPLOUD IS NOT</p>
                {[
                  'An auto-reply bot (X blocks those. Good.)',
                  'A scheduler that posts for you',
                  'An algorithm of who to follow',
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
              We don’t fake engagement or auto-post. Growth still comes from you showing up. X doesn’t let apps reply
              for you. We open X with your text ready.
            </p>
          </div>
        </div>
      </section>

      <section id="inside" className="mx-auto max-w-[1160px] px-6 py-14">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">see it →</p>
        <h2 className="mb-2.5 text-[40px] font-black leading-[1.12] tracking-[-0.02em]">Radar. Write. Receipts.</h2>
        <p className="mb-[30px] text-[15.5px] font-bold text-muted">
          The reply habit in three screens. Short, concrete, approve-first.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_12px_28px_rgba(43,27,77,.1)]">
              <div className="flex items-center gap-2.5 border-b border-line bg-[linear-gradient(180deg,#FFFDF7_0%,#F7F0DE_100%)] px-3.5 py-[11px]">
                <WindowDots />
                <span className="whitespace-nowrap text-[12.5px] font-extrabold text-muted">
                  <span className="font-black text-orange">01</span> Reply radar
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
                  <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-[11px] opacity-65">
                    <p className="mb-1 text-[12.5px] font-black text-[#FFB088]">@another_founder</p>
                    <p className="text-xs font-bold leading-snug text-[#FFF8EF]/78">
                      Hit $2.4K MRR. Asking what to cut next.
                    </p>
                  </div>
                  <p className="mt-auto text-[11px] font-bold text-[rgba(245,240,255,.55)]">
                    Active first · launches · numbers · blockers · asks
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[13.5px] font-extrabold">Public posts from people you added. Active ones first.</p>
          </div>

          <div>
            <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_12px_28px_rgba(43,27,77,.1)]">
              <div className="flex items-center gap-2.5 border-b border-line bg-[linear-gradient(180deg,#FFFDF7_0%,#F7F0DE_100%)] px-3.5 py-[11px]">
                <WindowDots />
                <span className="whitespace-nowrap text-[12.5px] font-extrabold text-muted">
                  <span className="font-black text-orange">02</span> Write & reply
                </span>
              </div>
              <div className="flex flex-1 flex-col bg-cream p-3">
                <div className={DARK_PANEL}>
                  <p className="text-[10px] font-black tracking-[0.09em] text-[rgba(255,214,170,.72)]">
                    YOUR REPLY · YOU WRITE IT
                  </p>
                  <div className="rounded-[10px] border border-white/[0.06] bg-black/28 px-[11px] py-[9px]">
                    <p className="text-xs font-bold leading-snug">
                      Shipping the ugly version today. Landing live, $0. Polish can wait.
                    </p>
                  </div>
                  <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-orange px-4 py-[9px] text-[12.5px] font-black text-white shadow-[0_3px_0_#C9440A]">
                    Reply on X
                  </span>
                  <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-white/20 px-4 py-[9px] text-[12.5px] font-extrabold text-[#FFF8EF]/90">
                    I posted it
                  </span>
                  <p className="mt-auto text-[11px] font-bold text-[rgba(245,240,255,.55)]">
                    Opens X with your text ready. You tap Post.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[13.5px] font-extrabold">You write it. X posts it. Then mark the receipt.</p>
          </div>

          <div>
            <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-card shadow-[0_12px_28px_rgba(43,27,77,.1)]">
              <div className="flex items-center gap-2.5 border-b border-line bg-[linear-gradient(180deg,#FFFDF7_0%,#F7F0DE_100%)] px-3.5 py-[11px]">
                <WindowDots />
                <span className="whitespace-nowrap text-[12.5px] font-extrabold text-muted">
                  <span className="font-black text-orange">03</span> Receipts
                </span>
              </div>
              <div className="flex flex-1 flex-col bg-cream p-3">
                <div className={DARK_PANEL}>
                  <p className="text-[10px] font-black tracking-[0.09em] text-[rgba(255,214,170,.72)]">
                    THIS WEEK · RECEIPTS
                  </p>
                  <p className="text-base font-black text-[#FFFDF8]">Replies posted</p>
                  {[
                    '12 replies marked · I posted it',
                    '3 replies today · soft goal hit',
                    'Follower snapshot · secondary check',
                  ].map((line) => (
                    <div
                      key={line}
                      className="rounded-[10px] border border-white/10 bg-white/[0.04] px-[11px] py-[9px] text-[12.5px] font-bold leading-snug"
                    >
                      {line}
                    </div>
                  ))}
                  <p className="mt-auto text-[11px] font-bold text-[rgba(245,240,255,.55)]">
                    Prove the habit — not vibes.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[13.5px] font-extrabold">Receipts count what you actually did.</p>
          </div>
        </div>
        <p className="mx-auto mt-[26px] max-w-[560px] text-center text-[13px] font-bold text-muted text-pretty">
          Approve-first, always. We don’t auto-post. X won’t let apps reply for you anyway — ShipLoud opens X with your
          text ready. Journal & own-product drafts stay available if you want to broadcast later.
        </p>
      </section>

      <section id="on-x" className="mx-auto max-w-[1160px] px-6 py-14">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">on X →</p>
        <h2 className="mb-2.5 text-[40px] font-black leading-[1.12] tracking-[-0.02em]">Real posts. Not a wall of strangers.</h2>
        <p className="mb-[30px] max-w-[560px] text-[15.5px] font-bold text-muted">
          From @dreamandbuildit — 13 followers, $0 MRR. The same loop the product is for.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              text: 'Shipped ShipLoud. Know where to reply, write it, post on X yourself.\n\nNo auto-reply. No fake dashboards.\n\n11 followers · $0 MRR',
            },
            {
              text: 'X is telling me I have 1200 post impressions in the past 7 days. Not sure I believe it… but it also corresponds to the same time I launched and started using getshiploud.com… just saying.',
            },
          ].map((p) => (
            <article key={p.text} className="card-soft rounded-[26px] p-6 text-left">
              <p className="mb-3 text-[12.5px] font-black text-orange">@dreamandbuildit</p>
              <p className="mb-5 whitespace-pre-line text-[15px] font-extrabold leading-[1.5] text-navy">{p.text}</p>
              <a
                href="https://x.com/dreamandbuildit"
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-black text-orange no-underline hover:text-orange-deep"
              >
                See on X →
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1160px] px-6 pb-20 pt-16 text-center">
        <p className="mb-2 font-script text-[26px] font-bold text-orange">ready when you are →</p>
        <h2 className="mb-[30px] text-[46px] font-black leading-tight tracking-[-0.02em]">
          Know. Write. Reply. <span className="text-orange">Loud.</span>
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
            trap. No growth mastermind. Just the reply habit engine.
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
