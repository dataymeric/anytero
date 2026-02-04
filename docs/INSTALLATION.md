# Installation Guide for Anytero

## Prerequisites

Before installing Anytero, make sure you have:

1. **Zotero 7.0 or later** installed on your computer
   - Download from [zotero.org](https://www.zotero.org/download/)
2. **Anytype Desktop application** installed and running
   - Download from [anytype.io](https://anytype.io/)
   - The desktop app must be running for Anytero to work
   - Anytype's REST API runs locally on port 31009

## Installation Steps

### Step 1: Install Anytero Extension

1. Download the latest `anytero.xpi` file from the [releases page](https://github.com/dataymeric/anytero/releases)
2. In Zotero, go to **Tools → Add-ons**
3. Click the gear icon ⚙️ in the top-right corner
4. Select **Install Add-on From File...**
5. Browse to and select the downloaded `anytero.xpi` file
6. Click **Install Now** when prompted
7. Restart Zotero if required

### Step 2: Authenticate with Anytype

1. Open Zotero preferences: **Edit → Preferences** (or **Zotero → Preferences** on macOS)
2. Click the **Anytero** tab
3. In the **Anytype Connection** section, click **Authenticate with Anytype**
4. A dialog will appear with a 4-digit authentication code
5. The Anytype Desktop app will show a notification asking you to approve the connection
6. Enter the 4-digit code in Anytype Desktop to complete authentication
7. Anytero will automatically save your API key securely

### Step 3: Select Your Anytype Space

1. In the Anytero preferences, click **Refresh Spaces** to load your available spaces
2. Select the space where you want to sync your Zotero items
3. Click **Save** to confirm your selection

### Step 4: Configure Collection Sync

1. In the **Collection Sync Configuration** section, you'll see all your Zotero collections
2. For each collection you want to sync:
   - Check the **Sync** checkbox
   - Choose the sync direction (Zotero → Anytype, bidirectional, etc.)
3. Click **Save** to apply your configuration

## Verifying Installation

To verify Anytero is working correctly:

1. **Check Anytype Connection Status**: In Anytero preferences, you should see "Connected" with a green indicator
2. **Test Manual Sync**: Right-click a collection in Zotero, select **Sync to Anytype**
3. **Check Anytype Desktop**: Open your selected space in Anytype Desktop and verify the items appear

## Automatic Sync

Once configured, Anytero will automatically sync items to Anytype when:

- You add new items to a synced collection
- You modify items in a synced collection
- You add attachments or notes to synced items

## Troubleshooting

If you encounter issues during installation, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).

## Updating Anytero

To update to a new version:

1. Download the latest `anytero.xpi` file
2. In Zotero, go to **Tools → Add-ons**
3. Click the gear icon and select **Install Add-on From File...**
4. Select the new `.xpi` file
5. Zotero will replace the old version with the new one
6. Restart Zotero

Your authentication and sync configuration will be preserved during updates.

## Uninstalling Anytero

To remove Anytero:

1. In Zotero, go to **Tools → Add-ons**
2. Find **Anytero** in the list
3. Click the three dots menu (⋯) next to Anytero
4. Select **Remove**
5. Restart Zotero

**Note**: Uninstalling Anytero will:

- Remove the extension from Zotero
- Clear your stored API key
- Preserve your synced items in Anytype (they will not be deleted)

## Next Steps

- Learn about [configuring sync options](./SYNC-CONFIGURATION.md)
- Understand [how data is mapped](./DATA-MAPPING.md) between Zotero and Anytype
- Review [common issues](./TROUBLESHOOTING.md) and solutions
