/**
 * Library Collection Manager for Anytype
 *
 * Manages the creation and retrieval of a library collection object in Anytype.
 * This collection acts as a container for all Zotero bibliographic items.
 */

import { LocalizableError } from '../errors';
import {
  AnyteroPref,
  getAnyteroPref,
  setAnyteroPref,
} from '../prefs/anytero-pref';
import { logger } from '../utils';

import type { AnytypeClient, AnytypeObject } from './anytype-client';

const LIBRARY_COLLECTION_NAME = 'Zotero Library';
const LIBRARY_COLLECTION_TYPE = 'page'; // Using 'page' type for the library container

/**
 * Get or create the library collection object in Anytype
 *
 * This function ensures that a single library collection object exists in the
 * specified space. It first checks if we have a stored collection ID, then
 * verifies it still exists, or creates a new one if needed.
 */
export async function getOrCreateLibraryCollection(
  client: AnytypeClient,
  spaceId: string,
): Promise<AnytypeObject> {
  // Check if we have a stored collection ID
  const storedCollectionId = getAnyteroPref(
    AnyteroPref.anytypeLibraryCollectionId,
  );

  if (storedCollectionId) {
    try {
      // Try to fetch the existing collection
      const collection = await client.getObject(spaceId, storedCollectionId);
      logger.debug('Found existing library collection:', collection.id);
      return collection;
    } catch (error) {
      logger.warn(
        'Stored library collection not found, will create new one:',
        error,
      );
      // Continue to create a new collection
    }
  }

  // Search for an existing library collection by name
  try {
    const results = await client.searchObjects(
      LIBRARY_COLLECTION_NAME,
      spaceId,
    );
    const existingCollection = results.find(
      (obj) =>
        obj.name === LIBRARY_COLLECTION_NAME &&
        obj.type_key === LIBRARY_COLLECTION_TYPE,
    );

    if (existingCollection) {
      logger.debug(
        'Found library collection by search:',
        existingCollection.id,
      );
      setAnyteroPref(
        AnyteroPref.anytypeLibraryCollectionId,
        existingCollection.id,
      );
      return existingCollection;
    }
  } catch (error) {
    logger.warn('Failed to search for existing library collection:', error);
    // Continue to create a new collection
  }

  // Create a new library collection
  return createLibraryCollection(client, spaceId);
}

/**
 * Create a new library collection object
 */
async function createLibraryCollection(
  client: AnytypeClient,
  spaceId: string,
): Promise<AnytypeObject> {
  logger.info('Creating new library collection in space:', spaceId);

  try {
    const collection = await client.createObject(spaceId, {
      type_key: LIBRARY_COLLECTION_TYPE,
      name: LIBRARY_COLLECTION_NAME,
      body: 'This collection contains bibliographic items synchronized from Zotero.',
      icon: {
        emoji: '📚',
        format: 'emoji',
      },
    });

    // Store the collection ID for future use
    setAnyteroPref(AnyteroPref.anytypeLibraryCollectionId, collection.id);

    logger.info('Created library collection:', collection.id);
    return collection;
  } catch (error) {
    logger.error('Failed to create library collection:', error);
    throw new LocalizableError(
      'Failed to create library collection in Anytype',
      'anytero-error-anytype-create-collection-failed',
    );
  }
}

/**
 * Clear the stored library collection ID
 * This can be used when resetting the sync configuration
 */
export function clearLibraryCollectionId(): void {
  setAnyteroPref(AnyteroPref.anytypeLibraryCollectionId, undefined);
  logger.debug('Cleared library collection ID from preferences');
}
