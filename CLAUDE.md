# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Anytero is a Zotero 7 plugin (`.xpi` format, bootstrapped extension) that syncs Zotero items and notes into [Anytype](https://anytype.io/) via its local REST API (`http://localhost:31009`). It is a fork of [Notero](https://github.com/dvanoni/notero), which synced to Notion; the Notion integration has been removed and this is now an Anytype-only plugin. (Some internal identifiers — the `extensions.notero.*` pref namespace is now `extensions.anytero.*`; the legacy `notion` item tag is still filtered out for users migrating from Notero.)

The plugin runs inside Zotero's SpiderMonkey JS engine (not Node.js), meaning browser APIs like `fetch` are available but Node built-ins are not. The `window` object must be threaded through calls that need `fetch`.

## Commands

```bash
npm ci                  # Install dependencies
npm run build           # Build plugin to build/
npm run build:watch     # Build and watch for changes
npm start               # Build + launch Zotero with plugin (requires zotero.config.json)
npm run start:beta      # Same but with Zotero beta
npm run start:dev       # Same but with Zotero dev
npm test                # Run tests (vitest, jsdom environment)
npm run test:watch      # Run tests in watch mode
npm run typecheck       # TypeScript type check
npm run lint            # ESLint
npm run lint:fix        # ESLint with auto-fix
npm run prettier        # Check formatting
npm run prettier:fix    # Fix formatting
npm run verify          # Run prettier + lint + typecheck + tests concurrently
```

To run a single test file:

```bash
npx vitest run src/content/anytype/__tests__/anytype-client.spec.ts
```

Before running `start`, create `zotero.config.json` from `zotero.config.example.json`.

The `generate-fluent-types` script is run automatically before lint, typecheck, and test via `pre*` hooks — it generates `src/locale/fluent-types.ts` from `.ftl` locale files.

## Architecture

### Plugin Lifecycle (`src/bootstrap.ts` → `src/content/anytero.ts`)

`bootstrap.ts` is the Zotero extension entry point. It loads `content/anytero.js` and delegates to `Zotero.Anytero` (an instance of the `Anytero` class). The `Anytero` class owns a list of `Service` instances and orchestrates their lifecycle (`startup`, `shutdown`, `addToWindow`, `removeFromWindow`). Access it from anywhere via the `getGlobalAnytero()` util.

### Services (`src/content/services/`)

- **EventManager** — wraps Zotero's notifier system; emits typed events (`notifier-event`, `request-sync-*`) that other services listen to
- **SyncManager** — listens for item changes, debounces sync requests (2s), and runs an Anytype sync when an `anytypeSpaceId` pref is set
- **UIManager** — injects context menu items into Zotero windows
- **AnytypeAuthManager** — manages the challenge-response auth flow with Anytype and creates `AnytypeClient` instances with stored API keys
- **PreferencePaneManager** — registers the plugin preferences UI

### Anytype Integration (`src/content/anytype/`)

The primary sync target. Key files:

- **`anytype-client.ts`** — `AnytypeClient` wraps the Anytype local REST API (`/v1/...`). Uses `window.fetch` (not global). Authentication uses challenge-response: `startAuthChallenge` → user enters 4-digit code in Anytype desktop → `completeAuthChallenge`.
- **`anytype-auth-manager.ts`** — stores API keys in Zotero's login manager (via `storage.ts`); creates authenticated `AnytypeClient` instances
- **`sync-job.ts`** — `performAnytypeSyncJob` is the top-level sync entry point; reads prefs and delegates to `syncRegularItem` / `syncNoteItem`
- **`sync-regular-item.ts`** — creates or updates Anytype objects; on 404 during update, removes the stale attachment and recreates the object
- **`property-builder.ts`** — maps Zotero item fields to `AnytypeProperty[]` (title, authors, year, DOI, etc.)
- **`item-data.ts`** — reads/writes Anytype object ID from Zotero item's link attachment URL; adds the `anytype` tag; also tracks synced-note state (used by `SyncManager`)

The only remaining file under `src/content/sync/` is `progress-window.ts` (the sync progress UI), which the Anytype sync job depends on.

### Preferences (`src/content/prefs/`)

All plugin prefs are stored under `extensions.anytero.*` via the `AnyteroPref` enum and the `getAnyteroPref`/`setAnyteroPref` helpers (in `anytero-pref.ts`). Key prefs: `anytypeSpaceId`, `anytypeTypeKey`, `anytypeApiKey`, `syncNotes`, `syncOnModifyItems`, `pageTitleFormat`.

### Build System (`scripts/`)

- `build.mts` — uses esbuild to bundle `src/` into `build/`; also copies locale files, XUL, and other assets
- `start.mts` — runs build in watch mode, then uses `web-ext` to launch Zotero with the plugin
- `create-xpi.mts` — packages `build/` into a `.xpi` file for distribution
- `generate-fluent-types.mts` — parses `.ftl` files to generate TypeScript types for l10n message IDs

### Type Stubs (`types/`)

Zotero's global APIs (`Zotero`, `Services`, `Components`, `BootstrapData`) are typed via custom `.d.ts` stubs in `types/`. These types are not exhaustive — extend them if you need additional Zotero APIs.

### Testing

Tests use Vitest with jsdom. Zotero globals (`Zotero`, `Services`, etc.) are mocked in `test/setup-tests.ts`. Tests live in `__tests__/` subdirectories next to the code they test.
