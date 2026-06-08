/**
 * Anytype Sync Regular Item
 *
 * Handles syncing of regular Zotero items (non-notes) to Anytype
 */

import { LocalizableError } from '../errors';
import { PageTitleFormat } from '../prefs/anytero-pref';
import { logger } from '../utils';

import type {
  AnytypeClient,
  AnytypeObject,
  AnytypeProperty,
} from './anytype-client';
import {
  getAnytypeLinkAttachment,
  getAnytypeObjectID,
  saveAnytypeLinkAttachment,
  saveAnytypeTag,
} from './item-data';
import { buildAnytypeProperties } from './property-builder';

export type SyncRegularItemParams = {
  anytypeClient: AnytypeClient;
  citationFormat: string;
  libraryCollectionId: string;
  pageTitleFormat: PageTitleFormat;
  spaceId: string;
  typeKey: string;
};

/**
 * Sync a regular Zotero item to Anytype
 */
export async function syncRegularItem(
  item: Zotero.Item,
  params: SyncRegularItemParams,
): Promise<void> {
  const anytypeObject = await saveItemToSpace(item, params);

  await saveAnytypeTag(item);
  await saveAnytypeLinkAttachment(item, anytypeObject.id, params.spaceId);
}

/**
 * Save item to Anytype space (create or update)
 */
async function saveItemToSpace(
  item: Zotero.Item,
  params: SyncRegularItemParams,
): Promise<AnytypeObject> {
  const { anytypeClient, spaceId, typeKey, citationFormat, pageTitleFormat } =
    params;

  const objectId = getAnytypeObjectID(item);

  // Build properties and body from Zotero item
  const { name, body, properties } = await buildAnytypeProperties({
    item,
    citationFormat,
    pageTitleFormat,
  });

  if (objectId) {
    return updateObject(
      anytypeClient,
      spaceId,
      typeKey,
      objectId,
      name,
      body,
      properties,
      item,
    );
  }

  return createObject(anytypeClient, spaceId, typeKey, name, body, properties);
}

/**
 * Create a new Anytype object
 */
async function createObject(
  client: AnytypeClient,
  spaceId: string,
  typeKey: string,
  name: string,
  body: string,
  properties: AnytypeProperty[],
): Promise<AnytypeObject> {
  logger.debug('Creating object in space', spaceId, {
    typeKey,
    name,
    body: body.substring(0, 100) + '...',
    properties,
  });

  try {
    return await client.createObject(spaceId, {
      type_key: typeKey,
      name,
      body,
      properties,
      icon: {
        emoji: '📕',
        format: 'emoji',
      },
    });
  } catch (error) {
    logger.error('Failed to create Anytype object:', error);
    logger.error('Type key used:', typeKey);
    throw new LocalizableError(
      'Failed to create Anytype object',
      'anytero-error-anytype-create-failed',
    );
  }
}

/**
 * Update an existing Anytype object
 */
async function updateObject(
  client: AnytypeClient,
  spaceId: string,
  typeKey: string,
  objectId: string,
  name: string,
  body: string,
  properties: AnytypeProperty[],
  item: Zotero.Item,
): Promise<AnytypeObject> {
  logger.debug('Updating object', objectId, 'in space', spaceId, {
    name,
    body: body.substring(0, 100) + '...',
    properties,
  });

  try {
    return await client.updateObject(spaceId, objectId, {
      name,
      body,
      properties,
    });
  } catch (error) {
    logger.error('Failed to update Anytype object:', error);

    // If object not found, remove the invalid attachment and create a new one
    if (isObjectNotFoundError(error)) {
      logger.debug(
        'Object not found or inaccessible, removing invalid attachment and creating new one',
      );

      // Remove the invalid attachment
      const attachment = getAnytypeLinkAttachment(item);
      if (attachment) {
        await Zotero.Items.erase([attachment.id]);
      }

      return createObject(client, spaceId, typeKey, name, body, properties);
    }

    throw new LocalizableError(
      'Failed to update Anytype object',
      'anytero-error-anytype-update-failed',
    );
  }
}

/**
 * Check if error is an object not found error
 */
function isObjectNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('not found') ||
      error.message.includes('404') ||
      error.message.includes('failed to retrieve object')
    );
  }
  return false;
}
