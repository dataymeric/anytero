/**
 * Anytype Sync Job
 *
 * Orchestrates syncing of Zotero items to Anytype
 */

import { APA_STYLE } from '../constants';
import { ItemSyncError } from '../errors';
import {
  AnyteroPref,
  PageTitleFormat,
  getAnyteroPref,
  getRequiredAnyteroPref,
} from '../prefs/anytero-pref';
import { ProgressWindow } from '../sync/progress-window';
import { getLocalizedErrorMessage, logger } from '../utils';

import type { AnytypeClient } from './anytype-client';
import { getAnytypeObjectID } from './item-data';
import { syncRegularItem } from './sync-regular-item';

export type AnytypeSyncJobParams = {
  anytypeClient: AnytypeClient;
  citationFormat: string;
  libraryCollectionId: string;
  pageTitleFormat: PageTitleFormat;
  spaceId: string;
  typeKey: string;
};

/**
 * Perform a sync job for multiple items
 */
export async function performAnytypeSyncJob(
  itemIDs: Set<Zotero.Item['id']>,
  getAnytypeClient: () => Promise<AnytypeClient>,
  window: Window,
): Promise<void> {
  const items = Zotero.Items.get(Array.from(itemIDs));
  if (!items.length) return;

  const progressWindow = new ProgressWindow(items.length, window);
  await progressWindow.show();

  try {
    const params = await prepareSyncJob(getAnytypeClient);
    await syncItems(items, progressWindow, params);
  } catch (error) {
    await handleError(error, progressWindow, window);
  }
}

/**
 * Prepare sync job parameters
 */
async function prepareSyncJob(
  getAnytypeClient: () => Promise<AnytypeClient>,
): Promise<AnytypeSyncJobParams> {
  const anytypeClient = await getAnytypeClient();
  const spaceId = getRequiredAnyteroPref(AnyteroPref.anytypeSpaceId);
  const typeKey = getAnyteroPref(AnyteroPref.anytypeTypeKey) || 'page';
  logger.debug('Retrieved typeKey from preferences:', typeKey);
  const citationFormat = getCitationFormat();
  const pageTitleFormat = getPageTitleFormat();

  // Verify the client is authenticated
  if (!anytypeClient.isAuthenticated()) {
    throw new Error('Anytype client is not authenticated');
  }

  // Note: We're not creating a library collection anymore
  // Items will be created directly in the space

  return {
    anytypeClient,
    citationFormat,
    libraryCollectionId: '', // Empty string - not using library collection
    pageTitleFormat,
    spaceId,
    typeKey,
  };
}

/**
 * Get citation format from Zotero preferences
 */
function getCitationFormat(): string {
  const format = Zotero.Prefs.get('export.quickCopy.setting');

  if (typeof format === 'string' && format) return format;

  return APA_STYLE;
}

/**
 * Get page title format from preferences
 */
function getPageTitleFormat(): PageTitleFormat {
  return (
    getAnyteroPref(AnyteroPref.pageTitleFormat) || PageTitleFormat.itemTitle
  );
}

/**
 * Sync all items
 */
async function syncItems(
  items: Zotero.Item[],
  progressWindow: ProgressWindow,
  params: AnytypeSyncJobParams,
) {
  const rebuiltItemIDs = new Set<Zotero.Item['id']>();

  for (const [index, item] of items.entries()) {
    const step = index + 1;
    logger.groupCollapsed(
      `Syncing item ${step} of ${items.length} with ID`,
      item.id,
    );
    logger.debug(item.getDisplayTitle());

    await progressWindow.updateText(step);

    try {
      const target = item.isNote() ? item.parentItem : item;

      if (!target) {
        logger.warn('Note has no parent item; skipping');
      } else if (item.isNote() && !getAnytypeObjectID(target)) {
        logger.warn('Parent item not synced to Anytype; skipping note');
      } else if (rebuiltItemIDs.has(target.id)) {
        logger.debug('Parent already rebuilt in this job; skipping', target.id);
      } else {
        await syncRegularItem(target, params);
        rebuiltItemIDs.add(target.id);
      }
    } catch (error) {
      throw new ItemSyncError(error, item);
    } finally {
      logger.groupEnd();
    }

    progressWindow.updateProgress(step);

    // Add delay between items to avoid rate limiting (except for the last item)
    if (step < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
    }
  }

  progressWindow.complete();
}

/**
 * Handle sync errors
 */
async function handleError(
  error: unknown,
  progressWindow: ProgressWindow,
  window: Window,
) {
  let cause = error;
  let failedItem: Zotero.Item | undefined;

  if (error instanceof ItemSyncError) {
    cause = error.cause;
    failedItem = error.item;
  }

  const errorMessage = await getLocalizedErrorMessage(
    cause,
    window.document.l10n,
  );

  logger.error(error, failedItem?.getDisplayTitle());

  progressWindow.fail(errorMessage, failedItem);
}
