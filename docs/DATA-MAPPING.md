# Data Mapping Guide: Zotero ↔ Anytype

This document explains how Anytero maps data between Zotero and Anytype.

## Overview

Anytero transforms Zotero bibliographic items into Anytype objects. Since Zotero and Anytype have different data models, some transformation is necessary.

## Object Types

### Zotero → Anytype

| Zotero Item Type | Anytype Object Type | Notes                                  |
| ---------------- | ------------------- | -------------------------------------- |
| Journal Article  | Page                | Standard page with properties          |
| Book             | Page                | Standard page with properties          |
| Book Section     | Page                | Standard page with properties          |
| Conference Paper | Page                | Standard page with properties          |
| Thesis           | Page                | Standard page with properties          |
| Report           | Page                | Standard page with properties          |
| Webpage          | Page                | Standard page with properties          |
| Note             | Page                | Converted to page with note content    |
| All Others       | Page                | Generic page with available properties |

**Note**: Anytype's REST API (as of v2025-11-08) primarily supports generic "page" objects. Future versions may support specialized object types.

## Property Mapping

### Core Metadata

| Zotero Field         | Anytype Property | Transformation                                            |
| -------------------- | ---------------- | --------------------------------------------------------- |
| `title`              | `title` (name)   | Direct mapping (string)                                   |
| `abstractNote`       | `description`    | Direct mapping (text)                                     |
| `creators` (authors) | `authors` (text) | Formatted as "LastName, FirstName; LastName2, FirstName2" |
| `date`               | `date`           | Parsed to ISO date format (YYYY-MM-DD)                    |
| `url`                | `url`            | Direct mapping (URL)                                      |
| `DOI`                | `doi`            | Direct mapping (string)                                   |
| `ISBN`               | `isbn`           | Direct mapping (string)                                   |
| `ISSN`               | `issn`           | Direct mapping (string)                                   |
| `itemType`           | `type`           | Direct mapping (e.g., "journalArticle", "book")           |

### Publication Information

| Zotero Field       | Anytype Property | Transformation          |
| ------------------ | ---------------- | ----------------------- |
| `publicationTitle` | `publication`    | Direct mapping (string) |
| `volume`           | `volume`         | Direct mapping (string) |
| `issue`            | `issue`          | Direct mapping (string) |
| `pages`            | `pages`          | Direct mapping (string) |
| `publisher`        | `publisher`      | Direct mapping (string) |
| `place`            | `place`          | Direct mapping (string) |

### Academic Metadata

| Zotero Field   | Anytype Property | Transformation          |
| -------------- | ---------------- | ----------------------- |
| `series`       | `series`         | Direct mapping (string) |
| `seriesNumber` | `series_number`  | Direct mapping (string) |
| `edition`      | `edition`        | Direct mapping (string) |
| `conference`   | `conference`     | Direct mapping (string) |

### System Metadata

| Zotero Field   | Anytype Property       | Transformation                 |
| -------------- | ---------------------- | ------------------------------ |
| `key`          | `zotero_key`           | Zotero item key (for tracking) |
| `dateAdded`    | `zotero_date_added`    | ISO timestamp                  |
| `dateModified` | `zotero_date_modified` | ISO timestamp                  |
| `itemType`     | `zotero_item_type`     | Zotero's item type identifier  |
| `collections`  | `zotero_collections`   | Array of collection names      |

## Special Cases

### Authors and Contributors

Zotero stores creators (authors, editors, etc.) as structured objects. Anytero transforms these to text format:

**Zotero Format**:

```json
{
  "creators": [
    { "firstName": "John", "lastName": "Doe", "creatorType": "author" },
    { "firstName": "Jane", "lastName": "Smith", "creatorType": "author" }
  ]
}
```

**Anytype Format**:

```
Doe, John; Smith, Jane
```

**Note**: Creator types (author, editor, translator) are preserved in a separate `creator_types` property if needed.

### Dates

Zotero supports flexible date formats (e.g., "2024", "Spring 2024", "2024-03-15"). Anytero parses these to ISO format when possible:

- **Exact dates**: "2024-03-15" → `2024-03-15`
- **Year only**: "2024" → `2024-01-01`
- **Month and year**: "March 2024" → `2024-03-01`
- **Unparseable**: Stored as string in `date_string` property

### Tags

Zotero tags are mapped to Anytype tags:

**Zotero Format**:

```json
{
  "tags": [{ "tag": "machine learning" }, { "tag": "neural networks" }]
}
```

**Anytype Format**:
Tags are added to the Anytype object's tag collection.

### Notes

Zotero notes (child items) are synced as separate Anytype objects:

- **Note title**: Derived from first line of content or "Note for [Parent Item]"
- **Note content**: HTML is converted to Anytype's block format
- **Parent link**: Reference to parent item is maintained via `parent_zotero_key` property

### Attachments

File attachments (PDFs, EPUBs, etc.) are handled based on configuration:

- **Link only**: Just the file path/URL is stored as a property
- **Full upload**: File contents are uploaded to Anytype (requires Anytype file API support)

**Current Implementation**: File metadata (filename, path, content type) is stored as text properties. Full file upload may be added in future updates.

## Data Flow

### Zotero → Anytype (Export)

