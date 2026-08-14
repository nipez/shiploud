import { buildSync } from 'esbuild'
import path from 'path'
import os from 'os'
import { webcrypto } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'url'

if (!globalThis.crypto) globalThis.crypto = webcrypto

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outfile = path.join(os.tmpdir(), 'shiploud-api-x-auth-test.mjs')

buildSync({
  entryPoints: [path.join(root, 'src/xAuth.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  external: [],
})

const mod = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`)
const {
  xPostingConfigured,
  oauthRedirectUri,
  DEFAULT_OAUTH_REDIRECT,
  X_AUTHORIZE_URL,
  X_SCOPES,
  X_LIMIT,
  randomVerifier,
  challengeS256,
  buildAuthorizeUrl,
  encryptSecret,
  decryptSecret,
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

assert(!xPostingConfigured({}), 'empty env → not configured')
assert(
  !xPostingConfigured({ X_CLIENT_ID: 'abc' }),
  'id only → not configured',
)
assert(
  xPostingConfigured({ X_CLIENT_ID: 'abc', X_CLIENT_SECRET: 'xyz' }),
  'id+secret → configured',
)
assert(oauthRedirectUri({}) === DEFAULT_OAUTH_REDIRECT, 'default redirect')
assert(
  oauthRedirectUri({ X_OAUTH_REDIRECT: ' https://example.com/cb ' }) === 'https://example.com/cb',
  'custom redirect trimmed',
)

const verifier = randomVerifier()
assert(verifier.length >= 32, `verifier length ${verifier.length}`)
assert(!/[+/=]/.test(verifier), 'verifier is base64url')
const challenge = await challengeS256(verifier)
assert(challenge.length >= 32, 'challenge length')
assert(challenge !== verifier, 'S256 challenge != verifier')

const url = buildAuthorizeUrl({
  clientId: 'cid',
  redirectUri: DEFAULT_OAUTH_REDIRECT,
  state: 'st',
  codeChallenge: challenge,
})
assert(url.startsWith(X_AUTHORIZE_URL + '?'), 'authorize host')
assert(url.includes('response_type=code'), 'response_type')
assert(url.includes('code_challenge_method=S256'), 'S256')
assert(url.includes(encodeURIComponent(X_SCOPES)), 'scopes encoded')
assert(url.includes(encodeURIComponent(DEFAULT_OAUTH_REDIRECT)), 'redirect encoded')
assert(!url.includes('client_secret'), 'authorize URL has no secret')

const wrapped = await encryptSecret('tok_plain', 'wrap-secret')
assert(wrapped.startsWith('enc:v1:'), 'wrap prefix')
assert(!wrapped.includes('tok_plain'), 'ciphertext hides plaintext')
const opened = await decryptSecret(wrapped, 'wrap-secret')
assert(opened === 'tok_plain', 'roundtrip decrypt')
assert((await decryptSecret('plain-token', null)) === 'plain-token', 'unwrapped passthrough')
assert(typeof X_LIMIT === 'number' && X_LIMIT === 280, 'X_LIMIT 280')

if (fail > 0) {
  console.error(`FAIL ${fail}`)
  process.exit(1)
}
console.log('PASS x-auth helpers')
