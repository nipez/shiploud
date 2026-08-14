import { buildSync } from "esbuild"
import path from "path"
import os from "os"
import { fileURLToPath, pathToFileURL } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const outfile = path.join(os.tmpdir(), "shiploud-generate-smoke.mjs")

buildSync({
  entryPoints: [path.join(root, "src/generate.ts")],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile,
})

const mod = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`)
const { generateDraftsFromJournal, xLength, X_LIMIT, isShortEnough } = mod

const journal = {
  id: "journal-smoke",
  date: "2026-08-12",
  shipped:
    "Building: ShipLoud dogfood app for indie builders. Goal: $10K MRR. Shipped today: Drafts tab + cloud sync + setup URL rewrite to https://www.getshiploud.com — also pasted who/voice walls into notes by mistake while testing.",
  numbers: "~12 followers · $0 MRR · 1 product shipped · 476-char bug found in Drafts All filter",
  blockerLesson:
    "Lesson: never show essay drafts as Option 1 of 6. Users click Regen and still see 476-char walls because cloud re-appended old blobs. Fix: strip overlong pending on load and only list xLength<=280.",
  link: "https://www.getshiploud.com",
  updatedAt: "2026-08-12T22:00:00.000Z",
  projectId: "project-shiploud",
}

const setup = {
  activeProjectId: "project-shiploud",
  projects: [
    {
      id: "project-shiploud",
      name: "ShipLoud",
      building:
        "grow X by turning ship notes into posts (ShipLoud) — long setup field that must NEVER be pasted into drafts",
      who: "indie builders / vibe coders on X who hate LinkedIn soup",
      goal: "$10K MRR and beyond with daily receipts",
      voice: "short lines, numbers, no guru speak",
      favoriteBuilders: ["@marclou", "@levelsio"],
      url: "https://www.getshiploud.com",
    },
  ],
  updatedAt: "2026-08-12T22:00:00.000Z",
}

const drafts = generateDraftsFromJournal(journal, setup)
console.log("Generated", drafts.length, "drafts:")
let fail = 0
for (const d of drafts) {
  const len = xLength(d.text)
  const ok = isShortEnough(d.text)
  const thread = d.label === "Thread starter"
  console.log(`- [${ok ? "OK" : "FAIL"}] ${len}/${X_LIMIT}${thread ? " (thread)" : ""} label=${d.label ?? "-"}`)
  console.log(d.text)
  console.log("---")
  if (!ok) fail++
  if (/\bBuilding:\s|\bGoal:\s|grow X by turning ship notes/i.test(d.text)) {
    console.error("FAIL: looks like setup dump in", d.id)
    fail++
  }
}

if (fail > 0) {
  console.error(`SMOKE FAIL: ${fail} draft(s) over ${X_LIMIT}`)
  process.exit(1)
}
console.log("SMOKE PASS: all drafts <=", X_LIMIT)
