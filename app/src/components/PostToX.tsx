import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { postToX } from '../api'
import { isShortEnough, xLength, X_LIMIT } from '../xLength'
import { track } from '../track'
import { xReplyIntentUrl } from '../url'

type Props = {
  text: string
  connected: boolean
  configured: boolean
  handle: string | null
  onPosted: (result: { id: string; url: string }) => void
  onConnect: () => void
  /** When set, post as a reply to this tweet id. */
  replyToId?: string
  replyToHandle?: string
  originalSnippet?: string
}

function snippet(text: string, max = 160): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trimEnd()}…`
}

const REPLY_BLOCKED =
  'X does not let apps reply unless they mentioned you. Use Reply on X instead.'

export default function PostToX({
  text,
  connected,
  configured,
  handle,
  onPosted,
  onConnect,
  replyToId,
  replyToHandle,
  originalSnippet,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [postedUrl, setPostedUrl] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const isReply = Boolean(replyToId)
  const len = xLength(text)
  const overLimit = !isShortEnough(text)
  const empty = !text.trim()
  const theirHandle = (replyToHandle || '').replace(/^@+/, '')

  if (isReply) {
    const href = replyToId ? xReplyIntentUrl(replyToId, text) : ''
    return (
      <>
        {empty || !href ? (
          <button type="button" disabled className="btn-pill min-h-12 px-6 py-3 text-base opacity-50">
            Reply on X
          </button>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            onClick={() => track('x_reply_intent', { handle: theirHandle || null })}
            className="btn-pill min-h-12 px-6 py-3 text-base"
          >
            Reply on X
          </a>
        )}
        <p className="basis-full text-xs font-semibold text-muted">{REPLY_BLOCKED}</p>
      </>
    )
  }

  function openPreview() {
    setErr('')
    setPreviewOpen(true)
  }

  function closePreview() {
    if (busy) return
    setPreviewOpen(false)
    setErr('')
  }

  async function post() {
    setErr('')
    setPostedUrl('')
    if (overLimit) {
      setErr(`Too long for one X post (${len}/${X_LIMIT}).`)
      return
    }
    if (empty) {
      setErr(isReply ? 'Nothing to reply.' : 'Nothing to post.')
      return
    }
    setBusy(true)
    try {
      if (isReply) {
        setErr(REPLY_BLOCKED)
        return
      }
      const result = await postToX(text)
      setPostedUrl(result.url)
      if (isReply) {
        track('x_replied', { id: result.id, replyToId: replyToId || '', handle: theirHandle || null })
      } else {
        track('x_posted', { id: result.id })
      }
      setPreviewOpen(false)
      onPosted(result)
    } catch (e) {
      const raw = e instanceof Error ? e.message : isReply ? 'reply_failed' : 'post_failed'
      setErr(isReply ? REPLY_BLOCKED : raw)
    } finally {
      setBusy(false)
    }
  }

  if (!connected) {
    return (
      <p className="basis-full text-xs font-semibold text-muted">
        {configured ? (
          <button
            type="button"
            onClick={onConnect}
            className="font-extrabold text-orange hover:underline"
          >
            {isReply ? 'Connect X to send replies from here' : 'Connect X to post from here'}
          </button>
        ) : (
          <span>X posting not configured</span>
        )}
      </p>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        disabled={busy}
        className="btn-pill min-h-12 px-6 py-3 text-base disabled:opacity-50"
        title={
          isReply
            ? theirHandle
              ? `Send reply to @${theirHandle}`
              : 'Send reply'
            : handle
              ? `Post as @${handle}`
              : 'Post to X'
        }
      >
        {busy ? (isReply ? 'Sending…' : 'Posting…') : isReply ? 'Send reply' : 'Post to X'}
      </button>
      {err && !previewOpen && (
        <p className="basis-full text-xs font-extrabold text-red-600">{err}</p>
      )}
      {postedUrl && (
        <a
          href={postedUrl}
          target="_blank"
          rel="noreferrer"
          className="basis-full text-xs font-extrabold text-orange hover:underline"
        >
          {isReply ? 'Replied — view on X ↗' : 'Posted — view on X ↗'}
        </a>
      )}
      {previewOpen &&
        createPortal(
          <PreviewSheet
            text={text}
            handle={handle}
            len={len}
            overLimit={overLimit}
            empty={empty}
            busy={busy}
            err={err}
            isReply={isReply}
            replyToHandle={theirHandle}
            originalSnippet={originalSnippet ? snippet(originalSnippet) : ''}
            onCancel={closePreview}
            onPost={() => void post()}
          />,
          document.body,
        )}
    </>
  )
}

function PreviewSheet({
  text,
  handle,
  len,
  overLimit,
  empty,
  busy,
  err,
  isReply,
  replyToHandle,
  originalSnippet,
  onCancel,
  onPost,
}: {
  text: string
  handle: string | null
  len: number
  overLimit: boolean
  empty: boolean
  busy: boolean
  err: string
  isReply: boolean
  replyToHandle: string
  originalSnippet: string
  onCancel: () => void
  onPost: () => void
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const canPost = !overLimit && !empty && !busy

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [busy, onCancel])

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-navy/45"
        aria-label="Close preview"
        disabled={busy}
        onClick={onCancel}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-line bg-cream outline-none sm:rounded-[28px]"
        style={{
          boxShadow:
            '0 10px 30px rgba(43, 27, 77, 0.18), 0 2px 6px rgba(43, 27, 77, 0.06)',
        }}
      >
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
          <span className="h-1.5 w-12 rounded-full bg-line" />
        </div>

        <div className="space-y-1 px-5 pt-3 pb-2 sm:pt-5">
          <h2 id={titleId} className="text-lg font-extrabold tracking-tight text-navy">
            {isReply ? 'Send this reply?' : 'Post to X?'}
          </h2>
          {isReply ? (
            <p className="text-sm font-semibold text-muted">
              {replyToHandle
                ? `This posts from ShipLoud to your X account, as a reply to @${replyToHandle}.`
                : 'This posts from ShipLoud to your X account, as a reply.'}
            </p>
          ) : (
            <>
              <p className="text-sm font-extrabold text-orange">
                {`Posting as @${handle || 'you'}`}
              </p>
              <p className="text-sm font-semibold text-muted">
                This posts from ShipLoud to your X account.
              </p>
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {isReply && originalSnippet && (
            <div className="mb-3 rounded-[22px] border border-line bg-cream-2 px-4 py-3">
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-muted">
                Original
              </p>
              <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-snug text-muted">
                {originalSnippet}
              </p>
            </div>
          )}
          <div className="rounded-[22px] border border-line bg-card p-4 shadow-[0_6px_18px_rgba(43,27,77,0.06)]">
            <p className="mb-2 text-[13px] font-extrabold text-navy">
              @{handle || 'you'}
            </p>
            <p className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-snug text-navy">
              {text}
            </p>
            <p
              className={`mt-3 text-xs font-black tabular-nums ${
                overLimit ? 'text-red-600' : 'text-muted'
              }`}
            >
              {len}/{X_LIMIT}
              {overLimit ? ' · too long for one X post' : ''}
            </p>
          </div>
          {err && (
            <p className="mt-3 text-sm font-extrabold text-red-600" role="alert">
              {err}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-line bg-cream-2/90 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-12 flex-1 rounded-full border border-line bg-card px-4 text-sm font-extrabold text-navy hover:border-orange/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPost}
            disabled={!canPost}
            className="btn-pill min-h-12 flex-1 px-6 text-base disabled:opacity-50"
          >
            {busy ? (isReply ? 'Sending…' : 'Posting…') : isReply ? 'Send reply' : 'Post now'}
          </button>
        </div>
      </div>
    </div>
  )
}
