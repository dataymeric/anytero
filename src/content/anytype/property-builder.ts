/**
 * Anytype Property Builder
 *
 * Builds Anytype object properties from Zotero items
 */

import type { AnytypeProperty } from '../anytype';
import { NOTION_TAG_NAME } from '../constants';
import {
  AnyteroPref,
  PageTitleFormat,
  getAnyteroPref,
} from '../prefs/anytero-pref';
import {
  buildCollectionFullName,
  getItemURL,
  logger,
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
  body: string;
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
    body: string;
    properties: AnytypeProperty[];
  }> {
    const name = await this.getPageTitle();
    const body = this.buildBody();

    // Build properties from definitions
    const properties: AnytypeProperty[] = [];

    for (const definition of this.propertyDefinitions) {
      try {
        const value = await definition.buildValue();
        if (value) {
          properties.push(value);
        }
      } catch (error) {
        logger.warn(`Failed to build property ${definition.key}:`, error);
      }
    }

    logger.debug('Built', properties.length, 'properties for item');

    return { name, body, properties };
  }

  /**
   * Build formatted body content with all bibliographic data
   */
  private buildBody(): string {
    const sections: string[] = [];

    // Title
    const title = this.getTitle();
    if (title) {
      sections.push(`# ${title}\n`);
    }

    // Authors
    const primaryCreatorTypeID = Zotero.CreatorTypes.getPrimaryIDForType(
      this.item.itemTypeID,
    );
    if (primaryCreatorTypeID) {
      const authors = this.item
        .getCreators()
        .filter(({ creatorTypeID }) => creatorTypeID === primaryCreatorTypeID)
        .map(formatCreatorName)
        .join('; ');
      if (authors) {
        sections.push(`**Authors:** ${authors}\n`);
      }
    }

    // Publication info
    const publicationTitle = this.item.getField('publicationTitle');
    if (publicationTitle) {
      sections.push(`**Publication:** ${publicationTitle}\n`);
    }

    const date = this.item.getField('date');
    if (date) {
      sections.push(`**Date:** ${date}\n`);
    }

    // DOI
    const doi = this.item.getField('DOI');
    if (doi) {
      sections.push(`**DOI:** ${doi}\n`);
    }

    // URL
    const url = getItemURL(this.item);
    if (url) {
      sections.push(`**URL:** ${url}\n`);
    }

    // Collections
    const collections = Zotero.Collections.get(this.item.getCollections()).map(
      (collection) => buildCollectionFullName(collection),
    );
    if (collections.length > 0) {
      sections.push(`\n**Collections:** ${collections.join(', ')}\n`);
    }

    // Tags (excluding special tags)
    const tags = this.item
      .getTags()
      .map((t) => t.tag)
      .filter((tag) => tag !== ANYTYPE_TAG_NAME && tag !== NOTION_TAG_NAME);
    if (tags.length > 0) {
      sections.push(`\n**Tags:** ${tags.join(', ')}\n`);
    }

    // Item Type
    const itemType = Zotero.ItemTypes.getLocalizedString(this.item.itemTypeID);
    sections.push(`\n**Type:** ${itemType}\n`);

    // Citation Key (if available)
    const citationKey = this.getCitationKey();
    if (citationKey) {
      sections.push(`**Citation Key:** ${citationKey}\n`);
    }

    // Abstract
    const abstract = this.item.getField('abstractNote');
    if (abstract) {
      sections.push(`\n## Abstract\n\n${abstract}\n`);
    }

    return sections.join('\n');
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
    [PageTitleFormat.itemTitleTitleCase]: () =>
      this.getTitle().replace(
        /\p{L}\S*/gu,
        (word) => word.charAt(0).toUpperCase() + word.slice(1),
      ),
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
      key: 'isbn',
      buildValue: () => {
        const isbn = this.item.getField('ISBN');
        if (!isbn) return null;
        return {
          key: 'isbn',
          text: isbn,
        };
      },
    },
    {
      key: 'issn',
      buildValue: () => {
        const issn = this.item.getField('ISSN');
        if (!issn) return null;
        return {
          key: 'issn',
          text: issn,
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
      key: 'reading_status',
      buildValue: () => {
        if (!getAnyteroPref(AnyteroPref.syncReadingListStatus)) return null;
        const extra = this.item.getField('extra');
        if (!extra) return null;
        const match = extra.match(/^Read_Status:\s*(.+)$/m);
        const status = match?.[1]?.trim();
        if (!status) return null;
        return { key: 'reading_status', select: status };
      },
    },
  ];
}
