# Note-sync rework + docs cleanup — Design

Date: 2026-06-08
Branch: `remove-notion-rename-anytero`

## Problem (#2: note sync)

`AnytypeClient` exposes only object-level operations — `body` (a markdown
string) and `properties`. There is no block-level API. The current note sync
was ported from Notero's Notion block model and is broken on this constraint:

- `sync-regular-item.ts` sets the object `body` to the bibliographic content
  produced by `property-builder.ts`.
- `sync-note-item.ts` separately GETs the object and **appends** note content
  to `object.body`.

Consequences:

1. **Body conflict / note loss** — a regular-item re-sync overwrites `body`
   with bibliographic content only, wiping previously-synced notes.
2. **Unbounded duplication** — re-syncing a note appends `**Updated Note:**` +
   content to `body` every time; notes accumulate without bound.
3. **Lost formatting** — `convertHtmlToMarkdown` strips all HTML to
   `textContent`, discarding headings, emphasis, links, lists.
4. **Dead tracking** — the `SyncedNotes` per-note `blockID` / `containerBlockID`
   model is meaningless without a block API; `sync-note-item` returns fake
   `note_${Date.now()}` IDs.

## Goal

Make item+note sync **idempotent** and **lossless within markdown's limits**:
re-running a sync any number of times produces the same Anytype object `body`,
which faithfully reflects the current Zotero item and its notes.

## Approach (chosen: single object, rebuilt body)

The object `body` is a pure projection of `bibliographic section + rendered
notes`. Both sync paths converge on one operation: **rebuild this item's body
from the item and all its current notes**, then PATCH the whole body.

### Components

- **`property-builder.ts`** (unchanged behavior) — produces the bibliographic
  section. Its output becomes the body *header* rather than the entire body.
- **`html-to-markdown.ts`** (new, in `src/content/anytype/`) — a hand-written
  DOM walker using `DOMParser` (no new dependency, consistent with having
  dropped `@notionhq/client`). Converts the HTML elements Zotero notes actually
  emit: headings (`h1`–`h6`), `strong`/`b`, `em`/`i`, `a`, `ul`/`ol`/`li`,
  `blockquote`, `p`, `br`, inline `code`/`pre`. Unknown elements fall back to
  their text content.
- **`note-renderer.ts`** (new, in `src/content/anytype/`) — given a Zotero item,
  reads `item.getNotes(false)`, converts each non-empty note via
  `html-to-markdown`, and returns a `## Notes` section with one `###` subsection
  per note (titled from the note title when available). Returns empty string
  when there are no non-empty notes.
- **`sync-regular-item.ts`** — `body = bibSection + noteSection`. Create/update
  unchanged otherwise, including the existing 404-on-update → remove stale
  attachment → recreate recovery.
- **`sync-note-item.ts`** — collapses to: resolve the note's parent item; if the
  parent has a synced Anytype object, rebuild the parent via the regular-item
  path. A note sync is a parent rebuild.
- **`sync-job.ts`** — when iterating items, dedupe so that a regular item and its
  own notes present in the same batch rebuild the parent only once (collect
  affected parent items).

### Highlight colors

Plain markdown cannot express background/highlight colors. Highlighted text is
preserved as plain text; color is dropped. Documented as a known limitation
(do not invent non-standard syntax).

### Tracking simplification

`SyncedNotes` shrinks to `{ notes: { [noteKey]: { syncedAt } } }` — drop
`blockID` and `containerBlockID`. After a successful rebuild, record `syncedAt`
for each note so `SyncManager.getNotesToSync` continues to skip unchanged notes
(preserving the existing debounce/skip behavior). `getSyncedNotes` /
`saveSyncedNote` remain but simplified; the fake block IDs are removed.

### Out of scope

- Block-level Anytype API support.
- Separate Anytype object per note / object linking.
- Bidirectional sync.

## Testing

- `html-to-markdown` — table-driven fixtures (paragraphs, emphasis, links,
  ordered/unordered lists, blockquote, headings, nested, plain text).
- `note-renderer` — 0 notes, 1 note, many notes, empty-note skipping.
- Idempotency — building an item body twice yields identical output.
- Existing `sync-manager` tests remain green.

## #4: docs cleanup

The `docs/` set and parts of the README describe features that do not exist
(v2.0.0, "100% coverage", attachment sync, a `/health` endpoint, UI like
"Clear Sync State" / "Re-sync All Items" / sync direction).

- **Delete** fabricated docs: `PROJECT-SUMMARY.md`, `RELEASE-NOTES.md`,
  `TROUBLESHOOTING.md`, `context.md`.
- **Rewrite** `DATA-MAPPING.md` to match the actual mappings in
  `property-builder.ts`.
- **Verify/trim** `INSTALLATION.md` against real install + connect steps; keep
  only what is accurate.
- **Align README** to reality (remove claims for nonexistent behavior; keep the
  accurate Anytype usage flow and upstream Notero attribution).

Each file will be read and judged individually during implementation; the above
is the expected disposition.

## Success criteria

- `npm run verify` and `npm run build` stay green.
- New unit tests pass and cover the converter, renderer, and idempotency.
- Re-syncing an item with notes twice produces an identical Anytype object body.
- No remaining doc claims describe nonexistent features.
