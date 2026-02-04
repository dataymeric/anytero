/**
 * Anytype Property Builder
 *
 * Builds Anytype object properties from Zotero items
 */

import type { AnytypeProperty } from '../anytype';
import { NOTION_TAG_NAME } from '../constants';
import { PageTitleFormat } from '../prefs/notero-pref';
import {
  buildCollectionFullName,
  getItemURL,
  parseItemDate,
  truncateMiddle,
} from '../utils';

const ANYTYPE_TAG_NAME = 'anytype';

type PropertyBuilderParams = {
  citationFormat: string;
  item: Zotero.Item;
  pageTitleFormat: PageTitleFormat;
};

type PropertyDefinition = {
  key: string;
  buildValue: () => AnytypeProperty | Promise<AnytypeProperty | null> | null;
};

export async function buildAnytypeProperties(
  params: PropertyBuilderParams,
): Promise<{
  name: string;
  properties: AnytypeProperty[];
}> {
  const propertyBuilder = new AnytypePropertyBuilder(params);
  return propertyBuilder.buildProperties();
}

function formatCreatorName({ firstName, lastName }: Zotero.Creator) {
  return [lastName, firstName].filter((name) => name).join(', ');
}

/**
 * Sanitize text to conform to Anytype constraints
 * - Length must be <= 500 for most text fields
 */
function sanitizeText(text: string, maxLength: number = 500): string {
  return truncateMiddle(text, maxLength);
}

class AnytypePropertyBuilder {
  private readonly cachedCitations = new Map<string, string | null>();
  private readonly citationFormat: string;
  private readonly item: Zotero.Item;
  private readonly pageTitleFormat: PageTitleFormat;

  public constructor(params: PropertyBuilderParams) {
    this.citationFormat = params.citationFormat;
    this.item = params.item;
    this.pageTitleFormat = params.pageTitleFormat;
  }

  public async buildProperties(): Promise<{
    name: string;
    properties: AnytypeProperty[];
  }> {
    const name = await this.getPageTitle();
    const properties: AnytypeProperty[] = [];

    for (const definition of this.propertyDefinitions) {
      const property = await definition.buildValue();
      if (property !== null) {
        properties.push(property);
      }
    }

    return { name, properties };
  }

  private pageTitleBuilders: Record<
    PageTitleFormat,
    () => string | undefined | Promise<string | null>
  > = {
    [PageTitleFormat.itemAuthorDateCitation]: () =>
      this.getAuthorDateCitation(),
    [PageTitleFormat.itemCitationKey]: () => this.getCitationKey(),
    [PageTitleFormat.itemFullCitation]: () => this.getFullCitation(),
    [PageTitleFormat.itemInTextCitation]: () => this.getInTextCitation(),
    [PageTitleFormat.itemShortTitle]: () => this.getShortTitle(),
    [PageTitleFormat.itemTitle]: () => this.getTitle(),
  };

  private async getPageTitle(): Promise<string> {
    const pageTitle = await this.pageTitleBuilders[this.pageTitleFormat]();
    return pageTitle || this.getTitle();
  }

  private getAuthorDateCitation(): string {
    let citation =
      this.item.getField('firstCreator') || this.item.getDisplayTitle();
    let date = this.item.getField('date', true, true);
    if (date && (date = date.substring(0, 4)) !== '0000') {
      citation += ', ' + date;
    }
    return citation;
  }

  private getCitationKey(): string | undefined {
    return this.item.getField('citationKey');
  }

  public getFullCitation(): Promise<string | null> {
    return this.getCachedCitation(this.citationFormat, false);
  }

  public getInTextCitation(): Promise<string | null> {
    return this.getCachedCitation(this.citationFormat, true);
  }

