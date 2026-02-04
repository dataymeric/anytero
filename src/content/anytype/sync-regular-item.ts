/**
 * Anytype Sync Regular Item
 *
 * Handles syncing of regular Zotero items (non-notes) to Anytype
 */

import { LocalizableError } from '../errors';
import { logger } from '../utils';

import type { AnytypeClient, AnytypeObject } from './anytype-client';
import {
  getAnytypeObjectID,
  saveAnytypeLinkAttachment,
  saveAnytypeTag,
} from './item-data';
import { buildAnytypeProperties } from './property-builder';

export type SyncRegularItemParams = {
  anytypeClient: AnytypeClient;
  citationFormat: string;
  pageTitleFormat: any;
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

  // Build properties from Zotero item
  const { name, properties } = await buildAnytypeProperties({
    item,
    citationFormat,
    pageTitleFormat,
  });

  if (objectId) {
    return updateObject(anytypeClient, spaceId, objectId, name, properties);
  }

  return createObject(anytypeClient, spaceId, typeKey, name, properties);
}

/**
 * Create a new Anytype object
 */
async function createObject(
  client: AnytypeClient,
  spaceId: string,
  typeKey: string,
  name: string,
  properties: any[],
): Promise<AnytypeObject> {
  logger.debug('Creating object in space', spaceId, { name, properties });

  try {
    return await client.createObject(spaceId, {
      type_key: typeKey,
      name,
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
  properties: any[],
): Promise<AnytypeObject> {
  logger.debug('Updating object', objectId, 'in space', spaceId, {
    name,
    properties,
  });

  try {
    return await client.updateObject(spaceId, objectId, {
      name,
      properties,
    });
  } catch (error) {
    logger.error('Failed to update Anytype object:', error);

    // If object not found, try to create a new one
    if (isObjectNotFoundError(error)) {
      logger.debug('Object not found, creating new one');
      // Extract type_key from error or use default
      const typeKey = 'page'; // Default type
      return createObject(client, spaceId, typeKey, name, properties);
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
