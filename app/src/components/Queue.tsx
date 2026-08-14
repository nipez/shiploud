import { useState } from 'react'
import type { Draft, ReplyTarget, Setup } from '../types'
import { uid } from '../storage'
import { ensureHttps, tweetIdFromUrl, xReplyIntentUrl } from '../url'
import { track } from '../track'
import RadarFeed from './RadarFeed'
import PostToX from './PostToX'
import type { XConnectionState } from '../useXConnection'
import type { FormEvent } from 'react'

type Props = {
  drafts: Draft[]
  replies: ReplyTarget[]
  setup: Setup
  onMarkPosted: (id: string) => void
  onMarkReplied: (id: string) => void
  onAddReply: (r: ReplyTarget) => void
  xConnection: XConnectionState
  onToast: (msg: string) => void
}

export default function Queue({
  drafts,
  replies,
  setup,
  onMarkPosted,
  onMarkReplied,
  onAddReply,
  xConnection,
  onToast,
}: Props) {
  const approved = drafts
    .filter((d) => d.status === 'approved')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const todoReplies = replies
    .filter((r) => r.status === 'todo')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const [copied, setCopied] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [account, setAccount] = useState('')
  const [postSummary, setPostSummary] = useState('')
  const [url, setUrl] = useState('')
  const [suggestedReply, setSuggestedReply] = useState('')

  async function copy(id: string, text: string, kind: 'draft' | 'reply' = 'draft') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      track(kind === 'reply' ? 'reply_copied' : 'draft_copied')
      onToast('copied')
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      window.prompt('Copy manually:', text)
      track(kind === 'reply' ? 'reply_copied' : 'draft_copied')
      onToast('copied')
    }
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!account.trim() || !suggestedReply.trim()) return
    onAddReply({
      id: uid('reply'),
      account: account.trim(),
      postSummary: postSummary.trim(),
      url: ensureHttps(url) || url.trim(),
      suggestedReply: suggestedReply.trim(),
      status: 'todo',
      createdAt: new Date().toISOString(),
    })
    setAccount('')
    setPostSummary('')
    setUrl('')
    setSuggestedReply('')
    setShowAdd(false)
  }

  return (
    <section>
      <RadarFeed setup={setup} onToast={onToast} />

      {approved.length > 0 && (
        <div className="mt-8 max-w-[760px] space-y-3">
          <p className="text-[11px] font-black tracking-[0.08em] text-muted">SAVED FOR LATER</p>
          {approved.map((d) => (
            <article key={d.id} className="card-soft overflow-hidden rounded-[22px]">
              <div className="whitespace-pre-wrap break-words px-4 py-3.5 text-sm font-bold leading-relaxed text-navy">
                {d.text}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                <PostToX
                  text={d.text}
                  connected={xConnection.connected}
                  configured={xConnection.configured}
                  handle={xConnection.handle}
                  compact
                  onConnect={() => void xConnection.connect()}
                  onPosted={() => {
                    onMarkPosted(d.id)
                    track('draft_marked_posted')
                    onToast('posted')
                  }}
                />
                <button
                  type="button"
                  onClick={() => void copy(d.id, d.text, 'draft')}
                  className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-[9px] text-[12.5px] font-extrabold text-navy hover:border-navy"
                >
                  {copied === d.id ? '✓ Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMarkPosted(d.id)
                    track('draft_marked_posted')
                    onToast('posted')
                  }}
                  className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-[9px] text-[12.5px] font-extrabold text-navy hover:border-navy"
                >
                  Mark posted
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(todoReplies.length > 0 || showAdd) && (
        <div className="mt-8 max-w-[760px] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-black tracking-[0.08em] text-muted">SAVED REPLIES</p>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-3 py-1.5 text-xs font-extrabold text-navy hover:border-navy"
            >
              {showAdd ? 'Cancel' : 'Add'}
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleAdd} className="card-soft space-y-3 rounded-[22px] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="@account"
                  className="input-soft min-h-11 text-sm"
                  required
                />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://x.com/…"
                  className="input-soft min-h-11 font-mono text-sm"
                />
              </div>
              <input
                value={postSummary}
                onChange={(e) => setPostSummary(e.target.value)}
                placeholder="What they posted (optional)"
                className="input-soft min-h-11 w-full text-sm"
              />
              <textarea
                value={suggestedReply}
                onChange={(e) => setSuggestedReply(e.target.value)}
                placeholder="Your reply…"
                rows={3}
                required
                className="input-soft w-full resize-y text-sm leading-relaxed"
              />
              <button type="submit" className="btn-pill whitespace-nowrap px-5 py-2.5 text-sm">
                Save reply
              </button>
            </form>
          )}

          {todoReplies.map((r) => {
            const href = ensureHttps(r.url)
            const replyToId = tweetIdFromUrl(r.url)
            return (
              <article key={r.id} className="card-soft overflow-hidden rounded-[22px]">
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-cream-2/80 px-4 py-2.5">
                  <span className="font-extrabold text-orange">{r.account}</span>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-sm font-bold text-muted hover:text-orange"
                    >
                      open ↗
                    </a>
                  )}
                </div>
                {r.postSummary && (
                  <p className="break-words px-4 pt-3 text-sm font-semibold text-muted">{r.postSummary}</p>
                )}
                <div className="whitespace-pre-wrap break-words px-4 py-3 text-sm font-bold leading-relaxed text-navy">
                  {r.suggestedReply}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
                  {replyToId ? (
                    <a
                      href={xReplyIntentUrl(replyToId, r.suggestedReply)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track('x_reply_intent', { handle: r.account })}
                      className="btn-pill whitespace-nowrap px-[18px] py-[9px] text-[12.5px]"
                    >
                      Reply on X
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void copy(r.id, r.suggestedReply, 'reply')}
                    className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-[9px] text-[12.5px] font-extrabold text-navy hover:border-navy"
                  >
                    {copied === r.id ? '✓ Copied' : 'Copy reply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkReplied(r.id)}
                    className="inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-line bg-cream-2 px-4 py-[9px] text-[12.5px] font-extrabold text-navy hover:border-navy"
                  >
                    I posted it
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