  private getCitation(
    format: string,
    inTextCitation: boolean,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const result = Zotero.QuickCopy.getContentFromItems(
        [this.item],
        format,
        (obj, worked) => {
          resolve(worked ? obj.string.trim() : null);
        },
        inTextCitation,
      );

      if (result === false) {
        resolve(null);
      } else if (result !== true) {
        resolve(result.text.trim());
      }
    });
  }

  private async getCachedCitation(
    format: string,
    inTextCitation: boolean,
  ): Promise<string | null> {
    const cacheKey = `${format}-${String(inTextCitation)}`;

    if (!this.cachedCitations.has(cacheKey)) {
      this.cachedCitations.set(
        cacheKey,
        await this.getCitation(format, inTextCitation),
      );
    }

    return this.cachedCitations.get(cacheKey) || null;
  }

  private getShortTitle(): string | undefined {
    return this.item.getField('shortTitle');
  }

  private getTitle(): string {
    return this.item.getDisplayTitle();
  }

  private propertyDefinitions: PropertyDefinition[] = [
    {
      key: 'abstract',
      buildValue: () => {
        const abstract = this.item.getField('abstractNote');
        if (!abstract) return null;
        return {
          key: 'abstract',
          text: sanitizeText(abstract, 2000),
        };
      },
    },
    {
      key: 'authors',
      buildValue: () => {
        const primaryCreatorTypeID = Zotero.CreatorTypes.getPrimaryIDForType(
          this.item.itemTypeID,
        );
        if (!primaryCreatorTypeID) return null;

        const authors = this.item
          .getCreators()
          .filter(({ creatorTypeID }) => creatorTypeID === primaryCreatorTypeID)
          .map(formatCreatorName)
          .join(', ');

        if (!authors) return null;

        return {
          key: 'authors',
          text: sanitizeText(authors, 1000),
        };
      },
    },
    {
      key: 'citation_key',
      buildValue: () => {
        const citationKey = this.getCitationKey();
        if (!citationKey) return null;
        return {
          key: 'citation_key',
          text: citationKey,
        };
      },
    },
    {
      key: 'collections',
      buildValue: () => {
        const collections = Zotero.Collections.get(
          this.item.getCollections(),
        ).map((collection) =>
          sanitizeText(buildCollectionFullName(collection), 100),
        );

        if (collections.length === 0) return null;

        return {
          key: 'collections',
          multi_select: collections,
        };
      },
    },
    {
      key: 'date',
      buildValue: () => {
        const date = this.item.getField('date');
        if (!date) return null;
        return {
          key: 'date',
          text: date,
        };
      },
    },
    {
      key: 'date_added',
      buildValue: () => {
        const dateAdded = parseItemDate(this.item.dateAdded);
        if (!dateAdded) return null;
        return {
          key: 'date_added',
          date: dateAdded.toISOString(),
        };
      },
    },
    {
      key: 'date_modified',
      buildValue: () => {
        const dateModified = parseItemDate(this.item.dateModified);
        if (!dateModified) return null;
        return {
          key: 'date_modified',
          date: dateModified.toISOString(),
        };
      },
    },
    {
      key: 'doi',
      buildValue: () => {
        const doi = this.item.getField('DOI');
        if (!doi) return null;
        return {
          key: 'doi',
          url: `https://doi.org/${doi}`,
        };
      },
    },
    {
      key: 'editors',
      buildValue: () => {
        const editorTypeID = Zotero.CreatorTypes.getID('editor');
        if (!editorTypeID) return null;

        const editors = this.item
          .getCreators()
          .filter(({ creatorTypeID }) => creatorTypeID === editorTypeID)
          .map(formatCreatorName)
          .join(', ');

        if (!editors) return null;

        return {
          key: 'editors',
          text: sanitizeText(editors, 1000),
        };
      },
    },
    {
      key: 'extra',
      buildValue: () => {
        const extra = this.item.getField('extra');
        if (!extra) return null;
        return {
          key: 'extra',
          text: sanitizeText(extra, 2000),
        };
      },
    },
    {
      key: 'file_path',
      buildValue: async () => {
        const attachment = await this.item.getBestAttachment();
        if (!attachment) return null;

        const path = await attachment.getFilePathAsync();
        if (!path) return null;

        return {
          key: 'file_path',
          text: path,
        };
      },
    },
    {
      key: 'full_citation',
      buildValue: async () => {
        const citation = await this.getFullCitation();
        if (!citation) return null;
        return {
          key: 'full_citation',
          text: sanitizeText(citation, 1000),
        };
      },
    },
    {
      key: 'in_text_citation',
      buildValue: async () => {
        const citation = await this.getInTextCitation();
        if (!citation) return null;
        return {
          key: 'in_text_citation',
          text: sanitizeText(citation, 500),
        };
      },
    },
    {
      key: 'item_type',
      buildValue: () => {
        const itemType = Zotero.ItemTypes.getLocalizedString(
          this.item.itemTypeID,
        );
        if (!itemType) return null;
        return {
          key: 'item_type',
          select: itemType,
        };
      },
    },
    {
      key: 'place',
      buildValue: () => {
        const place = this.item.getField('place');
        if (!place) return null;
        return {
          key: 'place',
          text: sanitizeText(place, 200),
        };
      },
    },
    {
      key: 'proceedings_title',
      buildValue: () => {
        const title = this.item.getField('proceedingsTitle');
        if (!title) return null;
        return {
          key: 'proceedings_title',
          text: sanitizeText(title, 500),
        };
      },
    },
    {
      key: 'publication',
      buildValue: () => {
        const publication = this.item.getField('publicationTitle');
        if (!publication) return null;
        return {
          key: 'publication',
          text: sanitizeText(publication, 500),
        };
      },
    },
    {
      key: 'series_title',
      buildValue: () => {
        const title = this.item.getField('seriesTitle');
        if (!title) return null;
        return {
          key: 'series_title',
          text: sanitizeText(title, 500),
        };
      },
    },
    {
      key: 'short_title',
      buildValue: () => {
        const title = this.getShortTitle();
        if (!title) return null;
        return {
          key: 'short_title',
          text: sanitizeText(title, 500),
        };
      },
    },
    {
      key: 'tags',
      buildValue: () => {
        const tags = this.item
          .getTags()
          .filter(
            ({ tag }) => tag !== NOTION_TAG_NAME && tag !== ANYTYPE_TAG_NAME,
          )
          .map(({ tag }) => sanitizeText(tag, 50));

        if (tags.length === 0) return null;

        return {
          key: 'tags',
          multi_select: tags,
        };
      },
    },
    {
      key: 'title',
      buildValue: () => {
        const title = this.getTitle();
        return {
          key: 'title',
          text: title,
        };
      },
    },
    {
      key: 'url',
      buildValue: () => {
        const url = this.item.getField('url');
        if (!url) return null;
        return {
          key: 'url',
          url,
        };
      },
    },
    {
      key: 'year',
      buildValue: () => {
        const year = Number.parseInt(this.item.getField('year') || '');
        if (Number.isNaN(year)) return null;
        return {
          key: 'year',
          number: year,
        };
      },
    },
    {
      key: 'zotero_uri',
      buildValue: () => {
        const uri = getItemURL(this.item);
        return {
          key: 'zotero_uri',
          url: uri,
        };
      },
    },
  ];
}
