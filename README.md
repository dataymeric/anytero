# Anytero

[![Latest release](https://img.shields.io/github/v/release/dvanoni/anytero)](https://github.com/dvanoni/anytero/releases/latest)
[![Total downloads](https://img.shields.io/github/downloads/dvanoni/anytero/latest/total?sort=semver)][download]
[![Works with Zotero](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdvanoni%2Fanytero%2Fmain%2Fpackage.json&query=%24.xpi.zoteroMinVersion&prefix=v&suffix=%2B&logo=zotero&label=Works%20with%20Zotero&color=%23CC2936)](https://www.zotero.org/)
[![Buy me a coffee](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapp.buymeacoffee.com%2Fapi%2Fcreators%2Fslug%2Fdvanoni&query=%24.data.public_supporters_count&prefix=%F0%9F%92%9C%20&style=social&logo=buymeacoffee&label=Buy%20me%20a%20coffee)](https://www.buymeacoffee.com/dvanoni)

Anytero is a [Zotero plugin](https://www.zotero.org/support/plugins) for syncing
items and notes into [Anytype](https://anytype.io/). To use it:

1. 💾 [Install][] the Anytero plugin into Zotero.
2. 📔 [Connect][] and configure your Anytype workspace.
3. 📁 Choose your Zotero collections to monitor.
4. 📝 Add or update items in your collections.
5. 🔄 Watch your items sync into Anytype!

[Install]: #install-and-configure-anytero-plugin
[Connect]: #connect-to-anytype

![Anytero in action](docs/notero.gif)

Concept by [@arhoff](https://github.com/arhoff) 👩🏻‍🔬 |
Built with 💜 by [@dvanoni](https://github.com/dvanoni)

## Table of Contents

- [Why Use Anytero?](#why-use-anytero)
- [How Anytero Works](#how-anytero-works)
- [Installation and Setup](#installation-and-setup)
- [Usage Guides](#usage-guides)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Development](#development)

## Why Use Anytero?

- Integrate your reference manager, task list, reading notes, analytical tables,
  and drafts in one location.
- Easily link to references when writing in Anytype.
- Create custom views to filter and sort large reference lists by project,
  tag, author, etc.
- Backlinks make it easy to locate any of the notes and drafts that mention
  a reference.
- Link references to entries in other object types, such as projects, tasks,
  manuscripts in your publication pipeline, publishing outlets, etc.

## How Anytero Works

The Anytero plugin watches for Zotero items being added to or modified within
any collections that you specify in the Anytero preferences. Whenever an item
is added or modified, Anytero does a few things:

- Save an object with the Zotero item's properties (title, authors, etc.) into the
  Anytype space specified in Anytero preferences.
- Add an `anytype` tag to the Zotero item.
- Add an attachment to the Zotero item that links to the object in Anytype.

In addition to providing a convenient way to open an Anytype object from Zotero,
the link attachment also serves as a reference for Anytero so that it can update
the corresponding Anytype object for a given Zotero item.

### Syncing Items

By default, Anytero will sync items in your monitored collections whenever they
are modified. You can disable this functionality by unchecking the **Sync when
items are modified** option in the Anytero preferences.

You can also sync items from the collection or item context menus (right-click):

- To sync all items in a collection, open the context menu for the collection
  and select **Sync Items to Anytype**.
- To sync one item or multiple items, select the item(s) in the main pane, open
  the context menu, and select **Sync to Anytype**.

> [!NOTE]
> To prevent the "sync on modify" functionality from saving to Anytype multiple
> times, Anytero does not notify Zotero when the tag and link attachment are
> added to an item. This means they may not appear in Zotero immediately, and
> you may need to navigate to a different item and back to make them appear.

### Syncing Notes and PDF Annotations

Zotero notes associated with an item can be synced into Anytype as content of the
corresponding object for that item. As with regular items, you can manually sync
notes using the **Sync to Anytype** option in the context menu.

Automatic syncing of notes can be enabled via the **Sync notes** option in the
Anytero preferences. When enabled, notes will automatically sync whenever they
are modified. Additionally, when a regular item is synced, all of its notes will
also sync if they have not already.

To sync annotations (notes and highlights) from a PDF, you'll first need to
extract them into a Zotero note:

1. Select an item or PDF, open the context menu, and select
   **Add Note from Annotations**.
2. If desired, enable highlight colors from the menu at the top-right of the
   note panel.

<details>
  <summary>Example of creating a note from PDF annotations</summary>
  <video src="https://github.com/dvanoni/notero/assets/299357/4cda5dc7-ba5b-4f5a-8f53-d6bc2c44b1dc" />
</details>

## Installation and Setup

Using Anytero involves installing the plugin in Zotero and connecting it to your
Anytype workspace. Detailed setup instructions are below.

### Install and Configure Anytero Plugin

> [!IMPORTANT]
>
> - The latest release of Anytero requires Zotero 7.0 or above.
> - Anytero requires Anytype Desktop application to be installed and running.
> - See the [changelog](CHANGELOG.md) for all release notes.

1. [Download][] the latest release of the `.xpi` file.
   - Alternatively, download the `.xpi` file from the **Assets** section of the
     [latest release][] page.
   - Firefox users: Right-click the download link and choose **Save Link As...**
     to download the file.
2. Open the Zotero Plugins Manager via the **Tools → Plugins** menu item.
3. Install the `.xpi` file by either:
   - dragging and dropping it into the Plugins Manager window _or_
   - selecting it using the **Install Plugin From File...** option in the
     gear menu in the top-right corner of the window
4. Open the Anytero preferences from either the **Tools → Anytero Preferences...**
   menu item or the sidebar in the main Zotero preferences window.
5. Configure the Anytero preferences as desired.

[download]: https://download.anytero.vanoni.dev
[latest release]: https://github.com/dvanoni/anytero/releases/latest

### Connect to Anytype

> [!NOTE]
>
> Anytero connects to Anytype through its local API, which requires the Anytype
> Desktop application to be installed and running on your computer.
> Download Anytype from [anytype.io](https://anytype.io/) if you haven't already.

1. Make sure Anytype Desktop is running on your computer.
2. In the Anytero preferences, click the **Connect to Anytype** button.
   This will initiate a challenge-response authentication flow.
3. A 4-digit code will be displayed in the Anytero preferences.
4. Open Anytype Desktop and enter the 4-digit code when prompted.
5. Once authenticated, you can select your desired Anytype space from the
   dropdown menu in Anytero preferences.
6. Select the object type you want to use for synced items (e.g., "Book", "Article",
   or create a custom type in Anytype).
7. Click **Save** to complete the connection.

### Configure Anytype Object Properties

Anytero can sync data for the properties listed below. The properties are
automatically mapped to your selected object type in Anytype.

The following Zotero fields are synced to Anytype object properties:

| Zotero Field        | Anytype Property | Notes                                                                          |
| ------------------- | ---------------- | ------------------------------------------------------------------------------ |
| Title               | name             | Primary object name                                                            |
| Abstract            | abstract         | Text property                                                                  |
| Authors             | authors          | Text property with formatted author names                                      |
| Citation Key        | citationKey      | Requires [Better BibTeX](https://retorque.re/zotero-better-bibtex/)            |
| Collections         | collections      | Multi-select tags                                                              |
| Date                | date             | Text property                                                                  |
| Date Added          | dateAdded        | Date property                                                                  |
| Date Modified       | dateModified     | Date property                                                                  |
| DOI                 | doi              | URL property                                                                   |
| Editors             | editors          | Text property                                                                  |
| Extra               | extra            | Text property                                                                  |
| File Path           | filePath         | Text property                                                                  |
| Full Citation       | fullCitation     | Text property (format based on Zotero quick copy settings)                    |
| In-Text Citation    | inTextCitation   | Text property (format based on Zotero quick copy settings)                    |
| Item Type           | itemType         | Select property                                                                |
| Place               | place            | Text property                                                                  |
| Proceedings Title   | proceedingsTitle | Text property                                                                  |
| Publication         | publication      | Text property                                                                  |
| Series Title        | seriesTitle      | Text property                                                                  |
| Short Title         | shortTitle       | Text property                                                                  |
| Tags                | tags             | Multi-select tags                                                              |
| URL                 | url              | URL property                                                                   |
| Year                | year             | Number property                                                                |
| Zotero URI          | zoteroUri        | URL property (opens items in web library if signed in to Zotero)              |

## Usage Guides

For more visual guides of setting up and using Anytero, see the following
resources made by wonderful members of the community.

> [!NOTE]
> Some aspects of these resources may be outdated, so be sure to refer to this
> README for the latest information.

- More community guides coming soon!

_If you'd like to share how you use Anytero and want to be listed here, please
feel free to submit a PR or [contact me](https://github.com/dvanoni)!_

## Frequently Asked Questions

### How to sync from Anytype back into Zotero

Bidirectional sync between Anytype and Zotero, while desirable, falls outside the
scope of this plugin. Implementing this functionality would require developing
complex synchronization logic to detect and propagate changes in both directions.
While technically feasible as a future enhancement, this capability is not part
of Anytero's current functionality.

### How to sync attached files into Anytype

Currently, Anytero syncs metadata and notes but not file attachments. This is due
to limitations in how both Zotero and Anytype handle file storage:

- The Anytype API focuses on object properties and content blocks rather than
  large file attachments.
- Local file paths may not be accessible from different devices.

For now, the best workarounds are:

- Use the `File Path` property to point you to the location of the local file.
- If you sync your files into your Zotero account, you can open the Zotero web
  interface from the `Zotero URI` property and then open the file from there.

### How to bulk sync existing items

To sync multiple items that are already in a monitored collection, you can do so
from the collection or item context menus.
See the [Syncing Items](#syncing-items) section above.

### How to fix Anytype API errors

#### Could not connect to Anytype

If you receive connection errors when trying to sync:

> Error: Could not connect to Anytype API

This most likely means the Anytype Desktop application is not running. Make sure:

- Anytype Desktop is installed and running on your computer
- The Anytype local API is accessible at `http://localhost:31009`
- No firewall or security software is blocking local connections

#### Authentication failed

If you receive authentication errors:

> Error: Authentication failed or API key is invalid

You may need to re-authenticate:

1. Open Anytero preferences in Zotero
2. Click **Disconnect from Anytype**
3. Click **Connect to Anytype** and complete the authentication flow again

#### Space not found

If you receive errors about the space not being found:

> Error: Could not find space with ID: _xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx_

This can happen if you've deleted or recreated a space in Anytype. To resolve:

1. Open Anytero preferences
2. Select the correct space from the dropdown menu
3. Click **Save** and try syncing again

## Development

Anytero was scaffolded with [generator-zotero-plugin][] and uses build scripts
heavily inspired by [zotero-plugin][].
Many thanks to [@retorquere](https://github.com/retorquere) for creating these.

Anytero is a fork of [Notero][] adapted to work with Anytype instead of Notion.
Many thanks to [@dvanoni](https://github.com/dvanoni) for the original Notero plugin.

[Notero]: https://github.com/dvanoni/notero

### Local Setup

The steps below are based on the [Zotero Plugin Development][plugin-development]
documentation and should allow you to build and run Anytero yourself.

1.  To avoid any potential damage to your default Zotero profile, you can
    [create a new profile][zotero-profiles] for development purposes.

2.  Create a file named `zotero.config.json` that will contain the config
    options used to start Zotero.
    See [`zotero.config.example.json`](zotero.config.example.json) for an
    example file that has descriptions of all available config options.

3.  Install dependencies:

        npm ci

4.  Build Anytero and start Zotero with the plugin installed:

        npm start

    Alternatively, you can start your desired beta or dev version of Zotero:

        npm run start:beta
        npm run start:dev

    The `start` script performs a number of steps:
    1.  Run `scripts/build.mts` to build the plugin into the `build` directory
        and watch for changes, rebuilding when necessary.
    2.  Use [web-ext][] to start Zotero with the profile specified in
        `zotero.config.json` and install the plugin as temporary, reloading when
        the plugin is rebuilt.
    3.  Write Zotero debug output to the `logFile` if specified in
        `zotero.config.json`.

[generator-zotero-plugin]: https://github.com/retorquere/generator-zotero-plugin
[zotero-plugin]: https://github.com/retorquere/zotero-plugin
[plugin-development]: https://www.zotero.org/support/dev/client_coding/plugin_development
[zotero-profiles]: https://www.zotero.org/support/kb/multiple_profiles
[web-ext]: https://github.com/mozilla/web-ext

### Releasing a New Version

Releases are performed via GitHub Actions. The
[`release`](.github/workflows/release.yml) workflow defines the following jobs:

#### `release-please`

This job uses the [release-please][] action to create release PRs when new
user-facing commits are pushed to the `main` branch. A release PR will bump the
package version and update the changelog. When the PR is merged, this job then
creates a new version tag and GitHub release.

#### `publish-artifacts`

This job runs when a new release is created by the `release-please` job. It
builds the `.xpi` file and publishes it to the release. It also generates an
updated manifest file and publishes it to the [`release`][release-tag] release.

[release-please]: https://github.com/googleapis/release-please-action
[release-tag]: https://github.com/dvanoni/anytero/releases/tag/release
