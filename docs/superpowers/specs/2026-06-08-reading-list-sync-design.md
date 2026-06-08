# Reading List Sync Design

**Date:** 2026-06-08
**Scope:** Sync reading status from the [Reading List plugin](https://github.com/Dominic-DallOsto/zotero-reading-list) into Anytype as a select property.

## Overview

When the Reading List plugin is installed, it stores a reading status per item in Zotero's Extra field (`Read_Status: <value>`). This design adds an opt-in preference to include that status as a `select` property on the Anytype object during sync.

## Data Model

**Source:** Zotero item Extra field, line matching `Read_Status: <value>`.
Known values: `New`, `To Read`, `In Progress`, `Read`, `Not Reading`.

**Destination:** Anytype `select` property with relation key `reading_status`, value = the raw status string.

If the Extra field has no `Read_Status` line, the property is omitted entirely — no empty value is pushed.

## Preference

- **Key:** `extensions.anytero.syncReadingListStatus` (boolean, default `false`)
- **UI:** Checkbox in the Sync groupbox in `preferences.xhtml`, after the existing "Sync notes" checkbox.
- **Label:** `Sync reading list status (requires Reading List plugin)`

The preference is always visible. It is the user's responsibility to have the Reading List plugin installed for the field to be populated.

## Implementation

### Files changed

| File | Change |
|------|--------|
| `src/content/prefs/anytero-pref.ts` | Add `syncReadingListStatus` to `AnyteroPref` enum |
| `src/content/anytype/property-builder.ts` | Read Extra field + conditionally add `reading_status` select property |
| `src/content/prefs/preferences.xhtml` | Add checkbox after "Sync notes" |
| `src/locale/en-US/anytero.ftl` | Add Fluent string for the checkbox label |
| `src/content/anytype/__tests__/property-builder.spec.ts` | Add test cases |

### Extraction logic

```ts
const extra = item.getField('extra') as string;
const match = extra.match(/^Read_Status:\s*(.+)$/m);
const status = match?.[1]?.trim();
if (status) {
  // add select property with key 'reading_status', value = status
}
```

### Property shape

Follows the same pattern as the existing `item_type` select property in `property-builder.ts`.

## Testing

- Property builder: test with `Read_Status` present → property included; absent → property omitted; pref disabled → property omitted even when present.
- No integration test needed — the pref and extraction are both simple, covered by unit tests.

## Out of scope

- `Read_Status_Date` (not requested)
- Plugin auto-detection (always show preference, user opts in)
- Writing status back from Anytype to Zotero (bidirectional sync is a separate project)