1. **Item Selection**: User selects Zotero collection to sync
2. **Data Extraction**: Anytero reads item metadata from Zotero API
3. **Property Transformation**: Fields are mapped according to the tables above
4. **Object Creation**: Anytype API creates page objects with properties
5. **Tracking**: Anytero stores mapping (Zotero key ↔ Anytype object ID)

### Anytype → Zotero (Future: Import)

**Note**: Bidirectional sync is planned for future releases. Current version is **Zotero → Anytype only**.

When implemented, import will:

1. Detect changes in Anytype objects
2. Map Anytype properties back to Zotero fields
3. Update Zotero items via Zotero API
4. Handle conflicts (last-write-wins or manual resolution)

## Property Customization

### Adding Custom Properties

You can add custom Zotero fields to the sync by editing `property-builder.ts`:

```typescript
// Add custom field mapping
properties.set('custom_field', {
  type: 'text',
  value: itemData.getField('customField'),
});
```

### Property Name Conflicts

If a Zotero field name conflicts with an Anytype reserved name:

- Prefix is added: `zotero_[fieldname]`
- Example: `date` (reserved) → `zotero_date`

## Limitations

### Current Limitations

1. **One-way Sync**: Only Zotero → Anytype (no import from Anytype yet)
2. **Object Types**: All items become generic "page" objects
3. **Attachments**: Metadata only, not full file upload
4. **Relations**: Complex relations between items not fully supported
5. **Rich Text**: Limited formatting in notes (HTML → Anytype blocks)

### Future Enhancements

Planned improvements:

- Bidirectional sync (Anytype → Zotero)
- Custom object types (Article, Book, etc.)
- Full file attachment support
- Rich relation mapping (cited by, related items)
- Better handling of complex metadata

## Best Practices

### Maintaining Data Integrity

1. **Use consistent naming**: Stick to standard Zotero fields when possible
2. **Avoid manual edits**: Don't manually edit synced objects in Anytype (changes will be overwritten)
3. **Regular backups**: Export your Anytype space regularly
4. **Test first**: Try syncing a small collection before syncing your entire library

### Optimizing Sync Performance

1. **Sync incrementally**: Sync new items rather than re-syncing everything
2. **Use selective sync**: Only sync collections you need in Anytype
3. **Clean up duplicates**: Remove duplicate items from Zotero before syncing

## Examples

### Example 1: Journal Article

**Zotero Input**:

```json
{
  "key": "ABC123",
  "itemType": "journalArticle",
  "title": "Deep Learning for Natural Language Processing",
  "creators": [
    { "firstName": "John", "lastName": "Doe", "creatorType": "author" }
  ],
  "abstractNote": "This paper surveys recent advances...",
  "publicationTitle": "Journal of AI Research",
  "volume": "15",
  "issue": "3",
  "pages": "245-267",
  "date": "2024-03-15",
  "DOI": "10.1234/jair.2024.123",
  "url": "https://example.com/paper",
  "tags": [{ "tag": "NLP" }, { "tag": "deep learning" }]
}
```

**Anytype Output** (page object):

```json
{
  "type_key": "page",
  "name": "Deep Learning for Natural Language Processing",
  "properties": {
    "description": "This paper surveys recent advances...",
    "authors": "Doe, John",
    "date": "2024-03-15",
    "publication": "Journal of AI Research",
    "volume": "15",
    "issue": "3",
    "pages": "245-267",
    "doi": "10.1234/jair.2024.123",
    "url": "https://example.com/paper",
    "type": "journalArticle",
    "zotero_key": "ABC123",
    "zotero_item_type": "journalArticle"
  },
  "tags": ["NLP", "deep learning"]
}
```

### Example 2: Book with Multiple Authors

**Zotero Input**:

```json
{
  "key": "XYZ789",
  "itemType": "book",
  "title": "Introduction to Machine Learning",
  "creators": [
    { "firstName": "Alice", "lastName": "Smith", "creatorType": "author" },
    { "firstName": "Bob", "lastName": "Johnson", "creatorType": "author" }
  ],
  "publisher": "Tech Press",
  "place": "Cambridge, MA",
  "date": "2023",
  "ISBN": "978-1-234567-89-0",
  "edition": "3rd"
}
```

**Anytype Output**:

```json
{
  "type_key": "page",
  "name": "Introduction to Machine Learning",
  "properties": {
    "authors": "Smith, Alice; Johnson, Bob",
    "publisher": "Tech Press",
    "place": "Cambridge, MA",
    "date": "2023-01-01",
    "isbn": "978-1-234567-89-0",
    "edition": "3rd",
    "type": "book",
    "zotero_key": "XYZ789",
    "zotero_item_type": "book"
  }
}
```

## Troubleshooting Data Issues

### Missing Fields

If some fields don't appear in Anytype:

1. Check if the field is populated in Zotero
2. Verify the field name matches a supported mapping
3. Check if the field is a custom Zotero field (may need manual mapping)

### Incorrect Formatting

If data appears incorrectly formatted:

1. Check original Zotero data for formatting issues
2. Consider the transformation rules above
3. Report persistent issues on GitHub

### Data Loss

If data seems lost after sync:

1. Verify the sync completed successfully (check progress window)
2. Search for the item by title in Anytype
3. Check Zotero logs for error messages
4. Re-sync the item if necessary

For more help, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).
