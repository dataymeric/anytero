import { describe, expect, it } from 'vitest';

import { createZoteroItemMock } from '../../../../test/utils';
import { composeItemBody, renderNotesSection } from '../note-renderer';

function makeNote(html: string, title: string) {
  return createZoteroItemMock({
    getNote: () => html,
    getNoteTitle: () => title,
    isNote: () => true,
  });
}

describe('renderNotesSection', () => {
  it('returns empty markdown and no keys when there are no notes', () => {
    const item = createZoteroItemMock({ getNotes: () => [] });

    expect(renderNotesSection(item)).toEqual({ markdown: '', noteKeys: [] });
  });

  it('renders one note under a Notes heading', () => {
    const note = makeNote('<p>Hello</p>', 'First');
    const item = createZoteroItemMock({ getNotes: () => [note.id] });

    expect(renderNotesSection(item)).toEqual({
      markdown: '## Notes\n\n### First\n\nHello',
      noteKeys: [note.key],
    });
  });

  it('renders multiple notes', () => {
    const note1 = makeNote('<p>Hello</p>', 'First');
    const note2 = makeNote('<p>World</p>', 'Second');
    const item = createZoteroItemMock({
      getNotes: () => [note1.id, note2.id],
    });

    expect(renderNotesSection(item)).toEqual({
      markdown: '## Notes\n\n### First\n\nHello\n\n### Second\n\nWorld',
      noteKeys: [note1.key, note2.key],
    });
  });

  it('skips empty notes', () => {
    const note1 = makeNote('', 'Empty');
    const note2 = makeNote('<p>Kept</p>', 'Kept');
    const item = createZoteroItemMock({
      getNotes: () => [note1.id, note2.id],
    });

    expect(renderNotesSection(item)).toEqual({
      markdown: '## Notes\n\n### Kept\n\nKept',
      noteKeys: [note2.key],
    });
  });
});

describe('composeItemBody', () => {
  it('returns the bib body unchanged when there are no notes', () => {
    expect(composeItemBody('BIB', '')).toBe('BIB');
  });

  it('joins bib and notes with a horizontal rule', () => {
    expect(composeItemBody('BIB', '## Notes\n\nx')).toBe(
      'BIB\n\n---\n\n## Notes\n\nx',
    );
  });
});
