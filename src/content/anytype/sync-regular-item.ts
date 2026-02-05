/**
 * Anytype Sync Regular Item
 *
 * Handles syncing of regular Zotero items (non-notes) to Anytype
 */

import { LocalizableError } from '../errors';
import { PageTitleFormat } from '../prefs/notero-pref';
import { logger } from '../utils';

import type { AnytypeClient, AnytypeObject, AnytypeProperty } from './anytype-client';
import {
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
    return updateObject(anytypeClient, spaceId, objectId, name, body, properties);
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
  logger.debug('Creating object in space', spaceId, { name, body: body.substring(0, 100) + '...', properties });

  try {
    return await client.createObject(spaceId, {
      type_key: typeKey,
      name,
      body,
      properties,
    });
  } catch (error) {
    logger.error('Failed to create Anytype object:', error);
    throw new LocalizableError(
      'Failed to create Anytype object',
      'notero-error-anytype-create-failed',
    );
  }
}

/**
 * Update an existing Anytype object
 */
async function updateObject(
  client: AnytypeClient,
  spaceId: string,
  objectId: string,
  name: string,
  body: string,
  properties: AnytypeProperty[],
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

    // If object not found, try to create a new one
    if (isObjectNotFoundError(error)) {
      logger.debug('Object not found, creating new one');
      // Extract type_key from error or use default
      const typeKey = 'page'; // Default type
      return createObject(client, spaceId, typeKey, name, body, properties);
    }

    throw new LocalizableError(
      'Failed to update Anytype object',
      'notero-error-anytype-update-failed',
    );
  }
}

/**
 * Check if error is an object not found error
 */
function isObjectNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('not found') || error.message.includes('404');
  }
  return false;
}
