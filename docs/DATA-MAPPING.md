# Data Mapping

Anytero maps Zotero item fields to an Anytype object's **properties** and
composes the object **body** (markdown) from the item's bibliographic data and
its notes.

## Properties

Each property is only set when the Zotero field has a value.

| Zotero field      | Anytype property key | Type   | Notes                        |
| ----------------- | -------------------- | ------ | ---------------------------- |
| Title             | `title`              | text   | `item.getDisplayTitle()`     |
| Primary creators  | `authors`            | text   | "Last, First" joined by "; " |
| Year              | `year`               | number | Parsed from the item's date  |
| Item type         | `item_type`          | select | Localized item type name     |
| Publication title | `publication`        | text   | Journal / book / venue       |
| DOI               | `doi`                | url    | `https://doi.org/<DOI>`      |
| ISBN              | `isbn`               | text   |                              |
| ISSN              | `issn`               | text   |                              |
| URL               | `url`                | url    |                              |

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
