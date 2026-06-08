/**
 * Renders a Zotero item's notes into a markdown section for the item's Anytype
 * object body, and composes the full object body (bibliographic section + notes).
 */

import { htmlToMarkdown } from './html-to-markdown';

export type RenderedNotes = {
  markdown: string;
  noteKeys: string[];
};

/**
 * Build the `## Notes` markdown section for an item from its current Zotero
 * notes. Empty notes are skipped. Returns the rendered markdown plus the keys
 * of the notes that were included (used to record sync state).
 */
export function renderNotesSection(item: Zotero.Item): RenderedNotes {
  const notes = Zotero.Items.get(item.getNotes(false));

  const sections: string[] = [];
  const noteKeys: string[] = [];

  for (const note of notes) {
    const html = note.getNote();
    if (!html) continue;

    const body = htmlToMarkdown(html);
    if (!body) continue;

    const title = note.getNoteTitle() || 'Note';
    sections.push(`### ${title}\n\n${body}`);
    noteKeys.push(note.key);
  }

  if (!sections.length) return { markdown: '', noteKeys: [] };

  return { markdown: `## Notes\n\n${sections.join('\n\n')}`, noteKeys };
}

/**
 * Compose the full Anytype object body from the bibliographic section and the
 * rendered notes section. Deterministic: the same inputs always produce the
 * same body (this is what makes re-sync idempotent).
 */
export function composeItemBody(bibBody: string, noteSection: string): string {
  return noteSection ? `${bibBody}\n\n---\n\n${noteSection}` : bibBody;
}
