import type { AppData, Setup } from './types'
import { emptyMetrics } from './types'
import { CANONICAL_SHIPLOUD_URL } from './url'

const DAY1 = '2026-08-12'

export const DEFAULT_SETUP: Setup = {
  activeProjectId: 'project-shiploud',
  projects: [
    {
      id: 'project-shiploud',
      name: 'ShipLoud',
      building: 'grow X by turning ship notes into posts (ShipLoud)',
      who: 'indie builders / vibe coders on X',
      goal: '$10K MRR and beyond',
      voice: 'short lines, numbers, no guru speak',
      favoriteBuilders: ['@marclou', '@levelsio'],
      url: CANONICAL_SHIPLOUD_URL,
      xHandle: '@dreamandbuildit',
    },
  ],
  updatedAt: `${DAY1}T18:00:00.000Z`,
}

export const SEED: AppData = {
  journals: [
    {
      id: 'journal-day1',
      date: DAY1,
      shipped: `ShipLoud landing to ${CANONICAL_SHIPLOUD_URL}`,
      numbers: '~9 followers · $0 MRR · 1 product shipped (landing)',
      blockerLesson:
        'X login blocked. Decision: dogfood before pitch — use the product ourselves first.',
      link: CANONICAL_SHIPLOUD_URL,
      updatedAt: `${DAY1}T18:00:00.000Z`,
      projectId: 'project-shiploud',
    },
  ],
  drafts: [
    {
      id: 'draft-1',
      text: `Shipped today.\n\nShipLoud landing → ${CANONICAL_SHIPLOUD_URL}\n\nNot waiting for perfect.`,
      status: 'ready',
      source: 'seed',
      createdAt: `${DAY1}T18:01:00.000Z`,
      updatedAt: `${DAY1}T18:01:00.000Z`,
      projectId: 'project-shiploud',
      projectName: 'ShipLoud',
    },
    {
      id: 'draft-2',
      text: "~9 followers · $0 MRR\n\nIdea → landing → live URL\nSame afternoon.\n\nPosting the receipt.",
      status: 'ready',
      source: 'seed',
      createdAt: `${DAY1}T18:02:00.000Z`,
      updatedAt: `${DAY1}T18:02:00.000Z`,
      projectId: 'project-shiploud',
      projectName: 'ShipLoud',
    },
    {
      id: 'draft-3',
      text: `Bio said build in public.\nFeed said otherwise.\n\nSo I shipped ShipLoud.\nJournal → drafts → queue.\n\n${CANONICAL_SHIPLOUD_URL}`,
      status: 'idea',
      source: 'seed',
      createdAt: `${DAY1}T18:03:00.000Z`,
      updatedAt: `${DAY1}T18:03:00.000Z`,
      projectId: 'project-shiploud',
      projectName: 'ShipLoud',
    },
    {
      id: 'draft-4',
      text: "X login blocked.\nDecision: dogfood before pitch.\n\nShipped: landing live.\nShip → post → repeat.",
      status: 'idea',
      source: 'seed',
      createdAt: `${DAY1}T18:04:00.000Z`,
      updatedAt: `${DAY1}T18:04:00.000Z`,
      projectId: 'project-shiploud',
      projectName: 'ShipLoud',
    },
    {
      id: 'draft-5',
      text: `Build log:\nShipLoud landing live\n~9 followers · $0 MRR\n\nShip → post → repeat.\n${CANONICAL_SHIPLOUD_URL}`,
      status: 'idea',
      source: 'seed',
      createdAt: `${DAY1}T18:05:00.000Z`,
      updatedAt: `${DAY1}T18:05:00.000Z`,
      projectId: 'project-shiploud',
      projectName: 'ShipLoud',
    },
  ],

  replies: [
    {
      id: 'reply-1',
      account: '@levelsio',
      postSummary: 'Asking what indie hackers actually ship daily vs. what they post about.',
      url: 'https://x.com/levelsio',
      suggestedReply:
        `Same gap hit me hard. Bio said build in public, feed was tool complaints. So I shipped ShipLoud — journal → drafts → reply targets → approval queue. Dogfooding day 1: ${CANONICAL_SHIPLOUD_URL}`,
      status: 'todo',
      createdAt: `${DAY1}T18:10:00.000Z`,
    },
    {
      id: 'reply-2',
      account: '@marc_louv',
      postSummary: 'Short post about shipping ugly MVPs before polishing distribution.',
      url: 'https://x.com/marc_louv',
      suggestedReply:
        'This. Landing live same afternoon. Followers still ~9, MRR $0, products shipped: 1. North star is shipped products, not vanity. Building ShipLoud so the posts match the shipping.',
      status: 'todo',
      createdAt: `${DAY1}T18:11:00.000Z`,
    },
    {
      id: 'reply-3',
      account: '@tdinh_me',
      postSummary: 'Thread on why most "build in public" accounts never show receipts.',
      url: 'https://x.com/tdinh_me',
      suggestedReply:
        `Receipts > vibes. Today: idea → landing → live URL. X login blocked so I'm dogfooding before the pitch. If you want drafts that sound like you shipped — waitlist at ${CANONICAL_SHIPLOUD_URL}`,
      status: 'todo',
      createdAt: `${DAY1}T18:12:00.000Z`,
    },
  ],
  setup: structuredClone(DEFAULT_SETUP),
  metrics: emptyMetrics(),
}
