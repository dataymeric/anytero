/**
 * Anytype Sync Note Item
 * 
 * Handles syncing of Zotero notes to Anytype
 */

import type { AnytypeClient } from './anytype-client';
import { getAnytypeObjectID, getSyncedNotes, saveSyncedNote } from './item-data';
import { logger } from '../utils';

/**
 * Sync a Zotero note item to Anytype
 */
export async function syncNoteItem(
  note: Zotero.Item,
  client: AnytypeClient,
  spaceId: string,
): Promise<void> {
  if (!note.isNote()) {
    throw new Error('Item is not a note');
  }

  const parentItem = note.parentItem;
  if (!parentItem) {
    logger.warn('Note has no parent item, skipping sync');
    return;
  }

  const parentObjectId = getAnytypeObjectID(parentItem);
  if (!parentObjectId) {
    logger.warn('Parent item not synced to Anytype, skipping note sync');
    return;
  }

  logger.debug('Syncing note to Anytype object', parentObjectId);

  const noteContent = note.getNote();
  const noteKey = note.key;

  const syncedNotes = getSyncedNotes(parentItem);
  const existingNoteBlock = syncedNotes.notes?.[noteKey];

  try {
    if (existingNoteBlock) {
      // Update existing note block
      await updateNoteInObject(
        client,
        spaceId,
        parentObjectId,
        existingNoteBlock.blockID,
        noteContent,
      );
    } else {
      // Create new note block
      const blockId = await addNoteToObject(
        client,
        spaceId,
        parentObjectId,
        noteContent,
      );
      
      await saveSyncedNote(
        parentItem,
        syncedNotes.containerBlockID || parentObjectId,
        blockId,
        noteKey,
      );
    }
  } catch (error) {
    logger.error('Failed to sync note:', error);
    throw error;
  }
}

/**
 * Add a note to an Anytype object
 */
async function addNoteToObject(
  client: AnytypeClient,
  spaceId: string,
  objectId: string,
  noteContent: string,
): Promise<string> {
  logger.debug('Adding note to object', objectId);

  // Get the current object
  const object = await client.getObject(spaceId, objectId);

  // Convert HTML note content to markdown
  const markdownContent = convertHtmlToMarkdown(noteContent);

  // Append note content to the object's body
  const updatedBody = object.body
    ? `${object.body}\n\n---\n\n${markdownContent}`
    : markdownContent;

  // Update the object with the new content
  await client.updateObject(spaceId, objectId, {
    body: updatedBody,
  });

  // Return a block ID (in this case, we use a timestamp-based ID)
  return `note_${Date.now()}`;
}

/**
 * Update an existing note in an Anytype object
 */
async function updateNoteInObject(
  client: AnytypeClient,
  spaceId: string,
  objectId: string,
  blockId: string,
  noteContent: string,
): Promise<void> {
  logger.debug('Updating note block', blockId, 'in object', objectId);

  // Get the current object
  const object = await client.getObject(spaceId, objectId);

  // Convert HTML note content to markdown
  const markdownContent = convertHtmlToMarkdown(noteContent);

  // For now, we'll append updated notes (full note management would require
  // more sophisticated block tracking)
  const updatedBody = object.body
    ? `${object.body}\n\n---\n\n**Updated Note:**\n${markdownContent}`
    : markdownContent;

  await client.updateObject(spaceId, objectId, {
    body: updatedBody,
  });
}

/**
 * Convert HTML to Markdown (basic implementation)
 * TODO: Implement more sophisticated HTML to Markdown conversion
 */
function convertHtmlToMarkdown(html: string): string {
  // Strip HTML tags for now (basic implementation)
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(html, 'text/html');
  
  // Extract text content
  let markdown = doc.body.textContent || '';

  // Basic formatting conversions
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
    .trim();

  return markdown;
}
