import type { XConnectionState } from '../useXConnection'

type Props = {
  x: XConnectionState
}

export default function XConnectCard({ x }: Props) {
  const handle = x.handle ? `@${x.handle.replace(/^@/, '')}` : '@you'

  return (
    <div className="card-soft rounded-3xl px-[22px] py-5">
      <p className="mb-2.5 text-[11px] font-black tracking-[0.08em] text-muted">X POSTING</p>
      {x.connected && x.configured ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-sticker-mint bg-sticker-mint/25 px-4 py-[7px] text-[12.5px] font-black">
            ✓ Connected as {handle}
          </span>
          <button
            type="button"
            onClick={() => void x.disconnect()}
            className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-2 text-[12.5px] font-extrabold text-navy hover:border-orange-deep hover:text-orange-deep"
          >
            Disconnect
          </button>
          <span className="text-xs font-bold text-muted">
            Posts originals from your account. Radar still uses public posts.
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void x.connect()}
            disabled={!x.configured || x.loading}
            className="btn-pill whitespace-nowrap px-[18px] py-[9px] text-[12.5px] disabled:opacity-50"
            title={!x.configured ? 'X posting not configured' : undefined}
          >
            {x.loading ? 'Checking X…' : !x.configured ? 'X posting not configured' : 'Connect X'}
          </button>
          <span className="text-xs font-bold text-muted">
            OAuth, official API, originals only. Copy always works without it.
          </span>
        </div>
      )}
      {x.error && <p className="mt-2 text-sm font-extrabold text-red-600">{x.error}</p>}
    </div>
  )
}
