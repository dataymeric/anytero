# Reading List Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync the Reading List plugin's `Read_Status` Extra field value to Anytype as a `select` property, controlled by an opt-in preference.

**Architecture:** Three small, independent changes: (1) add `syncReadingListStatus` to the pref enum and type system; (2) wire up the UI checkbox + Fluent string; (3) read the pref and parse the Extra field inside `AnytypePropertyBuilder`, adding the `reading_status` select property when enabled.

**Tech Stack:** TypeScript, Zotero Prefs API, Vitest + vitest-mock-extended.

---

### Task 1: Add `syncReadingListStatus` pref

**Files:**
- Modify: `src/content/prefs/anytero-pref.ts`

- [ ] **Step 1: Add to `AnyteroPref` enum**

In `src/content/prefs/anytero-pref.ts`, add the new key to the enum (keep alphabetical order):

```ts
export enum AnyteroPref {
  anytypeApiKey = 'anytypeApiKey',
  anytypeLibraryCollectionId = 'anytypeLibraryCollectionId',
  anytypeSpaceId = 'anytypeSpaceId',
  anytypeTypeKey = 'anytypeTypeKey',
  collectionSyncConfigs = 'collectionSyncConfigs',
  pageTitleFormat = 'pageTitleFormat',
  syncNotes = 'syncNotes',
  syncOnModifyItems = 'syncOnModifyItems',
  syncReadingListStatus = 'syncReadingListStatus',
}
```

- [ ] **Step 2: Add to `AnyteroPrefValue` type**

In the same file, add the new entry to `AnyteroPrefValue`:

```ts
type AnyteroPrefValue = Partial<{
  [AnyteroPref.anytypeApiKey]: string;
  [AnyteroPref.anytypeLibraryCollectionId]: string;
  [AnyteroPref.anytypeSpaceId]: string;
  [AnyteroPref.anytypeTypeKey]: string;
  [AnyteroPref.collectionSyncConfigs]: string;
  [AnyteroPref.pageTitleFormat]: PageTitleFormat;
  [AnyteroPref.syncNotes]: boolean;
  [AnyteroPref.syncOnModifyItems]: boolean;
  [AnyteroPref.syncReadingListStatus]: boolean;
}>;
```

- [ ] **Step 3: Add to `convertRawPrefValue` return object**

In `convertRawPrefValue`, add the entry alongside the other boolean prefs:

```ts
  return {
    [AnyteroPref.anytypeApiKey]: stringPref,
    [AnyteroPref.anytypeLibraryCollectionId]: stringPref,
    [AnyteroPref.anytypeSpaceId]: stringPref,
    [AnyteroPref.anytypeTypeKey]: stringPref,
    [AnyteroPref.collectionSyncConfigs]: stringPref,
    [AnyteroPref.pageTitleFormat]: pageTitleFormatPref,
    [AnyteroPref.syncNotes]: booleanPref,
    [AnyteroPref.syncOnModifyItems]: booleanPref,
    [AnyteroPref.syncReadingListStatus]: booleanPref,
  }[pref];
```

- [ ] **Step 4: Commit**

```bash
git add src/content/prefs/anytero-pref.ts
git commit -m "feat: Add syncReadingListStatus pref"
```

---

### Task 2: Add UI — Fluent string + preferences checkbox

**Files:**
- Modify: `src/locale/en-US/anytero.ftl`
- Modify: `src/content/prefs/preferences.xhtml`

- [ ] **Step 1: Add Fluent string**

In `src/locale/en-US/anytero.ftl`, under the `## Sync preferences` section, after the `anytero-preferences-sync-notes` entry:

```
anytero-preferences-sync-reading-list-status =
    .label = Sync reading list status (requires Reading List plugin)
```

The full sync section should then look like:

```
## Sync preferences

anytero-preferences-sync-groupbox-heading = Sync Preferences
anytero-preferences-sync-groupbox-description1 = Anytero will monitor the collections enabled below. Items in the enabled collections will sync to Anytype when added to that collection and whenever the items are modified.
anytero-preferences-sync-groupbox-description2 = To enable/disable a collection, either select the row and press the {"[Enter]"} key or double-click the row. To select multiple rows, hold {"[Shift]"} and then click.
anytero-preferences-collection-column = Collection
anytero-preferences-sync-enabled-column = Sync Enabled
anytero-preferences-sync-on-modify-items =
    .label = Sync when items are modified
anytero-preferences-sync-notes =
    .label = Sync notes
anytero-preferences-sync-reading-list-status =
    .label = Sync reading list status (requires Reading List plugin)
```

- [ ] **Step 2: Add checkbox to preferences.xhtml**

In `src/content/prefs/preferences.xhtml`, after the `anytero-syncNotes` checkbox (which ends at line 128), add the new checkbox inside the same `<groupbox>`:

```xml
  <checkbox
    data-l10n-id="anytero-preferences-sync-reading-list-status"
    id="anytero-syncReadingListStatus"
    native="true"
    preference="extensions.anytero.syncReadingListStatus"
  />
```

The end of the sync groupbox should look like:

```xml
  <checkbox
    data-l10n-id="anytero-preferences-sync-on-modify-items"
    id="anytero-syncOnModifyItems"
    native="true"
    preference="extensions.anytero.syncOnModifyItems"
  />
  <checkbox
    data-l10n-id="anytero-preferences-sync-notes"
    id="anytero-syncNotes"
    native="true"
    preference="extensions.anytero.syncNotes"
  />
  <checkbox
    data-l10n-id="anytero-preferences-sync-reading-list-status"
    id="anytero-syncReadingListStatus"
    native="true"
    preference="extensions.anytero.syncReadingListStatus"
  />
</groupbox>
```

