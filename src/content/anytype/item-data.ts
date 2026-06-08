/**
 * Anytype Item Data
 *
 * Manages Zotero item data related to Anytype syncing
 */

import { isObject } from '../utils';

const ANYTYPE_TAG_NAME = 'anytype';
const SYNCED_NOTES_ID = 'anytero-synced-notes';

export type SyncedNotes = {
  containerBlockID?: string;
  notes?: {
    [noteItemKey: Zotero.DataObjectKey]: {
      blockID: string;
      syncedAt?: Date;
    };
  };
};

/**
 * Check if a URL is an Anytype URL
 */
function isAnytypeURL(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // Anytype URLs could be in format: anytype://objectId or https://app.any.coop/objectId
  return value.startsWith('anytype://') || value.includes('app.any.coop');
}

/**
 * Extract object ID from Anytype URL
 */
function getObjectIDFromURL(url: string): string | undefined {
  // Handle anytype:// protocol
  if (url.startsWith('anytype://')) {
    // Remove protocol and extract just the object ID (before ? or /)
    const withoutProtocol = url.replace('anytype://', '');
    const objectId = withoutProtocol.split(/[/?]/)[0];
    // Return undefined if objectId is literally the string "undefined"
    return objectId === 'undefined' ? undefined : objectId;
  }

  // Handle web URLs
  const match = url.match(/app\.any\.coop\/([^/?#]+)/);
  return match ? match[1] : undefined;
}

/**
 * Get all Anytype link attachments for an item
 */
function getAllAnytypeLinkAttachments(item: Zotero.Item): Zotero.Item[] {
  const attachmentIDs = item
    .getAttachments(false)
    .slice()
    // Sort to get largest ID first
    .sort((a, b) => b - a);

  return Zotero.Items.get(attachmentIDs).filter((attachment) =>
    isAnytypeURL(attachment.getField('url')),
  );
}

/**
 * Get the primary Anytype link attachment for an item
 */
export function getAnytypeLinkAttachment(
  item: Zotero.Item,
): Zotero.Item | undefined {
  return getAllAnytypeLinkAttachments(item)[0];
}

/**
 * Get the Anytype object ID for an item
 */
export function getAnytypeObjectID(item: Zotero.Item): string | undefined {
  const anytypeURL = getAnytypeLinkAttachment(item)?.getField('url');
  return anytypeURL && getObjectIDFromURL(anytypeURL);
}

/**
 * Save or update Anytype link attachment for an item
 */
export async function saveAnytypeLinkAttachment(
  item: Zotero.Item,
  objectId: string,
  spaceId: string,
): Promise<void> {
  const attachments = getAllAnytypeLinkAttachments(item);

  // Remove duplicate attachments
  if (attachments.length > 1) {
    const attachmentIDs = attachments.slice(1).map(({ id }) => id);
    await Zotero.Items.erase(attachmentIDs);
  }

  // Create Anytype URL
  const anytypeURL = `anytype://${objectId}?spaceId=${spaceId}`;

  let attachment = attachments[0];
  let objectIDChanged = false;

  if (attachment) {
    const currentURL = attachment.getField('url');
    objectIDChanged =
      !currentURL || getObjectIDFromURL(currentURL) !== objectId;
    attachment.setField('url', anytypeURL);
  } else {
    attachment = await Zotero.Attachments.linkFromURL({
      parentItemID: item.id,
      title: 'Anytype',
      url: anytypeURL,
      saveOptions: {
        skipNotifier: true,
      },
    });
  }

  const syncedNotes = objectIDChanged ? {} : undefined;
  updateAnytypeLinkAttachmentNote(attachment, syncedNotes);

  await attachment.saveTx();
}

/**
 * Get synced notes JSON from attachment
 */
function getSyncedNotesJSON(attachment: Zotero.Item): string | undefined {
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(attachment.getNote(), 'text/html');

  return doc.getElementById(SYNCED_NOTES_ID)?.innerHTML;
}

/**
 * Get synced notes for an item
 */
export function getSyncedNotes(item: Zotero.Item): SyncedNotes {
  const attachment = getAnytypeLinkAttachment(item);
  if (!attachment) return {};

  return getSyncedNotesFromAttachment(attachment);
}

/**
 * Get synced notes from attachment
 */
export function getSyncedNotesFromAttachment(
  attachment: Zotero.Item,
): SyncedNotes {
  const syncedNotesJSON = getSyncedNotesJSON(attachment);
  if (!syncedNotesJSON) return {};

  const parsedValue = JSON.parse(syncedNotesJSON);

  if (!isObject(parsedValue)) return {};

  let containerBlockID;
  const notes: Required<SyncedNotes>['notes'] = {};

  if (typeof parsedValue.containerBlockID === 'string') {
    containerBlockID = parsedValue.containerBlockID;
  }

  if (isObject(parsedValue.notes)) {
    Object.entries(parsedValue.notes).forEach(([key, value]) => {
      if (!isObject(value)) return;

      const { blockID, syncedAt } = value;
      if (typeof blockID !== 'string') return;

      notes[key] = {
        blockID,
        syncedAt: typeof syncedAt === 'string' ? new Date(syncedAt) : undefined,
      };
    });
  }

  return { containerBlockID, notes };
}

/**
 * Save synced note information
 */
export async function saveSyncedNote(
  item: Zotero.Item,
  containerBlockID: string,
  noteBlockID: string | undefined,
  noteItemKey: Zotero.DataObjectKey,
) {
  const attachment = getAnytypeLinkAttachment(item);
  if (!attachment) return;

  const { notes } = getSyncedNotesFromAttachment(attachment);

  const syncedNotes = {
    containerBlockID,
    notes: {
      ...notes,
      ...(noteBlockID && {
        [noteItemKey]: {
          blockID: noteBlockID,
          syncedAt: new Date(),
        },
      }),
    },
  };

  updateAnytypeLinkAttachmentNote(attachment, syncedNotes);

  await attachment.saveTx();
}

/**
 * Update the note content of an Anytype link attachment
 */
function updateAnytypeLinkAttachmentNote(
  attachment: Zotero.Item,
  syncedNotes?: SyncedNotes,
) {
  let note = `
<h2 style="background-color: #ff666680;">Do not modify or delete!</h2>
<p>This link attachment serves as a reference for
<a href="https://github.com/dvanoni/anytero">Anytero</a>
so that it can properly update the Anytype object for this item.</p>
<p>Last synced: ${new Date().toLocaleString()}</p>
`;

  const syncedNotesJSON = syncedNotes
    ? JSON.stringify(syncedNotes)
    : getSyncedNotesJSON(attachment);

  if (syncedNotesJSON) {
    note += `<pre id="${SYNCED_NOTES_ID}">${syncedNotesJSON}</pre>`;
  }

  attachment.setNote(note);
}

/**
 * Add Anytype tag to item
 */
export async function saveAnytypeTag(item: Zotero.Item): Promise<void> {
  item.addTag(ANYTYPE_TAG_NAME);
  await item.saveTx({ skipNotifier: true });
}

/**
 * Check if item has Anytype tag
 */
export function hasAnytypeTag(item: Zotero.Item): boolean {
  return item.getTags().some(({ tag }) => tag === ANYTYPE_TAG_NAME);
}
