import type { XConnectionState } from '../useXConnection'

type Props = {
  x: XConnectionState
}

export default function XConnectCard({ x }: Props) {
  const label = !x.configured
    ? 'X posting not configured'
    : x.connected && x.handle
      ? `Connected as @${x.handle}`
      : x.loading
        ? 'Checking X…'
        : 'Connect X'

  return (
    <div className="card-soft space-y-3 p-4 sm:p-5">
      <div className="space-y-1">
        <h3 className="text-sm font-extrabold text-navy">X posting</h3>
        <p className="text-sm text-muted">
          Posts from your account. Radar still uses public posts.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {x.connected && x.configured ? (
          <>
            <span className="rounded-full border border-orange/30 bg-orange/10 px-3 py-2 text-sm font-extrabold text-navy">
              {label}
            </span>
            <button
              type="button"
              onClick={() => void x.disconnect()}
              className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-extrabold text-navy hover:border-orange/40"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void x.connect()}
            disabled={!x.configured || x.loading}
            className="btn-pill min-h-11 px-5 py-2.5 text-sm disabled:opacity-50"
            title={!x.configured ? 'X posting not configured' : undefined}
          >
            {label}
          </button>
        )}
      </div>
      {x.error && <p className="text-sm font-extrabold text-red-600">{x.error}</p>}
    </div>
  )
}
