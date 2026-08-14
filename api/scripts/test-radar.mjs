import { buildSync } from 'esbuild'
import path from 'path'
import os from 'os'
import { readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outfile = path.join(os.tmpdir(), 'shiploud-api-radar-test.mjs')

buildSync({
  entryPoints: [path.join(root, 'src/radar.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
})

const mod = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`)
const {
  parseTimeline,
  parseStatus,
  isReplyOrRepost,
  capHandles,
  favoriteHandlesFromState,
  templateReplies,
  templateRepliesFor,
  repliesForTweet,
  SUGGESTED_REPLY_COUNT,
  TEMPLATE_REPLY,
  RADAR_MAX_HANDLES,
  RADAR_PAYLOAD_VERSION,
  RADAR_TEXT_MAX,
  buildRadar,
  AI_REPLY_BUDGET_MS,
  suggestRepliesWithBudget,
  tweetsToPreview,
  getHandleTweets,
  tweetHook,
  safeHook,
} = mod

let fail = 0
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    fail++
  } else {
    console.log('OK:', msg)
  }
}

const fixturePath = '/tmp/fx-marclou.json'
let fixture = null
try {
  fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
} catch {
  fixture = null
}



const sampleTweet = {
  handle: 'marclou',
  tweetId: '1',
  text: 'Shipped a thing',
  url: 'https://x.com/marclou/status/1',
  createdAt: new Date().toISOString(),
  displayName: 'Marc Lou',
  avatarUrl: 'https://pbs.twimg.com/profile_images/abc.jpg',
  media: [],
  likes: 1,
  reposts: 0,
  replies: 0,
}
function memoryDb(row) {
  return {
    prepare() {
      return {
        bind() {
          return {
            async first() { return row },
            async run() { return {} },
          }
        },
      }
    },
  }
}
const freshRow = { payload: JSON.stringify([sampleTweet]), fetched_at: new Date().toISOString() }
const tFast = Date.now()
const cachedHit = await buildRadar({ DB: memoryDb(freshRow) }, ['marclou'], '', false, { fast: true })
assert(cachedHit.items.length === 1 && cachedHit.items[0].tweetId === '1', 'fast path returns D1 cache')
assert(Array.isArray(cachedHit.items[0].suggestedReplies) && cachedHit.items[0].suggestedReplies.length === 3, 'fast path has 3 suggestedReplies')
assert(cachedHit.items[0].suggestedReply === cachedHit.items[0].suggestedReplies[0], 'suggestedReply is first of 3')
assert(cachedHit.cached === true, 'fast path cached true')
assert(cachedHit.pendingHandles.length === 0, 'fresh cache has no pending')
assert(Date.now() - tFast < 250, 'D1 cache hit is instant')

const previewFromCache = await getHandleTweets(memoryDb(freshRow), 'marclou')
assert(previewFromCache.length === 1 && previewFromCache[0].tweetId === '1', 'preview shares radar_cache')
const mapped = tweetsToPreview([
  { ...sampleTweet, text: 'Hello world', media: [{ type: 'photo', url: 'https://pbs.twimg.com/media/a.jpg', thumbnailUrl: 'https://pbs.twimg.com/media/a-thumb.jpg' }] },
  { ...sampleTweet, tweetId: '2', text: 'Second', media: [] },
  { ...sampleTweet, tweetId: '3', text: 'Third', media: [] },
  { ...sampleTweet, tweetId: '4', text: 'Fourth', media: [] },
])
assert(mapped.length === 3, 'preview caps at 3')
assert(mapped[0].text === 'Hello world' && mapped[0].mediaUrl === 'https://pbs.twimg.com/media/a-thumb.jpg', 'preview uses first thumb')
assert(!('mediaUrl' in mapped[1]), 'no mediaUrl when none')
assert(tweetsToPreview([]).length === 0, 'empty preview')

const staleRow = { payload: JSON.stringify([sampleTweet]), fetched_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() }
const staleHit = await buildRadar({ DB: memoryDb(staleRow) }, ['marclou'], '', false, { fast: true })
assert(staleHit.items.length === 1, 'stale cache still paints immediately')
assert(staleHit.pendingHandles.includes('marclou'), 'stale handle listed as pending')

const miss = await buildRadar({ DB: memoryDb(null) }, ['marclou', 'levelsio'], '', false, { fast: true })
assert(miss.items.length === 0, 'cache miss returns no items on fast')
assert(miss.pendingHandles.join(',') === 'marclou,levelsio', 'misses become pendingHandles')
assert(miss.cached === false, 'miss is not cached')

assert(AI_REPLY_BUDGET_MS <= 1000, 'AI budget stays under 1s')
const empty = await buildRadar({ DB: {} }, [], '', false, { fast: true })
assert(Array.isArray(empty.items) && empty.items.length === 0, 'buildRadar empty items')
assert(Array.isArray(empty.pendingHandles) && empty.pendingHandles.length === 0, 'buildRadar empty pending')
assert(empty.cached === false, 'buildRadar empty cached false')

const t0 = Date.now()
const budgeted = await suggestRepliesWithBudget(null, [{ text: 'Just shipped an MVP' }], 'direct', 50)
assert(budgeted.length === 1 && budgeted[0].length > 0, 'budget path returns template without AI')
assert(Date.now() - t0 < 200, 'template replies are instant')

assert(capHandles(['@MarcLou', 'levelsio', 'bad handle', '@MarcLou']).join(',') === 'marclou,levelsio', 'capHandles normalizes + dedupes')
assert(capHandles(Array.from({ length: 20 }, (_, i) => `user${i}`)).length === RADAR_MAX_HANDLES, 'capHandles caps')

assert(
  isReplyOrRepost({ replying_to: { screen_name: 'x', status: '1' } }),
  'marks replies',
)
assert(isReplyOrRepost({ reposted_by: { screen_name: 'x' } }), 'marks reposts')
assert(!isReplyOrRepost({ replying_to: null, reposted_by: null, text: 'hi', id: '1' }), 'originals pass')

const original = parseStatus(
  {
    type: 'status',
    id: '123',
    text: 'Shipped a thing',
    url: 'https://twitter.com/marclou/status/123',
    created_timestamp: 1786622537,
    replying_to: null,
    reposted_by: null,
    likes: 24,
    reposts: 3,
    replies: 5,
    author: {
      screen_name: 'marclou',
      name: 'Marc Lou',
      avatar_url: 'https://pbs.twimg.com/profile_images/abc_200x200.jpg',
    },
    media: {
      photos: [
        {
          type: 'photo',
          url: 'https://pbs.twimg.com/media/coffee.jpg?name=orig',
          width: 1537,
          height: 2048,
        },
      ],
    },
  },
  'marclou',
)
assert(original?.tweetId === '123', 'parseStatus id')
assert(original?.url.startsWith('https://x.com/'), 'rewrites twitter.com → x.com')
assert(original?.createdAt.startsWith('2026-'), 'createdAt from unix seconds')
assert(original?.displayName === 'Marc Lou', 'display name')
assert(original?.avatarUrl.includes('pbs.twimg.com'), 'avatar https url')
assert(original?.media?.[0]?.type === 'photo', 'photo media type')
assert(original?.media?.[0]?.url.startsWith('https://'), 'photo https url')
assert(original?.likes === 24 && original?.reposts === 3 && original?.replies === 5, 'counts')
assert(RADAR_PAYLOAD_VERSION >= 3, 'payload version bumped for full cards')
assert(RADAR_TEXT_MAX >= 10000, 'text cap is note-tweet sized, not 2000')

const longText = 'Coffee pods are a Nestle psyop.'.repeat(80)
assert(longText.length > 2000, 'fixture long text > 2000')
const longParsed = parseStatus(
  {
    type: 'status',
    id: '999',
    text: longText,
    url: 'https://x.com/levelsio/status/999',
    created_timestamp: 1786622537,
    author: { screen_name: 'levelsio', name: '@levelsio', avatar_url: 'https://pbs.twimg.com/profile_images/x.jpg' },
  },
  'levelsio',
)
assert(longParsed?.text === longText, 'does not aggressively truncate full post text')
assert(!parseStatus({ id: '1', text: 'hi', author: { avatar_url: 'http://insecure.example/a.jpg' } }, 'x')?.avatarUrl, 'rejects non-https avatar')

assert(parseStatus({ id: '1', text: 'hi', replying_to: { screen_name: 'a' } }, 'x') === null, 'skips reply')
assert(parseStatus({ id: '1', text: 'hi', reposted_by: { screen_name: 'a' } }, 'x') === null, 'skips repost')

const favs = favoriteHandlesFromState(
  JSON.stringify({
    setup: {
      activeProjectId: 'p1',
      projects: [
        { id: 'p0', favoriteBuilders: ['other'] },
        { id: 'p1', favoriteBuilders: ['@marclou', 'levelsio'] },
      ],
    },
  }),
)
assert(favs.join(',') === 'marclou,levelsio', 'favoriteHandlesFromState uses active project')

assert(templateReplies(2).every((t) => t === TEMPLATE_REPLY), 'numeric templateReplies')
assert(TEMPLATE_REPLY.length <= 180, 'template ≤180')
assert(/\?/.test(TEMPLATE_REPLY), 'template asks a question')

const { RADAR_REPLY_SYSTEM, REPLY_TONE_VERSION, looksDunky, templateReplyFor, REPLY_MAX_CHARS } = mod
assert(REPLY_TONE_VERSION >= 4, 'tone version bumped')
assert(REPLY_MAX_CHARS === 180, 'reply cap 180')
assert(/\bDO:/.test(RADAR_REPLY_SYSTEM), 'system prompt has DO')
assert(/DON'T:/.test(RADAR_REPLY_SYSTEM), "system prompt has DON'T")
assert(/don.?t worry/i.test(RADAR_REPLY_SYSTEM), "bans don't worry")
assert(/that.?s not cool/i.test(RADAR_REPLY_SYSTEM), "bans that's not cool")
assert(/I have better things to do/.test(RADAR_REPLY_SYSTEM), 'bans better things')
assert(/favorite builders/.test(RADAR_REPLY_SYSTEM), 'names favorite builders')
assert(/fire/.test(RADAR_REPLY_SYSTEM), 'bans fire fanboy')

assert(looksDunky("That's not cool."), "flags that's not cool")
assert(looksDunky("Don't worry, that's basic."), "flags don't worry / basic")
assert(looksDunky('fire 🔥'), 'flags fire emoji')
assert(looksDunky('I have better things to do'), 'flags better things')
assert(!looksDunky(TEMPLATE_REPLY), 'template is not dunky')

const tweetA = 'Do the opposite of what AI recommends.'
const tweetB = 'Just shipped a new Micro SaaS. Ugly on purpose.'
const replyA = templateReplyFor(tweetA)
const replyB = templateReplyFor(tweetB)
const dunkBits = /dunk|basic|not cool|don'?t worry|🔥|great post|actually |cope|one-up/i
assert(!dunkBits.test(replyA), 'AI-take tweet reply is not dunk-y')
assert(!dunkBits.test(replyB), 'ship tweet reply is not dunk-y')
assert(/\?/.test(replyA) || /same muscle/i.test(replyA), 'AI-take reply is question or same-muscle')
assert(/\?/.test(replyB), 'ship reply asks a question')
assert(replyA.length <= 180 && replyB.length <= 180, 'sample replies ≤180')
console.log('SAMPLE_REPLY_1', JSON.stringify({ tweet: tweetA, reply: replyA }))
console.log('SAMPLE_REPLY_2', JSON.stringify({ tweet: tweetB, reply: replyB }))

const specific = replyA
assert(specific.includes('same muscle') || /\?/.test(specific), 'specific template is curious add-on')
assert(specific.length <= 180, 'specific template ≤180')

assert(SUGGESTED_REPLY_COUNT === 3, 'exactly 3 suggestions')
for (const tweet of [tweetA, tweetB, 'Anyone else stuck on pricing?', 'Shipped v1 today', 'Random builder note about distribution']) {
  const three = templateRepliesFor(tweet)
  assert(three.length === 3, `3 replies for: ${tweet.slice(0, 40)}`)
  assert(new Set(three).size === 3, `3 distinct replies for: ${tweet.slice(0, 40)}`)
  assert(three.every((t) => t.length > 0 && t.length <= 180), `replies ≤180 for: ${tweet.slice(0, 40)}`)
  assert(three.every((t) => /\?/.test(t) || /same muscle/i.test(t)), `curious tone for: ${tweet.slice(0, 40)}`)
  assert(three.every((t) => !dunkBits.test(t) && !looksDunky(t)), `not dunky for: ${tweet.slice(0, 40)}`)
  assert(templateReplyFor(tweet) === three[0], 'templateReplyFor is first of 3')
}

const mixed = repliesForTweet(tweetB, 'Congrats on the ship — what did you cut last so it could go out?')
assert(mixed.length === 3, 'repliesForTweet still 3 with AI first')
assert(mixed[0].includes('Congrats on the ship'), 'AI line is first when valid')
assert(mixed[0] === 'Congrats on the ship. What did you cut last so it could go out?', 'strips clause dash in AI line')
assert(new Set(mixed).size === 3, 'AI + templates stay distinct')
assert(mixed.every((t) => t.length <= 180), 'mixed replies ≤180')
assert(mixed.every((t) => !/[—–]/.test(t) && !/\s-\s/.test(t)), 'mixed replies have no clause dashes')

const dunked = repliesForTweet(tweetB, "That's not cool. fire 🔥")
assert(dunked[0] === templateReplyFor(tweetB), 'dunky AI falls back to templates')
assert(dunked.length === 3, 'fallback still 3')

const leftover = repliesForTweet(tweetB, `I've used AI slops for those edge cases",`)
assert(leftover[0] === `I've used AI slops for those edge cases`, 'clipReply strips leftover quote-comma')
assert(!/[,"']$/.test(leftover[0]), 'tidied reply has no trailing quote/comma')
const wrappedJson = repliesForTweet(tweetB, `"Congrats on the ship — what did you cut last so it could go out?",`)
assert(wrappedJson[0] === 'Congrats on the ship. What did you cut last so it could go out?', 'unwraps JSON string, strips dash')
const keepQ = 'Congrats on the ship. What are you watching first to see if it sticks?'
assert(repliesForTweet(tweetB, keepQ)[0] === keepQ, 'clipReply keeps trailing ?')
assert(repliesForTweet(tweetB, 'Nice get-it-out. What was the last thing you cut so it could ship.')[0].endsWith('.'), 'clipReply keeps trailing .')

const marc = '#2 advice to grow an audience in 2026: Do the opposite of what AI recommends.'
assert(/opposite of what AI recommends/i.test(tweetHook(marc)), 'hook is the claim, not the list opener')
assert(!/#2 advice/i.test(tweetHook(marc)), 'hook rejects #2 advice opener')
assert(/opposite of what AI recommends/i.test(safeHook(marc)), 'safeHook keeps claim noun phrase')
const marcReplies = templateRepliesFor(marc)
assert(marcReplies.length === 3, 'marc tweet has 3 replies')
assert(new Set(marcReplies).size === 3, 'marc replies distinct')
assert(marcReplies.every((t) => !/#2 advice to grow/i.test(t)), 'does not quote list opener')
assert(marcReplies.every((t) => !/how are you testing that/i.test(t)), 'no generic testing-that')
assert(marcReplies.every((t) => !/bit stuck/i.test(t)), 'no hook-quote bit-stuck templates')
assert(marcReplies.every((t) => /\?/.test(t)), 'marc replies stay curious')
assert(marcReplies.every((t) => /ignor|instead|opposite|advice|default|generic|skip/i.test(t)), 'marc replies engage the claim')
assert(/#2 advice to grow an audience/.test(RADAR_REPLY_SYSTEM), 'marc example in prompt')
assert(/last AI suggestion you ignored/.test(RADAR_REPLY_SYSTEM), 'marc DO example in prompt')
assert(/first 4 words/.test(RADAR_REPLY_SYSTEM), 'prompt bans first-4-words replies')
assert(/this landed/i.test(RADAR_REPLY_SYSTEM), 'prompt bans this landed')
assert(/em dash/i.test(RADAR_REPLY_SYSTEM), 'prompt bans em dashes')

const { looksLikeRoast, roastRepliesFor, stripClauseDashes, hasClauseDash } = mod
const tony = "Even AI slops are better at design than Google 'Design'"
assert(looksLikeRoast(tony), 'Tony tweet is roast/comparison')
assert(!looksLikeRoast('Just shipped a new Micro SaaS. Ugly on purpose.'), 'ship tweet is not roast')
const tonyReplies = templateRepliesFor(tony)
console.log('TONY_REPLIES', JSON.stringify(tonyReplies))
assert(tonyReplies.length === 3, 'Tony tweet has 3 replies')
assert(new Set(tonyReplies).size === 3, 'Tony replies distinct')
assert(tonyReplies[0] === 'Which Google screen were you looking at when that hit?', 'Tony 1 names Google screen')
assert(tonyReplies[1] === 'Same. I keep opening Material and wondering who approved the empty states.', 'Tony 2 names Material')
assert(tonyReplies[2] === 'Curious which AI tool you think is actually beating their design system right now.', 'Tony 3 names design system')
assert(tonyReplies.every((t) => !/\bthis landed\b/i.test(t)), 'Tony replies have no this landed')
assert(tonyReplies.every((t) => !hasClauseDash(t)), 'Tony replies have no clause dashes')
assert(tonyReplies.every((t) => !/what did you try first|next small experiment|how is this going/i.test(t)), 'Tony replies are not generic filler')
assert(roastRepliesFor(tony).length === 3, 'roastRepliesFor returns 3 for Tony')

const landed = repliesForTweet(tony, 'This landed. Which Google screen were you looking at when that hit?')
assert(!/\bthis landed\b/i.test(landed[0]), 'drops this landed from AI line')
assert(/Google/i.test(landed[0]), 'keeps the rest after this landed')
assert(stripClauseDashes('Same muscle over here — what did you try first?') === 'Same muscle over here. What did you try first?', 'em dash becomes period')
assert(stripClauseDashes('keep the set-up intact') === 'keep the set-up intact', 'word hyphen stays')
assert(hasClauseDash('foo — bar') && !hasClauseDash('set-up'), 'clause dash vs word hyphen')

for (const tweet of [tony, tweetA, tweetB, marc, 'Anyone else stuck on pricing?', 'Shipped v1 today', 'Random builder note about distribution']) {
  const three = templateRepliesFor(tweet)
  assert(three.every((t) => !/\bthis landed\b/i.test(t)), `no this landed for: ${tweet.slice(0, 40)}`)
  assert(three.every((t) => !hasClauseDash(t)), `no clause dashes for: ${tweet.slice(0, 40)}`)
  assert(three.every((t) => !/what did you try first|next small experiment|how is this going for you/i.test(t)), `no banned filler for: ${tweet.slice(0, 40)}`)
}


if (fixture) {
  const tweets = parseTimeline(fixture, 'marclou')
  assert(tweets.length >= 1 && tweets.length <= 3, `fixture yields 1–3 originals (got ${tweets.length})`)
  assert(tweets.every((t) => t.handle && t.tweetId && t.text), 'fixture tweets have fields')
  console.log('SAMPLE', JSON.stringify({ handle: tweets[0].handle, tweetId: tweets[0].tweetId, text: tweets[0].text.slice(0, 120), url: tweets[0].url, createdAt: tweets[0].createdAt }))
} else {
  console.log('SKIP fixture parse (no /tmp/fx-marclou.json)')
}

const levelsioPath = '/tmp/fx-levelsio.json'
try {
  const fx = JSON.parse(readFileSync(levelsioPath, 'utf8'))
  const tweets = parseTimeline(fx, 'levelsio')
  assert(tweets.length >= 1, `levelsio fixture originals (got ${tweets.length})`)
  const coffee = tweets.find((t) => /Hario V60/i.test(t.text)) || tweets[0]
  assert(coffee.text.length > 200, 'coffee post keeps full text, not a 140-char snippet')
  assert(/\n/.test(coffee.text) || coffee.text.length > 140, 'preserves multi-line / long body')
  assert(coffee.displayName, 'display name from author.name')
  assert(/^https:\/\//.test(coffee.avatarUrl), 'avatar_url https')
  assert(coffee.avatarUrl.includes('pbs.twimg.com') || coffee.avatarUrl.includes('twimg'), 'avatar from twimg')
  if (/Hario V60/i.test(coffee.text)) {
    assert(coffee.media.some((m) => m.type === 'photo' && m.url.startsWith('https://pbs.twimg.com')), 'coffee photo url')
  }
  const video = tweets.find((t) => t.media.some((m) => m.type === 'video'))
  if (video) {
    const v = video.media.find((m) => m.type === 'video')
    assert(v.url.startsWith('https://'), 'video https url')
    assert(v.thumbnailUrl && v.thumbnailUrl.startsWith('https://'), 'video thumbnail_url')
  }
  console.log('LEVELSIO_FIELDS', JSON.stringify({
    tweetId: coffee.tweetId,
    displayName: coffee.displayName,
    handle: coffee.handle,
    avatarUrl: coffee.avatarUrl,
    textLen: coffee.text.length,
    media: coffee.media,
    likes: coffee.likes,
    reposts: coffee.reposts,
    replies: coffee.replies,
    url: coffee.url,
  }))
} catch (err) {
  if (err && err.code === 'ENOENT') console.log('SKIP levelsio fixture')
  else throw err
}

if (fail) {
  console.error(`\n${fail} failed`)
  process.exit(1)
}
console.log('\nall ok')
