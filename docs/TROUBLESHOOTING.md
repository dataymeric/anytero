# Troubleshooting Guide for Anytero

This guide helps you diagnose and resolve common issues with Anytero.

## Quick Diagnostics

Before troubleshooting specific issues, check these basics:

1. ✅ **Anytype Desktop is running**: The app must be open for Anytero to work
2. ✅ **Zotero is up to date**: Anytero requires Zotero 7.0 or later
3. ✅ **You're authenticated**: Check connection status in Anytero preferences
4. ✅ **A space is selected**: You must select an Anytype space for syncing

## Common Issues

### 1. "Cannot connect to Anytype" Error

**Symptoms**:
- Authentication fails
- "Anytype API not available" message
- Connection status shows red/disconnected

**Solutions**:

#### Solution A: Start Anytype Desktop
1. Make sure Anytype Desktop application is running
2. Wait 5-10 seconds for the API to initialize
3. Try authenticating again in Anytero preferences

#### Solution B: Check Anytype API Port
1. Anytype's REST API runs on `localhost:31009` by default
2. Make sure no firewall or security software is blocking this port
3. Try accessing `http://localhost:31009/health` in your web browser
   - You should see a response (even if it's an error about authentication)
   - If you see "connection refused", Anytype API is not running

#### Solution C: Restart Anytype Desktop
1. Quit Anytype Desktop completely
2. Wait 5 seconds
3. Restart Anytype Desktop
4. Wait 10 seconds for API initialization
5. Try connecting from Anytero again

#### Solution D: Check Anytype Desktop Version
1. Make sure you're using the latest version of Anytype Desktop
2. Anytero requires Anytype Desktop with REST API support (v0.25.0+)
3. Update Anytype Desktop if necessary

### 2. Authentication Code Not Working

**Symptoms**:
- 4-digit code appears in Anytero
- No notification in Anytype Desktop
- Or: notification appears but code doesn't work

**Solutions**:

#### Solution A: Re-initiate Authentication
1. In Anytero preferences, click **Clear Authentication**
2. Click **Authenticate with Anytype** again
3. A new 4-digit code will be generated
4. Check Anytype Desktop for the approval notification

#### Solution B: Check Code Expiration
- Authentication codes expire after 5 minutes
- If too much time has passed, click **Cancel** and start over

#### Solution C: Verify Anytype Desktop Notifications
1. Make sure Anytype Desktop notifications are enabled
2. Check your system notification settings
3. Look for the Anytype notification center (bell icon in app)

### 3. Items Not Syncing to Anytype

**Symptoms**:
- Manual sync completes without errors
- But items don't appear in Anytype space

**Solutions**:

#### Solution A: Verify Space Selection
1. In Anytero preferences, check that a space is selected
2. Click **Refresh Spaces** to reload available spaces
3. Select the correct space and save

#### Solution B: Check Collection Sync Configuration
1. Verify the collection is enabled for sync
2. Check the sync direction is set correctly
3. Make sure the collection contains items

#### Solution C: Check Anytype Space
1. Open Anytype Desktop
2. Navigate to the selected space
3. Look for a page/object with the item title
4. Items may take a few seconds to appear after sync

#### Solution D: Check Sync Logs
1. In Zotero, go to **Help → Debug Output Logging → View Output**
2. Look for lines containing "Anytero" or "Anytype"
3. Look for error messages indicating what went wrong

### 4. Sync Taking Too Long

**Symptoms**:
- Sync progress window stays open for a long time
- Items appear to sync very slowly

**Causes & Solutions**:

#### Large Collections
- Syncing 100+ items can take several minutes
- Anytype API has rate limits to prevent overwhelming the system
- **Solution**: Be patient, or sync smaller collections

#### Large Attachments
- Syncing PDFs and files takes longer than metadata
- Attachments are encoded and transferred to Anytype
- **Solution**: Consider syncing attachments separately

#### Network Issues
- Although Anytype API is local, large data transfers can be slow
- **Solution**: Check system resources (CPU, memory, disk)

### 5. Duplicate Items in Anytype

**Symptoms**:
- Same Zotero item appears multiple times in Anytype
- Items are re-created instead of updated

**Solutions**:

#### Solution A: Check Zotero Item Keys
- Anytero tracks synced items using Zotero's item keys
- If item keys change, duplicates may be created
- **Solution**: Delete duplicates in Anytype, re-sync from Zotero

#### Solution B: Clear Sync State
1. In Anytero preferences, click **Advanced**
2. Click **Clear Sync State** (this resets tracking but doesn't delete items)
3. Re-sync collections to rebuild tracking

### 6. Error: "Missing API Key"

**Symptoms**:
- Error message: "Anytype API key not available"
- Happens during sync or when checking connection

**Solutions**:

#### Solution A: Re-authenticate
1. In Anytero preferences, go to **Anytype Connection**
2. Click **Clear Authentication**
3. Click **Authenticate with Anytype** and complete the flow
4. Your API key will be securely stored

#### Solution B: Check Zotero Password Manager
- Anytero stores API keys in Zotero's password manager
- If passwords were cleared, you need to re-authenticate
- **Solution**: Re-authenticate with Anytype

### 7. Extension Not Appearing in Zotero

**Symptoms**:
- No "Anytero" tab in Zotero preferences
- No "Sync to Anytype" option in collection context menu

**Solutions**:

#### Solution A: Verify Installation
1. Go to **Tools → Add-ons** in Zotero
2. Look for "Anytero" in the list
3. Make sure it's enabled (not disabled)

#### Solution B: Reinstall Extension
1. In **Tools → Add-ons**, remove Anytero
2. Restart Zotero
3. Reinstall using the `.xpi` file
4. Restart Zotero again

#### Solution C: Check Zotero Version
- Anytero requires Zotero 7.0 or later
- Check your version: **Help → About Zotero**
- Update Zotero if necessary

### 8. Preferences Window Won't Open

**Symptoms**:
- Clicking Anytero tab crashes or freezes Zotero
- Preferences window appears blank

**Solutions**:

#### Solution A: Check Zotero Error Console
1. Go to **Help → Debug Output Logging**
2. Enable logging
3. Try opening Anytero preferences
4. View the output for error messages

#### Solution B: Reset Anytero Preferences
1. Close Zotero
2. Open your Zotero data directory
3. Go to the `storage` folder
4. Remove any `anytero-*` preference files (backup first!)
5. Restart Zotero

### 9. Items Missing Metadata in Anytype

**Symptoms**:
- Items sync but are missing fields (author, date, etc.)
- Some metadata doesn't transfer

**Solutions**:

#### Solution A: Check Anytype Object Type
- Anytero creates "page" type objects by default
- Some metadata may not map to Anytype's structure
- **Solution**: Check [Data Mapping Guide](./DATA-MAPPING.md) for field mappings

#### Solution B: Re-sync Items
1. In Anytero preferences, select the collection
2. Click **Re-sync All Items**
3. This will update all items with current metadata

### 10. Performance Issues / Zotero Slowing Down

**Symptoms**:
- Zotero becomes slow or unresponsive
- High CPU/memory usage during sync

**Solutions**:

#### Solution A: Reduce Sync Frequency
1. In Anytero preferences, disable automatic sync
2. Sync collections manually when needed

#### Solution B: Sync Smaller Collections
- Instead of syncing your entire library, sync specific collections
- Large collections (1000+ items) can be resource-intensive

#### Solution C: Disable Attachment Syncing
- Syncing PDFs and files uses significant resources
- Consider syncing metadata only

## Getting More Help

If you've tried the solutions above and still have issues:

1. **Check the Logs**:
   - Enable Zotero debug output: **Help → Debug Output Logging**
   - Reproduce the issue
   - Save the output to a file
   - Review for error messages

2. **Report an Issue**:
   - Go to [GitHub Issues](https://github.com/dataymeric/anytero/issues)
   - Search for similar issues
   - If none found, create a new issue with:
     - Description of the problem
     - Steps to reproduce
     - Zotero version
     - Anytype Desktop version
     - Relevant log output

3. **Check Anytype Status**:
   - Some issues may be with Anytype Desktop itself
   - Check [Anytype Community](https://community.anytype.io/)
   - Verify Anytype's REST API is working properly

## Advanced Troubleshooting

### Enable Verbose Logging

For detailed diagnostics:

1. Open Zotero's config editor: **Edit → Preferences → Advanced → Config Editor**
2. Search for `extensions.anytero.debugLevel`
3. Set it to `5` (most verbose)
4. Reproduce the issue
5. Check debug output for detailed information

### Reset Anytero Completely

If all else fails, reset Anytero to factory settings:

1. Close Zotero
2. Remove Anytero extension: **Tools → Add-ons → Anytero → Remove**
3. Delete Anytero preferences from Zotero profile folder
4. Restart Zotero
5. Reinstall Anytero from `.xpi` file
6. Reconfigure authentication and sync

**Warning**: This will delete all Anytero configuration and require re-authentication.
