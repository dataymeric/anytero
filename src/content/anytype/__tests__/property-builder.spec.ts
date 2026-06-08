import { beforeEach, describe, expect, it } from 'vitest';

import {
  createZoteroItemMock,
  mockZoteroPrefs,
  zoteroMock,
} from '../../../../test/utils';
import { PageTitleFormat } from '../../prefs/anytero-pref';
import { buildAnytypeProperties } from '../property-builder';

describe('buildAnytypeProperties – reading_status', () => {
  const baseParams = {
    citationFormat: 'apa',
    pageTitleFormat: PageTitleFormat.itemTitle,
  };

  function makeItem(extra: string) {
    const item = createZoteroItemMock({
      getDisplayTitle: () => 'Test Item',
      getCreators: () => [],
      getTags: () => [],
      itemTypeID: 1,
    });
    item.getField.mockImplementation((field) =>
      field === 'extra' ? extra : '',
    );
    return item;
  }

  beforeEach(() => {
    mockZoteroPrefs();
    zoteroMock.CreatorTypes.getPrimaryIDForType.mockReturnValue(false);
    zoteroMock.ItemTypes.getLocalizedString.mockReturnValue('journalArticle');
    zoteroMock.URI.getItemURI.mockReturnValue(
      'zotero://select/library/items/KEY1',
    );
    zoteroMock.Users.getCurrentUsername.mockReturnValue(undefined);
  });

  it('omits reading_status when pref is disabled (default)', async () => {
    const item = makeItem('Read_Status: Read');
    const { properties } = await buildAnytypeProperties({
      ...baseParams,
      item,
    });
    expect(properties.find((p) => p.key === 'reading_status')).toBeUndefined();
  });

  it('omits reading_status when pref is enabled but Extra has no Read_Status', async () => {
    zoteroMock.Prefs.set('extensions.anytero.syncReadingListStatus', true);
    const item = makeItem('');
    const { properties } = await buildAnytypeProperties({
      ...baseParams,
      item,
    });
    expect(properties.find((p) => p.key === 'reading_status')).toBeUndefined();
  });

  it('includes reading_status select when pref is enabled and Extra has Read_Status', async () => {
    zoteroMock.Prefs.set('extensions.anytero.syncReadingListStatus', true);
    const item = makeItem('Read_Status: In Progress');
    const { properties } = await buildAnytypeProperties({
      ...baseParams,
      item,
    });
    expect(properties.find((p) => p.key === 'reading_status')).toEqual({
      key: 'reading_status',
      select: 'In Progress',
    });
  });

  it('trims whitespace from the status value', async () => {
    zoteroMock.Prefs.set('extensions.anytero.syncReadingListStatus', true);
    const item = makeItem('Read_Status:  To Read  ');
    const { properties } = await buildAnytypeProperties({
      ...baseParams,
      item,
    });
    expect(properties.find((p) => p.key === 'reading_status')).toEqual({
      key: 'reading_status',
      select: 'To Read',
    });
  });

  it('finds Read_Status anywhere in a multi-line Extra field', async () => {
    zoteroMock.Prefs.set('extensions.anytero.syncReadingListStatus', true);
    const item = makeItem(
      'Citation Key: smith2024\nRead_Status: Read\nOther: value',
    );
    const { properties } = await buildAnytypeProperties({
      ...baseParams,
      item,
    });
    expect(properties.find((p) => p.key === 'reading_status')).toEqual({
      key: 'reading_status',
      select: 'Read',
    });
  });
});
