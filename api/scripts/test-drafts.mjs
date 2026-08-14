import { buildSync } from 'esbuild'
import path from 'path'
import os from 'os'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outfile = path.join(os.tmpdir(), 'shiploud-api-drafts-test.mjs')

buildSync({
  entryPoints: [path.join(root, 'src/drafts.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
})

const mod = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`)
const {
  trimX,
  xLength,
  X_LIMIT,
  templateDrafts,
  buildPrompt,
  generateDrafts,
  AI_MODEL,
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

const long = 'a'.repeat(400)
assert(xLength(trimX(long, X_LIMIT)) <= X_LIMIT, 'trimX hard-caps plain text to 280')
const withUrl = 'hello world ' + 'x'.repeat(260) + ' https://www.getshiploud.com/path'
assert(xLength(trimX(withUrl, X_LIMIT)) <= X_LIMIT, 'trimX URL-aware hard cap')
assert(xLength('https://example.com/foo') === 23, 'URL weighs as t.co 23')

const journal = {
  shipped: 'Drafts tab + Workers AI generate endpoint',
  numbers: '12 followers · $0 MRR',
  blockerLesson: 'Never dump setup labels into posts.',
  link: 'https://www.getshiploud.com',
}
const project = {
  name: 'ShipLoud',
  building: 'grow X by turning ship notes into posts — MUST NOT appear',
  who: 'indie builders',
  goal: '$10K MRR',
  voice: 'short lines',
  url: 'https://www.getshiploud.com',
}

const prompt = buildPrompt(journal, project)
assert(!/Building:\s/i.test(prompt.user.split('Silent')[0]), 'user journal block has no Building: paste')
assert(/Silent project context/i.test(prompt.user), 'prompt includes silent context section')
assert(/NEVER paste labels/i.test(prompt.system), 'system forbids setup labels')

const texts = templateDrafts(journal, project)
assert(texts.length >= 5 && texts.length <= 6, `template returns 5–6 drafts (got ${texts.length})`)
for (const t of texts) {
  assert(xLength(t) <= X_LIMIT, `template draft <=280 (got ${xLength(t)})`)
  assert(!/\bBuilding:\s|\bGoal:\s|grow X by turning/i.test(t), 'no setup dump in template')
}

const fallback = await generateDrafts(null, journal, project)
assert(fallback.source === 'template', 'null AI → template source')
assert(fallback.drafts.length >= 5, 'template fallback count')

const mockAi = {
  async run(_model, _inputs) {
    return {
      response: JSON.stringify([
        'Shipped Workers AI drafts.\nShort options only.\nhttps://www.getshiploud.com',
        '12 followers.\nDrafts tab live.\nPosting the receipt.',
        'Never dump setup into posts.\nKept the feed short.',
        'Build log:\nAI draft generate\nShip → post → repeat.',
        'Bio said build in public.\nFeed now matches.\nhttps://www.getshiploud.com',
        'x'.repeat(500),
      ]),
    }
  },
}
const aiRes = await generateDrafts(mockAi, journal, project)
assert(aiRes.source === 'ai', 'mock AI → source ai')
assert(aiRes.model === AI_MODEL, 'reports model id')
assert(aiRes.drafts.length >= 3 && aiRes.drafts.length <= 6, 'AI drafts 3–6')
for (const d of aiRes.drafts) {
  assert(xLength(d.text) <= X_LIMIT, `AI draft <=280 (${xLength(d.text)})`)
}

const throwAi = {
  async run() {
    throw new Error('binding failed')
  },
}
const thrown = await generateDrafts(throwAi, journal, project)
assert(thrown.source === 'template', 'AI throw → template fallback')

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`)
process.exit(fail === 0 ? 0 : 1)
