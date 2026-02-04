/**
 * Anytype Sync Job
 * 
 * Orchestrates syncing of Zotero items to Anytype
 */

import type { AnytypeClient } from './anytype-client';
import { APA_STYLE } from '../constants';
import { ItemSyncError } from '../errors';
import {
  NoteroPref,
  PageTitleFormat,
  getNoteroPref,
  getRequiredNoteroPref,
} from '../prefs/notero-pref';
import { getLocalizedErrorMessage, logger } from '../utils';

import { ProgressWindow } from '../sync/progress-window';
import { syncRegularItem } from './sync-regular-item';
import { syncNoteItem } from './sync-note-item';

export type AnytypeSyncJobParams = {
  anytypeClient: AnytypeClient;
  citationFormat: string;
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
  const spaceId = getRequiredNoteroPref(NoteroPref.anytypeSpaceId);
  const typeKey = getNoteroPref(NoteroPref.anytypeTypeKey) || 'page';
  const citationFormat = getCitationFormat();
  const pageTitleFormat = getPageTitleFormat();

  // Verify the client is authenticated
  if (!anytypeClient.isAuthenticated()) {
    throw new Error('Anytype client is not authenticated');
  }

  return {
    anytypeClient,
    citationFormat,
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
  return getNoteroPref(NoteroPref.pageTitleFormat) || PageTitleFormat.itemTitle;
}

/**
 * Sync all items
 */
async function syncItems(
  items: Zotero.Item[],
  progressWindow: ProgressWindow,
  params: AnytypeSyncJobParams,
) {
  for (const [index, item] of items.entries()) {
    const step = index + 1;
    logger.groupCollapsed(
      `Syncing item ${step} of ${items.length} with ID`,
      item.id,
    );
    logger.debug(item.getDisplayTitle());

    await progressWindow.updateText(step);

    try {
      if (item.isNote()) {
        await syncNoteItem(item, params.anytypeClient, params.spaceId);
      } else {
        await syncRegularItem(item, params);
      }
    } catch (error) {
      throw new ItemSyncError(error, item);
    } finally {
      logger.groupEnd();
    }

    progressWindow.updateProgress(step);
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