- [ ] **Step 3: Verify the build (fluent types are regenerated automatically)**

```bash
npm run verify
```

Expected: all checks pass. The pre-hooks regenerate `src/locale/fluent-types.ts` before typecheck, so the new `anytero-preferences-sync-reading-list-status` ID will be valid.

- [ ] **Step 4: Commit**

`fluent-types.ts` is auto-generated and not tracked in git — do not add it.

```bash
git add src/locale/en-US/anytero.ftl src/content/prefs/preferences.xhtml
git commit -m "feat: Add sync reading list status preference UI"
```

---

### Task 3: Implement `reading_status` property (TDD)

**Files:**
- Create: `src/content/anytype/__tests__/property-builder.spec.ts`
- Modify: `src/content/anytype/property-builder.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/content/anytype/__tests__/property-builder.spec.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createZoteroItemMock,
  mockZoteroPrefs,
  zoteroMock,
} from '../../../../test/utils';
import { PageTitleFormat } from '../../prefs/anytero-pref';
import { buildAnytypeProperties } from '../property-builder';

describe('buildAnytypeProperties – reading_status', () => {
  const baseParams = {
    citationFormat: 'apa',
    pageTitleFormat: PageTitleFormat.itemTitle,
  };

  function makeItem(extra: string) {
    const item = createZoteroItemMock({
      getDisplayTitle: () => 'Test Item',
      getCreators: () => [],
      getTags: () => [],
      itemTypeID: 1,
    });
    item.getField.mockImplementation((field) =>
      field === 'extra' ? extra : '',
    );
    return item;
  }

  beforeEach(() => {
    mockZoteroPrefs();
    zoteroMock.CreatorTypes.getPrimaryIDForType.mockReturnValue(null);
    zoteroMock.ItemTypes.getLocalizedString.mockReturnValue('journalArticle');
  });

  it('omits reading_status when pref is disabled (default)', async () => {
    const item = makeItem('Read_Status: Read');
    const { properties } = await buildAnytypeProperties({ ...baseParams, item });
    expect(properties.find((p) => p.key === 'reading_status')).toBeUndefined();
  });

  it('omits reading_status when pref is enabled but Extra has no Read_Status', async () => {
    zoteroMock.Prefs.set('extensions.anytero.syncReadingListStatus', true);
    const item = makeItem('');
    const { properties } = await buildAnytypeProperties({ ...baseParams, item });
    expect(properties.find((p) => p.key === 'reading_status')).toBeUndefined();
  });

  it('includes reading_status select when pref is enabled and Extra has Read_Status', async () => {
    zoteroMock.Prefs.set('extensions.anytero.syncReadingListStatus', true);
    const item = makeItem('Read_Status: In Progress');
    const { properties } = await buildAnytypeProperties({ ...baseParams, item });
    expect(properties.find((p) => p.key === 'reading_status')).toEqual({
      key: 'reading_status',
      select: 'In Progress',
    });
  });

  it('trims whitespace from the status value', async () => {
    zoteroMock.Prefs.set('extensions.anytero.syncReadingListStatus', true);
    const item = makeItem('Read_Status:  To Read  ');
    const { properties } = await buildAnytypeProperties({ ...baseParams, item });
    expect(properties.find((p) => p.key === 'reading_status')).toEqual({
      key: 'reading_status',
      select: 'To Read',
    });
  });

  it('finds Read_Status anywhere in a multi-line Extra field', async () => {
    zoteroMock.Prefs.set('extensions.anytero.syncReadingListStatus', true);
    const item = makeItem('Citation Key: smith2024\nRead_Status: Read\nOther: value');
    const { properties } = await buildAnytypeProperties({ ...baseParams, item });
    expect(properties.find((p) => p.key === 'reading_status')).toEqual({
      key: 'reading_status',
      select: 'Read',
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/content/anytype/__tests__/property-builder.spec.ts
```

Expected: 4 failures — `reading_status` property doesn't exist yet.

- [ ] **Step 3: Add the `reading_status` property definition to `property-builder.ts`**

First, update the import to include `AnyteroPref` and `getAnyteroPref` (the `PageTitleFormat` import is already there):

```ts
import {
  AnyteroPref,
  PageTitleFormat,
  getAnyteroPref,
} from '../prefs/anytero-pref';
```

Then add the `reading_status` entry at the end of `propertyDefinitions` in `AnytypePropertyBuilder`, after the `url` entry:

```ts
    {
      key: 'reading_status',
      buildValue: () => {
        if (!getAnyteroPref(AnyteroPref.syncReadingListStatus)) return null;
        const extra = this.item.getField('extra') as string;
        const match = extra.match(/^Read_Status:\s*(.+)$/m);
        const status = match?.[1]?.trim();
        if (!status) return null;
        return { key: 'reading_status', select: status };
      },
    },
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/content/anytype/__tests__/property-builder.spec.ts
```

Expected: 5 tests pass (the 4 new ones + any pre-existing tests in the file).

- [ ] **Step 5: Run full verify**

```bash
npm run verify
```

Expected: all checks pass.

- [ ] **Step 6: Commit**

```bash
git add src/content/anytype/__tests__/property-builder.spec.ts src/content/anytype/property-builder.ts
git commit -m "feat: Sync Reading List status to Anytype reading_status property"
```
