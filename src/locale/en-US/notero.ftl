## Menus

notero-collection-menu-sync =
    .label = Sync Items to Notion
notero-item-menu-sync =
    .label = Sync to Notion
notero-tools-menu-preferences =
    .label = Notero Preferences…

## Notion preferences

notero-preferences-notion-groupbox-heading = Notion Connection
notero-preferences-notion-connect-button = Connect to Notion
notero-preferences-notion-disconnect-button = Disconnect…
notero-preferences-notion-disconnect-dialog-title = Disconnect Notion Workspace
notero-preferences-notion-disconnect-dialog-text = Disconnecting your Notion workspace will prevent further syncing. It will not remove any content that has already been synced.
notero-preferences-notion-upgrade-button = Upgrade Connection…
notero-preferences-notion-upgrade-dialog-title = Upgrade Notion Connection
notero-preferences-notion-upgrade-dialog-text = Notero has evolved into a Notion public integration, enabling enhanced features and security. To upgrade, click OK and you'll be redirected to Notion to authorize the new Notero integration. After completing this one-time process, you can safely delete your previous internal integration. See the Notero README for more details.
notero-preferences-notion-token-label = Connection Token:
notero-preferences-notion-token-input =
    .placeholder = Paste your connection token here
notero-preferences-notion-workspace = Workspace: { $workspace-name }
notero-preferences-notion-database = Database:

## Anytype preferences

notero-preferences-anytype-groupbox-heading = Anytype Connection
notero-preferences-anytype-connect-button = Connect to Anytype
notero-preferences-anytype-disconnect-button = Disconnect…
notero-preferences-anytype-disconnect-dialog-title = Disconnect Anytype
notero-preferences-anytype-disconnect-dialog-text = Disconnecting from Anytype will prevent further syncing. It will not remove any content that has already been synced.
notero-preferences-anytype-auth-instructions = Enter the 4-digit code shown in your Anytype desktop app:
notero-preferences-anytype-code-label = Authentication Code:
notero-preferences-anytype-code-input =
    .placeholder = Enter 4-digit code
notero-preferences-anytype-connected = Connected to Anytype
notero-preferences-anytype-space = Space:
notero-preferences-anytype-type = Object Type:

## Property preferences

notero-preferences-properties-groupbox-heading = Property Preferences
notero-preferences-properties-groupbox-description = Customize how item properties sync to Notion.
notero-preferences-page-title-format = Notion Page Title:

## Page title format options

notero-page-title-format-item-author-date-citation =
    .label = Item Author-Date Citation
notero-page-title-format-item-citation-key =
    .label = Item Citation Key (requires Better BibTeX)
notero-page-title-format-item-full-citation =
    .label = Item Full Citation
notero-page-title-format-item-in-text-citation =
    .label = Item In-Text Citation
notero-page-title-format-item-short-title =
    .label = Item Short Title
notero-page-title-format-item-title =
    .label = Item Title

## Sync preferences

notero-preferences-sync-groupbox-heading = Sync Preferences
notero-preferences-sync-groupbox-description1 = Notero will monitor the collections enabled below. Items in the enabled collections will sync to Notion when added to that collection and whenever the items are modified.
notero-preferences-sync-groupbox-description2 = To enable/disable a collection, either select the row and press the {"[Enter]"} key or double-click the row. To select multiple rows, hold {"[Shift]"} and then click.
notero-preferences-collection-column = Collection
notero-preferences-sync-enabled-column = Sync Enabled
notero-preferences-sync-on-modify-items =
    .label = Sync when items are modified
notero-preferences-sync-notes =
    .label = Sync notes

## Progress window

notero-progress-headline = Syncing items to Notion…
notero-progress-item = Item { $step } of { $total }

## Errors

notero-error-missing-notion-database = Notion database not selected. Please select your database in Notero preferences.
notero-error-missing-notion-token = Not authorized with Notion. Please connect to Notion in Notero preferences.
notero-error-missing-anytype-api-key = Not authorized with Anytype. Please connect to Anytype in Notero preferences.
notero-error-anytype-auth-start-failed = Failed to start Anytype authentication. Please ensure Anytype desktop app is running.
notero-error-anytype-no-auth-session = No active Anytype authentication session. Please try connecting again.
notero-error-anytype-auth-complete-failed = Failed to complete Anytype authentication. Please check your code and try again.
notero-error-anytype-create-failed = Failed to create Anytype object. Please check your connection and try again.
notero-error-anytype-update-failed = Failed to update Anytype object. Please check your connection and try again.
notero-error-missing-pref = Missing value for { $pref }. Please enter it in Notero preferences.
notero-error-no-notion-databases = No Notion databases are accessible.
notero-error-note-conversion-failed = Failed to convert note content to Notion blocks.
notero-error-note-parent-not-synced = Cannot sync note because its parent item is not synced.
notero-error-note-sync-failed = Failed to sync note to Notion.
notero-error-note-without-parent = Cannot sync note without a parent item.
notero-error-notion-link-attachment = Failed to create Notion link attachment. This will result in duplicate Notion pages. Please ensure that the "read content" capability is enabled for the Notero integration at www.notion.so/my-integrations.
