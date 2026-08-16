import type { Draft, JournalEntry, Setup } from './types'
import { activeProject } from './types'
import { generateDraftsRemote, getToken, hasApi } from './api'
import {
  draftsFromTexts,
  generateDraftsFromJournal,
  isShortEnough,
  type DraftShape,
} from './generate'

export type GenerateMeta = { source: 'ai' | 'template'; count: number }

/**
 * Prefer Worker AI when logged in; fall back to local templates on any failure.
 */
export async function generateDraftsSmart(
  journal: JournalEntry,
  setup?: Setup | null,
  shape: DraftShape | 'all' = 'all',
): Promise<{ drafts: Draft[]; meta: GenerateMeta }> {
  if (!journal.shipped.trim()) {
    return { drafts: [], meta: { source: 'template', count: 0 } }
  }
  const project = setup ? activeProject(setup) : undefined
  if (shape !== 'all') {
    const local = generateDraftsFromJournal(journal, setup, shape).filter((d) => isShortEnough(d.text))
    return { drafts: local, meta: { source: 'template', count: local.length } }
  }
  if (hasApi() && getToken()) {
    try {
      const remote = await generateDraftsRemote({
        journal: {
          shipped: journal.shipped,
          numbers: journal.numbers,
          blockerLesson: journal.blockerLesson,
          link: journal.link,
          date: journal.date,
          projectId: journal.projectId ?? project?.id,
        },
        project: {
          id: project?.id,
          name: project?.name,
          building: project?.building,
          who: project?.who,
          goal: project?.goal,
          voice: project?.voice,
          url: project?.url,
        },
      })
      const source: Draft['source'] = remote.source === 'ai' ? 'ai' : 'journal-template'
      const drafts = draftsFromTexts(
        remote.drafts.map((d) => d.text),
        journal,
        setup,
        source,
      )
      const usable = drafts.filter((d) => isShortEnough(d.text))
      if (usable.length > 0) {
        return {
          drafts: usable,
          meta: { source: remote.source, count: usable.length },
        }
      }
    } catch {
      /* local fallback */
    }
  }
  const local = generateDraftsFromJournal(journal, setup).filter((d) => isShortEnough(d.text))
  return { drafts: local, meta: { source: 'template', count: local.length } }
}
