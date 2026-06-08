import { FluentMessageId } from '../../locale/fluent-types';
import { MissingPrefError } from '../errors';

export enum AnyteroPref {
  anytypeApiKey = 'anytypeApiKey',
  anytypeLibraryCollectionId = 'anytypeLibraryCollectionId',
  anytypeSpaceId = 'anytypeSpaceId',
  anytypeTypeKey = 'anytypeTypeKey',
  collectionSyncConfigs = 'collectionSyncConfigs',
  pageTitleFormat = 'pageTitleFormat',
  syncNotes = 'syncNotes',
  syncOnModifyItems = 'syncOnModifyItems',
  syncReadingListStatus = 'syncReadingListStatus',
}

export enum PageTitleFormat {
  itemAuthorDateCitation = 'itemAuthorDateCitation',
  itemCitationKey = 'itemCitationKey',
  itemFullCitation = 'itemFullCitation',
  itemInTextCitation = 'itemInTextCitation',
  itemShortTitle = 'itemShortTitle',
  itemTitle = 'itemTitle',
}

export const PAGE_TITLE_FORMAT_L10N_IDS: Record<
  PageTitleFormat,
  FluentMessageId
> = {
  [PageTitleFormat.itemAuthorDateCitation]:
    'anytero-page-title-format-item-author-date-citation',
  [PageTitleFormat.itemCitationKey]:
    'anytero-page-title-format-item-citation-key',
  [PageTitleFormat.itemFullCitation]:
    'anytero-page-title-format-item-full-citation',
  [PageTitleFormat.itemInTextCitation]:
    'anytero-page-title-format-item-in-text-citation',
  [PageTitleFormat.itemShortTitle]:
    'anytero-page-title-format-item-short-title',
  [PageTitleFormat.itemTitle]: 'anytero-page-title-format-item-title',
};

type AnyteroPrefValue = Partial<{
  [AnyteroPref.anytypeApiKey]: string;
  [AnyteroPref.anytypeLibraryCollectionId]: string;
  [AnyteroPref.anytypeSpaceId]: string;
  [AnyteroPref.anytypeTypeKey]: string;
  [AnyteroPref.collectionSyncConfigs]: string;
  [AnyteroPref.pageTitleFormat]: PageTitleFormat;
  [AnyteroPref.syncNotes]: boolean;
  [AnyteroPref.syncOnModifyItems]: boolean;
  [AnyteroPref.syncReadingListStatus]: boolean;
}>;

function buildFullPrefName(pref: AnyteroPref): string {
  return `extensions.anytero.${pref}`;
}

function getBooleanPref(value: Zotero.Prefs.Value): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function getStringPref(value: Zotero.Prefs.Value): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function isPageTitleFormat(
  value: Zotero.Prefs.Value,
): value is PageTitleFormat {
  return (
    typeof value === 'string' &&
    Object.values<string>(PageTitleFormat).includes(value)
  );
}

function getPageTitleFormatPref(
  value: Zotero.Prefs.Value,
): PageTitleFormat | undefined {
  return isPageTitleFormat(value) ? value : undefined;
}

function convertRawPrefValue<P extends AnyteroPref>(
  pref: P,
  value: Zotero.Prefs.Value,
): AnyteroPrefValue[P] {
  const booleanPref = getBooleanPref(value);
  const stringPref = getStringPref(value);

  const pageTitleFormatPref =
    (pref === AnyteroPref.pageTitleFormat && getPageTitleFormatPref(value)) ||
    undefined;

  return {
    [AnyteroPref.anytypeApiKey]: stringPref,
    [AnyteroPref.anytypeLibraryCollectionId]: stringPref,
    [AnyteroPref.anytypeSpaceId]: stringPref,
    [AnyteroPref.anytypeTypeKey]: stringPref,
    [AnyteroPref.collectionSyncConfigs]: stringPref,
    [AnyteroPref.pageTitleFormat]: pageTitleFormatPref,
    [AnyteroPref.syncNotes]: booleanPref,
    [AnyteroPref.syncOnModifyItems]: booleanPref,
    [AnyteroPref.syncReadingListStatus]: booleanPref,
  }[pref];
}

export function clearAnyteroPref(pref: AnyteroPref): void {
  Zotero.Prefs.clear(buildFullPrefName(pref), true);
}

export function getAnyteroPref<P extends AnyteroPref>(
  pref: P,
): AnyteroPrefValue[P] {
  const value = Zotero.Prefs.get(buildFullPrefName(pref), true);
  return convertRawPrefValue(pref, value);
}

export function getRequiredAnyteroPref<P extends AnyteroPref>(
  pref: P,
): NonNullable<AnyteroPrefValue[P]> {
  const value = getAnyteroPref(pref);

  if (value) return value;

  throw new MissingPrefError(pref);
}

export function setAnyteroPref<P extends AnyteroPref>(
  pref: P,
  value: AnyteroPrefValue[P],
): void {
  Zotero.Prefs.set(buildFullPrefName(pref), value, true);
}

export function registerAnyteroPrefObserver<P extends AnyteroPref>(
  pref: P,
  handler: (value: AnyteroPrefValue[P]) => void,
): symbol {
  return Zotero.Prefs.registerObserver(
    buildFullPrefName(pref),
    (value: Zotero.Prefs.Value) => {
      handler(convertRawPrefValue(pref, value));
    },
    true,
  );
}

export function unregisterAnyteroPrefObserver(symbol: symbol): void {
  Zotero.Prefs.unregisterObserver(symbol);
}
