# Note-sync rework + docs cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Zotero item+note sync into Anytype idempotent and formatting-aware by rebuilding the object `body` (bibliographic section + rendered notes) on every sync, and remove the AI-hallucinated docs.

**Architecture:** `AnytypeClient` only supports object-level `body` (markdown) + `properties` — no blocks. So an item's object `body` becomes a pure projection of `bib + notes`. Both regular-item and note syncs converge on one operation: rebuild the parent item's body from the item and all its current notes, then PATCH the whole body. Notes are converted from HTML to markdown by a small hand-written DOM walker.

**Tech Stack:** TypeScript (strict), Vitest + jsdom, `DOMParser` (available in Zotero's engine and jsdom).

**Spec:** `docs/superpowers/specs/2026-06-08-note-sync-rework-design.md`

---

## File Structure

- Create `src/content/anytype/html-to-markdown.ts` — `htmlToMarkdown(html)`: HTML → markdown for Zotero notes.
- Create `src/content/anytype/__tests__/html-to-markdown.spec.ts`.
- Create `src/content/anytype/note-renderer.ts` — `renderNotesSection(item)` and `composeItemBody(bib, notes)`.
- Create `src/content/anytype/__tests__/note-renderer.spec.ts`.
- Modify `src/content/anytype/item-data.ts` — simplify `SyncedNotes` to `{ notes?: { [key]: { syncedAt } } }`; replace `saveSyncedNote` with `saveSyncedNotes(item, noteKeys)`.
- Modify `src/content/anytype/sync-regular-item.ts` — compose `body = bib + notes`; record synced notes.
- Delete `src/content/anytype/sync-note-item.ts` — folded into sync-job.
- Modify `src/content/anytype/sync-job.ts` — resolve note→parent, rebuild via `syncRegularItem`, dedupe parents per batch.
- Modify `src/content/anytype/index.ts` — drop `syncNoteItem` export.
- Modify `src/content/services/__tests__/sync-manager.spec.ts` — drop `blockID` from the mocked `getSyncedNotes` return (type changed).
- `#4` docs: delete `docs/PROJECT-SUMMARY.md`, `docs/RELEASE-NOTES.md`, `docs/TROUBLESHOOTING.md`, `docs/context.md`; rewrite `docs/DATA-MAPPING.md`; trim `docs/INSTALLATION.md`; align `README.md`.

---

## Task 1: HTML → markdown converter

**Files:**
- Create: `src/content/anytype/html-to-markdown.ts`
- Test: `src/content/anytype/__tests__/html-to-markdown.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/content/anytype/__tests__/html-to-markdown.spec.ts
import { describe, expect, it } from 'vitest';

import { htmlToMarkdown } from '../html-to-markdown';

describe('htmlToMarkdown', () => {
  it('returns plain text unchanged', () => {
    expect(htmlToMarkdown('plain text')).toBe('plain text');
  });

  it('converts a paragraph', () => {
    expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world');
  });

  it('converts two paragraphs with a blank line', () => {
    expect(htmlToMarkdown('<p>a</p><p>b</p>')).toBe('a\n\nb');
  });

  it('converts bold and italic', () => {
    expect(htmlToMarkdown('<p>Hello <strong>bold</strong> <em>it</em></p>')).toBe(
      'Hello **bold** *it*',
    );
  });

  it('converts links', () => {
    expect(
      htmlToMarkdown('<p>See <a href="https://x.com">link</a></p>'),
    ).toBe('See [link](https://x.com)');
  });

  it('converts headings', () => {
    expect(htmlToMarkdown('<h1>Title</h1><p>Body</p>')).toBe(
      '# Title\n\nBody',
    );
  });

  it('converts unordered lists', () => {
    expect(htmlToMarkdown('<ul><li>a</li><li>b</li></ul>')).toBe('- a\n- b');
  });

  it('converts ordered lists', () => {
    expect(htmlToMarkdown('<ol><li>a</li><li>b</li></ol>')).toBe(
      '1. a\n2. b',
    );
  });

  it('converts blockquotes', () => {
    expect(htmlToMarkdown('<blockquote>quote</blockquote>')).toBe('> quote');
  });

  it('falls back to text content for unknown elements', () => {
    expect(htmlToMarkdown('<div><span>x</span></div>')).toBe('x');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/anytype/__tests__/html-to-markdown.spec.ts`
Expected: FAIL — cannot find module `../html-to-markdown`.

- [ ] **Step 3: Write the implementation**

```ts
// src/content/anytype/html-to-markdown.ts
/**
 * Minimal HTML -> Markdown converter for Zotero note content.
 *
 * Runs in Zotero's JS engine using the global `DOMParser` (no Node built-ins).
 * Highlight / background colors are not representable in plain markdown, so they
 * are dropped while the highlighted text is preserved.
 */

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return convertChildren(doc.body)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function convertChildren(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    out += convertNode(child);
  });
  return out;
}

function convertNode(node: Node): string {
  if (node.nodeType === TEXT_NODE) {
    return (node.textContent || '').replace(/\s+/g, ' ');
  }
  if (node.nodeType !== ELEMENT_NODE) return '';

  const el = node as Element;
  const inner = convertChildren(el);

  switch (el.tagName.toLowerCase()) {
    case 'h1':
      return `\n\n# ${inner}\n\n`;
    case 'h2':
      return `\n\n## ${inner}\n\n`;
    case 'h3':
      return `\n\n### ${inner}\n\n`;
    case 'h4':
      return `\n\n#### ${inner}\n\n`;
    case 'h5':
      return `\n\n##### ${inner}\n\n`;
    case 'h6':
      return `\n\n###### ${inner}\n\n`;
    case 'p':
      return `\n\n${inner}\n\n`;
    case 'br':
      return '\n';
    case 'strong':
    case 'b':
      return inner.trim() ? `**${inner}**` : inner;
    case 'em':
    case 'i':
      return inner.trim() ? `*${inner}*` : inner;
    case 'code':
      return inner.trim() ? `\`${inner}\`` : inner;
    case 'pre':
      return `\n\n\`\`\`\n${inner}\n\`\`\`\n\n`;
    case 'a': {
      const href = el.getAttribute('href');
      return href ? `[${inner}](${href})` : inner;
    }
    case 'ul':
      return `\n\n${convertList(el, false)}\n\n`;
    case 'ol':
      return `\n\n${convertList(el, true)}\n\n`;
    case 'blockquote':
      return `\n\n${inner
        .trim()
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')}\n\n`;
    default:
      return inner;
  }
}

function convertList(listEl: Element, ordered: boolean): string {
  return Array.from(listEl.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((li, index) => {
      const marker = ordered ? `${index + 1}.` : '-';
      const content = convertChildren(li).trim().replace(/\s*\n\s*/g, ' ');
      return `${marker} ${content}`;
    })
    .join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/anytype/__tests__/html-to-markdown.spec.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/anytype/html-to-markdown.ts src/content/anytype/__tests__/html-to-markdown.spec.ts
git commit -m "feat: Add HTML-to-markdown converter for Zotero notes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Note renderer + body composition

**Files:**
- Create: `src/content/anytype/note-renderer.ts`
- Test: `src/content/anytype/__tests__/note-renderer.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/content/anytype/__tests__/note-renderer.spec.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/content/anytype/__tests__/note-renderer.spec.ts`
Expected: FAIL — cannot find module `../note-renderer`.

- [ ] **Step 3: Write the implementation**

```ts
// src/content/anytype/note-renderer.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/content/anytype/__tests__/note-renderer.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/content/anytype/note-renderer.ts src/content/anytype/__tests__/note-renderer.spec.ts
git commit -m "feat: Add note renderer and item body composition

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Simplify synced-note tracking in item-data

**Files:**
- Modify: `src/content/anytype/item-data.ts`
- Modify: `src/content/services/__tests__/sync-manager.spec.ts`

- [ ] **Step 1: Replace the `SyncedNotes` type**

In `src/content/anytype/item-data.ts`, replace:

```ts
export type SyncedNotes = {
  containerBlockID?: string;
  notes?: {
    [noteItemKey: Zotero.DataObjectKey]: {
      blockID: string;
      syncedAt?: Date;
    };
  };
};
```

with:

```ts
export type SyncedNotes = {
  notes?: {
    [noteItemKey: Zotero.DataObjectKey]: {
      syncedAt: Date;
    };
  };
};
```

- [ ] **Step 2: Simplify `getSyncedNotesFromAttachment`**

Replace the whole `getSyncedNotesFromAttachment` function with:

```ts
export function getSyncedNotesFromAttachment(
  attachment: Zotero.Item,
): SyncedNotes {
  const syncedNotesJSON = getSyncedNotesJSON(attachment);
  if (!syncedNotesJSON) return {};

  const parsedValue: unknown = JSON.parse(syncedNotesJSON);
  if (!isObject(parsedValue)) return {};

  const notes: Required<SyncedNotes>['notes'] = {};

  if (isObject(parsedValue.notes)) {
    Object.entries(parsedValue.notes).forEach(([key, value]) => {
      if (!isObject(value)) return;
      const { syncedAt } = value;
      if (typeof syncedAt !== 'string') return;
      notes[key] = { syncedAt: new Date(syncedAt) };
    });
  }

  return { notes };
}
```

- [ ] **Step 3: Replace `saveSyncedNote` with `saveSyncedNotes`**

Replace the whole `saveSyncedNote` function with:

```ts
/**
 * Record the set of notes that were included in the most recent rebuild of the
 * item's Anytype object body. Overwrites the previous record so that deleted
 * notes naturally drop out of tracking.
 */
export async function saveSyncedNotes(
  item: Zotero.Item,
  noteKeys: string[],
): Promise<void> {
  const attachment = getAnytypeLinkAttachment(item);
  if (!attachment) return;

  const now = new Date();
  const notes: Required<SyncedNotes>['notes'] = {};
  noteKeys.forEach((key) => {
    notes[key] = { syncedAt: now };
  });

  updateAnytypeLinkAttachmentNote(attachment, { notes });

  await attachment.saveTx();
}
```

- [ ] **Step 4: Fix the sync-manager test mock**

In `src/content/services/__tests__/sync-manager.spec.ts`, replace the `mockedGetSyncedNotes.mockReturnValue({...})` block with (drop `blockID`):

```ts
mockedGetSyncedNotes.mockReturnValue({
  notes: {
    [syncedNoteItem.key]: {
      syncedAt: new Date(syncedNoteItem.dateModified),
    },
    [outOfSyncNoteItem.key]: {
      syncedAt: new Date(
        new Date(outOfSyncNoteItem.dateModified).getTime() - 10_000,
      ),
    },
  },
});
```

- [ ] **Step 5: Run typecheck + sync-manager tests**

Run: `npm run typecheck && npx vitest run src/content/services/__tests__/sync-manager.spec.ts`
Expected: typecheck PASS; sync-manager tests PASS (32). (`sync-regular-item.ts` and `sync-job.ts` still reference the old API and will be fixed in Tasks 4-5; if typecheck flags them here, that is expected — proceed and they go green after Task 5. If you prefer a clean gate, run only the two spec files until Task 5.)

- [ ] **Step 6: Commit**

```bash
git add src/content/anytype/item-data.ts src/content/services/__tests__/sync-manager.spec.ts
git commit -m "refactor: Simplify synced-note tracking to syncedAt only

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Rebuild regular-item body from bib + notes

**Files:**
- Modify: `src/content/anytype/sync-regular-item.ts`

- [ ] **Step 1: Update imports**

At the top of `src/content/anytype/sync-regular-item.ts`, replace the item-data and property-builder imports with:

```ts
import {
  getAnytypeLinkAttachment,
  getAnytypeObjectID,
  saveAnytypeLinkAttachment,
  saveAnytypeTag,
  saveSyncedNotes,
} from './item-data';
import { composeItemBody, renderNotesSection } from './note-renderer';
import { buildAnytypeProperties } from './property-builder';
```

- [ ] **Step 2: Update the top-level `syncRegularItem`**

Replace the `syncRegularItem` function body with:

```ts
export async function syncRegularItem(
  item: Zotero.Item,
  params: SyncRegularItemParams,
): Promise<void> {
  const { markdown: noteSection, noteKeys } = renderNotesSection(item);

  const anytypeObject = await saveItemToSpace(item, params, noteSection);

  await saveAnytypeTag(item);
  await saveAnytypeLinkAttachment(item, anytypeObject.id, params.spaceId);
  await saveSyncedNotes(item, noteKeys);
}
```

- [ ] **Step 3: Compose the body inside `saveItemToSpace`**

Replace the `saveItemToSpace` function with (note the new `noteSection` parameter and `composeItemBody` call):

```ts
async function saveItemToSpace(
  item: Zotero.Item,
  params: SyncRegularItemParams,
  noteSection: string,
): Promise<AnytypeObject> {
  const { anytypeClient, spaceId, typeKey, citationFormat, pageTitleFormat } =
    params;

  const objectId = getAnytypeObjectID(item);

  const { name, body: bibBody, properties } = await buildAnytypeProperties({
    item,
    citationFormat,
    pageTitleFormat,
  });

  const body = composeItemBody(bibBody, noteSection);

  if (objectId) {
    return updateObject(
      anytypeClient,
      spaceId,
      typeKey,
      objectId,
      name,
      body,
      properties,
      item,
    );
  }

  return createObject(anytypeClient, spaceId, typeKey, name, body, properties);
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS for `sync-regular-item.ts` (it may still fail in `sync-job.ts`/`index.ts` until Task 5 — that is expected).

- [ ] **Step 5: Commit**

```bash
git add src/content/anytype/sync-regular-item.ts
git commit -m "feat: Rebuild Anytype object body from bibliography + notes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Fold note sync into sync-job; delete sync-note-item

**Files:**
- Delete: `src/content/anytype/sync-note-item.ts`
- Modify: `src/content/anytype/sync-job.ts`
- Modify: `src/content/anytype/index.ts`

- [ ] **Step 1: Delete the obsolete note-sync module**

```bash
git rm src/content/anytype/sync-note-item.ts
```

- [ ] **Step 2: Update sync-job imports**

In `src/content/anytype/sync-job.ts`, replace:

```ts
import type { AnytypeClient } from './anytype-client';
import { syncNoteItem } from './sync-note-item';
import { syncRegularItem } from './sync-regular-item';
```

with:

```ts
import type { AnytypeClient } from './anytype-client';
import { getAnytypeObjectID } from './item-data';
import { syncRegularItem } from './sync-regular-item';
```

- [ ] **Step 3: Rewrite the `syncItems` loop**

Replace the whole `syncItems` function with (resolves note→parent, rebuilds via `syncRegularItem`, dedupes parents within the batch):

```ts
async function syncItems(
  items: Zotero.Item[],
  progressWindow: ProgressWindow,
  params: AnytypeSyncJobParams,
) {
  const rebuiltItemIDs = new Set<Zotero.Item['id']>();

  for (const [index, item] of items.entries()) {
    const step = index + 1;
    logger.groupCollapsed(
      `Syncing item ${step} of ${items.length} with ID`,
      item.id,
    );
    logger.debug(item.getDisplayTitle());

    await progressWindow.updateText(step);

    try {
      const target = item.isNote() ? item.parentItem : item;

      if (!target) {
        logger.warn('Note has no parent item; skipping');
      } else if (item.isNote() && !getAnytypeObjectID(target)) {
        logger.warn('Parent item not synced to Anytype; skipping note');
      } else if (rebuiltItemIDs.has(target.id)) {
        logger.debug('Parent already rebuilt in this job; skipping', target.id);
      } else {
        await syncRegularItem(target, params);
        rebuiltItemIDs.add(target.id);
      }
    } catch (error) {
      throw new ItemSyncError(error, item);
    } finally {
      logger.groupEnd();
    }

    progressWindow.updateProgress(step);

    // Add delay between items to avoid rate limiting (except for the last item)
    if (step < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
    }
  }

  progressWindow.complete();
}
```

- [ ] **Step 4: Drop the `syncNoteItem` export**

In `src/content/anytype/index.ts`, remove the line:

```ts
export { syncNoteItem } from './sync-note-item';
```

- [ ] **Step 5: Run full verify + build**

Run: `npm run verify && npm run build`
Expected: prettier PASS, lint PASS, typecheck PASS, all tests PASS (existing + new converter/renderer suites); build exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/content/anytype/sync-job.ts src/content/anytype/index.ts
git commit -m "feat: Sync notes by rebuilding the parent item object

Folds note sync into the regular-item rebuild, dedupes parents per batch,
and removes the append-based sync-note-item module.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Docs cleanup (#4)

**Files:**
- Delete: `docs/PROJECT-SUMMARY.md`, `docs/RELEASE-NOTES.md`, `docs/TROUBLESHOOTING.md`, `docs/context.md`
- Modify: `docs/DATA-MAPPING.md`, `docs/INSTALLATION.md`, `README.md`

- [ ] **Step 1: Delete the fabricated docs**

```bash
git rm docs/PROJECT-SUMMARY.md docs/RELEASE-NOTES.md docs/TROUBLESHOOTING.md docs/context.md
```

- [ ] **Step 2: Rewrite `docs/DATA-MAPPING.md` to match `property-builder.ts`**

Overwrite `docs/DATA-MAPPING.md` with content describing the *actual* mappings from `src/content/anytype/property-builder.ts`:

```markdown
# Data Mapping

Anytero maps Zotero item fields to an Anytype object's **properties** and
composes the object **body** (markdown) from the item's bibliographic data and
its notes.

## Properties

Each property is only set when the Zotero field has a value.

| Zotero field         | Anytype property key | Type   | Notes                                  |
| -------------------- | -------------------- | ------ | -------------------------------------- |
| Title                | `title`              | text   | `item.getDisplayTitle()`               |
| Primary creators     | `authors`            | text   | "Last, First" joined by "; "           |
| Year                 | `year`               | number | Parsed from the item's date            |
| Item type            | `item_type`          | select | Localized item type name               |
| Publication title    | `publication`        | text   | Journal / book / venue                 |
| DOI                  | `doi`                | url    | `https://doi.org/<DOI>`                |
| ISBN                 | `isbn`               | text   |                                        |
| ISSN                 | `issn`               | text   |                                        |
| URL                  | `url`                | url    |                                        |

Text properties are truncated to stay within Anytype's length limits.

## Object body

The object body is rebuilt on every sync (so re-syncing is idempotent) and
contains:

1. A bibliographic section: title, authors, publication, date, DOI, URL,
   collections, tags, item type, citation key, and abstract.
2. A `## Notes` section (when the item has non-empty notes), with one `###`
   subsection per Zotero note. Note HTML is converted to markdown; highlight
   colors cannot be represented in markdown and are dropped (the highlighted
   text is preserved).

## Not synced

File attachments are not uploaded. Use the URL/DOI properties to locate the
original.
```

- [ ] **Step 3: Verify and trim `docs/INSTALLATION.md`**

Read `docs/INSTALLATION.md`. Remove any statements describing features that do
not exist in the code (cross-check against the README's "Installation and Setup"
section and `src/content/prefs/preferences.xhtml`). Keep only: installing the
`.xpi`, opening Anytero preferences, the Connect-to-Anytype 4-digit-code flow,
selecting a space and object type. If after trimming the file duplicates the
README with nothing extra, delete it with `git rm docs/INSTALLATION.md` instead.

- [ ] **Step 4: Align `README.md` with reality**

Read `README.md`. Remove/repair any claims for behavior that does not exist
(e.g. attachment syncing, troubleshooting steps referencing nonexistent UI).
Keep the accurate usage flow, the property table (it already matches
`property-builder.ts`), and the upstream Notero attribution and links. Do not
rename legitimate references to the upstream Notero project.

- [ ] **Step 5: Commit**

```bash
git add -A docs README.md
git commit -m "docs: Remove fabricated docs and align remaining docs with reality

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run the full gate**

Run: `npm run verify && npm run build`
Expected: prettier PASS, lint PASS, typecheck PASS, all tests PASS, build exit 0.

- [ ] **Step 2: Confirm no stale references**

Run: `grep -rn "syncNoteItem\|convertHtmlToMarkdown\|blockID\|containerBlockID" src`
Expected: no matches.

- [ ] **Step 3: Confirm idempotency intent**

Re-read `note-renderer.ts` `composeItemBody` and `renderNotesSection`: given the
same item state they return identical output, so a repeated sync PATCHes the
object with an identical body. (No code change — this is a verification step.)

---

## Self-Review notes

- **Spec coverage:** body-rebuild (Tasks 4-5), HTML→markdown incl. dropped colors (Task 1), note renderer + `## Notes`/`###` layout (Task 2), tracking simplification (Task 3), sync-job dedupe + note→parent (Task 5), docs cleanup (Task 6), tests (Tasks 1-2), verify/build green (Tasks 5,7). All spec sections covered.
- **Type consistency:** `renderNotesSection` returns `{ markdown, noteKeys }` (used in Task 4); `composeItemBody(bibBody, noteSection)`; `saveSyncedNotes(item, noteKeys: string[])`; `SyncedNotes = { notes?: { [key]: { syncedAt: Date } } }` — consistent across Tasks 2-5.
- **Known interim state:** Tasks 3-4 may leave `npm run typecheck` red until Task 5 completes (sync-job still references removed `syncNoteItem`); the full green gate is Task 5 Step 5. This is called out in those tasks.
