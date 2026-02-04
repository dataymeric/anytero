import { APIErrorCode, type Client, isFullDatabase } from '@notionhq/client';
import type { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import React from 'react';
import ReactDOM from 'react-dom';
import type { createRoot } from 'react-dom/client';

import type { FluentMessageId } from '../../locale/fluent-types';
import type { NotionAuthManager } from '../auth';
import type { AnytypeAuthManager, AnytypeClient, AnytypeSpace } from '../anytype';
import { LocalizableError } from '../errors';
import type { EventManager } from '../services';
import { getNotionClient } from '../sync/notion-client';
import { isNotionErrorWithCode, normalizeID } from '../sync/notion-utils';
import {
  createXULElement,
  getGlobalNotero,
  getLocalizedErrorMessage,
  getXULElementById,
  logger,
} from '../utils';

import { PAGE_TITLE_FORMAT_L10N_IDS, PageTitleFormat } from './notero-pref';
import { SyncConfigsTable } from './sync-configs-table';

type ReactDOMClient = typeof ReactDOM & { createRoot: typeof createRoot };

type MenuItem = {
  disabled?: boolean;
  l10nId?: FluentMessageId;
  label?: string;
  value: string;
};

function setMenuItems(menuList: XUL.MenuListElement, items: MenuItem[]): void {
  menuList.menupopup.replaceChildren();

  items.forEach(({ disabled, l10nId, label, value }) => {
    const item = createXULElement(document, 'menuitem');
    item.value = value;
    item.disabled = Boolean(disabled);
    if (l10nId) {
      document.l10n.setAttributes(item, l10nId);
    } else {
      item.label = label || value;
    }
    menuList.menupopup.append(item);
  });
}

class Preferences {
  private eventManager!: EventManager;
  private notionAuthManager!: NotionAuthManager;
  private anytypeAuthManager!: AnytypeAuthManager;
  private notionConnectionContainer!: XUL.XULElement;
  private notionConnectionSpinner!: XUL.XULElement;
  private notionConnectButton!: XUL.ButtonElement;
  private notionDisconnectButton!: XUL.ButtonElement;
  private notionUpgradeConnectionButton!: XUL.ButtonElement;
  private notionDatabaseMenu!: XUL.MenuListElement;
  private notionError!: XUL.LabelElement;
  private notionTokenContainer!: XUL.XULElement;
  private notionWorkspaceLabel!: XUL.LabelElement;
  private anytypeConnectionContainer!: XUL.XULElement;
  private anytypeConnectionSpinner!: XUL.XULElement;
  private anytypeConnectButton!: XUL.ButtonElement;
  private anytypeDisconnectButton!: XUL.ButtonElement;
  private anytypeAuthContainer!: XUL.XULElement;
  private anytypeCodeInput!: HTMLInputElement;
  private anytypeVerifyButton!: XUL.ButtonElement;
  private anytypeSpaceMenu!: XUL.MenuListElement;
  private anytypeTypeMenu!: XUL.MenuListElement;
  private anytypeError!: XUL.LabelElement;
  private anytypeCurrentChallenge?: string;
  private pageTitleFormatMenu!: XUL.MenuListElement;

  public async init(): Promise<void> {
    await Zotero.uiReadyPromise;

    this.eventManager = getGlobalNotero().eventManager;
    this.notionAuthManager = getGlobalNotero().notionAuthManager;
    this.anytypeAuthManager = getGlobalNotero().anytypeAuthManager;

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    this.notionConnectionContainer = getXULElementById(
      'notero-notionConnection-container',
    )!;
    this.notionConnectionSpinner = getXULElementById(
      'notero-notionConnection-spinner',
    )!;
    this.notionConnectButton = getXULElementById('notero-notionConnect')!;
    this.notionDisconnectButton = getXULElementById('notero-notionDisconnect')!;
    this.notionUpgradeConnectionButton = getXULElementById(
      'notero-notionUpgradeConnection',
    )!;
    this.notionDatabaseMenu = getXULElementById('notero-notionDatabase')!;
    this.notionError = getXULElementById('notero-notionError')!;
    this.notionTokenContainer = getXULElementById(
      'notero-notionToken-container',
    )!;
    this.notionWorkspaceLabel = getXULElementById('notero-notionWorkspace')!;
    this.anytypeConnectionContainer = getXULElementById(
      'notero-anytypeConnection-container',
    )!;
    this.anytypeConnectionSpinner = getXULElementById(
      'notero-anytypeConnection-spinner',
    )!;
    this.anytypeConnectButton = getXULElementById('notero-anytypeConnect')!;
    this.anytypeDisconnectButton = getXULElementById('notero-anytypeDisconnect')!;
    this.anytypeAuthContainer = getXULElementById('notero-anytypeAuth-container')!;
    this.anytypeCodeInput = document.getElementById('notero-anytypeCode') as HTMLInputElement;
    this.anytypeVerifyButton = getXULElementById('notero-anytypeVerify')!;
    this.anytypeSpaceMenu = getXULElementById('notero-anytypeSpace')!;
    this.anytypeTypeMenu = getXULElementById('notero-anytypeType')!;
    this.anytypeError = getXULElementById('notero-anytypeError')!;
    this.pageTitleFormatMenu = getXULElementById('notero-pageTitleFormat')!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    /* eslint-disable @typescript-eslint/no-misused-promises */
    this.notionConnectButton.addEventListener('command', this.connectNotion);
    this.notionDisconnectButton.addEventListener(
      'command',
      this.disconnectNotion,
    );
    this.notionUpgradeConnectionButton.addEventListener(
      'command',
      this.upgradeNotionConnection,
    );
    this.notionTokenContainer.addEventListener('input', this.handleTokenInput);
    this.anytypeConnectButton.addEventListener('command', this.connectAnytype);
    this.anytypeDisconnectButton.addEventListener('command', this.disconnectAnytype);
    this.anytypeVerifyButton.addEventListener('command', this.verifyAnytypeCode);
    /* eslint-enable @typescript-eslint/no-misused-promises */

    window.addEventListener('unload', () => {
      this.deinit();
    });

    await this.initPageTitleFormatMenu();
    await this.initSyncConfigsTable();

    // Don't block window from loading while waiting for network responses
    setTimeout(() => {
      void this.refreshNotionConnectionSection();
      void this.refreshAnytypeConnectionSection();
    }, 100);

    this.eventManager.addListener(
      'notion-connection.add',
      this.handleNotionConnectionAdd,
    );
    this.eventManager.addListener(
      'anytype-connection.add',
      this.handleAnytypeConnectionAdd,
    );
  }

  private deinit(): void {
    this.eventManager.removeListener(
      'notion-connection.add',
      this.handleNotionConnectionAdd,
    );
    this.eventManager.removeListener(
      'anytype-connection.add',
      this.handleAnytypeConnectionAdd,
    );
  }

  private async showError(error: unknown): Promise<void> {
    this.notionError.hidden = false;
    this.notionError.value = await getLocalizedErrorMessage(
      error,
      document.l10n,
    );
  }

  private async initPageTitleFormatMenu(): Promise<void> {
    const isBetterBibTeXActive = await this.isBetterBibTeXActive();

    const menuItems = Object.values(PageTitleFormat).map<MenuItem>(
      (format) => ({
        disabled:
          format === PageTitleFormat.itemCitationKey && !isBetterBibTeXActive,
        l10nId: PAGE_TITLE_FORMAT_L10N_IDS[format],
        value: format,
      }),
    );

    setMenuItems(this.pageTitleFormatMenu, menuItems);
    this.pageTitleFormatMenu.disabled = false;
  }

  private async initSyncConfigsTable(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const syncConfigsTableContainer = document.getElementById(
      'notero-syncConfigsTable-container',
    )!;
    const collection = await document.l10n.formatValue(
      'notero-preferences-collection-column',
    );
    const syncEnabled = await document.l10n.formatValue(
      'notero-preferences-sync-enabled-column',
    );
    const columnLabels = {
      collectionFullName: collection || 'Collection',
      syncEnabled: syncEnabled || 'Sync Enabled',
    };

    (ReactDOM as ReactDOMClient)
      .createRoot(syncConfigsTableContainer)
      .render(
        <SyncConfigsTable
          columnLabels={columnLabels}
          container={syncConfigsTableContainer}
        />,
      );
  }

  private async isBetterBibTeXActive(): Promise<boolean> {
    const { AddonManager } = ChromeUtils.importESModule(
      'resource://gre/modules/AddonManager.sys.mjs',
    );
    const addon = await AddonManager.getAddonByID(
      'better-bibtex@iris-advies.com',
    );
    return Boolean(addon?.isActive);
  }

  private handleNotionConnectionAdd = () => {
    void this.refreshNotionConnectionSection();
  };

  private async refreshNotionConnectionSection(): Promise<void> {
    const connection = await this.notionAuthManager.getFirstConnection();
    const legacyToken = this.notionAuthManager.getLegacyAuthToken();

    const authToken = connection?.access_token || legacyToken;

    this.notionError.hidden = true;

    if (!authToken) {
      this.notionConnectButton.hidden = false;
      this.notionConnectionContainer.hidden = true;
      return;
    }

    this.notionConnectionSpinner.setAttribute('status', 'animate');
    this.notionTokenContainer.hidden = true;

    try {
      const notion = getNotionClient(authToken, window);

      const user = await notion.users.me({});
      const workspaceName =
        (user.type === 'bot' && user.bot.workspace_name) || 'Connected';

      document.l10n.setArgs(this.notionWorkspaceLabel, {
        'workspace-name': workspaceName,
      });

      this.notionConnectButton.hidden = true;
      this.notionUpgradeConnectionButton.hidden = Boolean(connection);
      this.notionConnectionContainer.hidden = false;
      this.notionConnectionSpinner.removeAttribute('status');

      await this.refreshNotionDatabaseMenu(notion);
    } catch (error) {
      logger.error(error);

      this.notionConnectionSpinner.removeAttribute('status');
      await this.showError(error);

      if (isNotionErrorWithCode(error, APIErrorCode.Unauthorized)) {
        this.notionConnectButton.hidden = false;
      }
    }
  }

  private async refreshNotionDatabaseMenu(notion: Client): Promise<void> {
    let menuItems: MenuItem[] = [];

    this.notionDatabaseMenu.disabled = true;

    try {
      const databases = await this.retrieveNotionDatabases(notion);

      menuItems = databases.map<MenuItem>((database) => {
        const title = database.title.map((t) => t.plain_text).join('');
        const icon =
          database.icon?.type === 'emoji' ? database.icon.emoji : null;

        return {
          label: icon ? `${icon} ${title}` : title,
          value: normalizeID(database.id),
        };
      });

      this.notionDatabaseMenu.disabled = false;
    } finally {
      setMenuItems(this.notionDatabaseMenu, menuItems);
    }
  }

  private async retrieveNotionDatabases(
    notion: Client,
  ): Promise<DatabaseObjectResponse[]> {
    const response = await notion.search({
      filter: { property: 'object', value: 'database' },
    });

    const databases = response.results.filter(isFullDatabase);

    if (databases.length === 0) {
      throw new LocalizableError(
        'No Notion databases are accessible',
        'notero-error-no-notion-databases',
      );
    }

    return databases;
  }

  private connectNotion = async (event: XUL.CommandEvent): Promise<void> => {
    const button = event.target as XUL.ButtonElement;

    button.disabled = true;

    window.addEventListener(
      'blur',
      () => {
        button.disabled = false;
        this.notionTokenContainer.hidden = false;
      },
      { once: true },
    );

    await this.notionAuthManager.openLogin();
  };

  private disconnectNotion = async (): Promise<void> => {
    const dialogTitle =
      (await document.l10n.formatValue(
        'notero-preferences-notion-disconnect-dialog-title',
      )) || 'Disconnect Notion Workspace';
    const dialogText =
      (await document.l10n.formatValue(
        'notero-preferences-notion-disconnect-dialog-text',
      )) || 'Disconnect workspace';

    const confirmed = Services.prompt.confirm(null, dialogTitle, dialogText);
    if (!confirmed) return;

    await this.notionAuthManager.removeAllConnections();

    await this.refreshNotionConnectionSection();
  };

  private upgradeNotionConnection = async (
    event: XUL.CommandEvent,
  ): Promise<void> => {
    const dialogTitle =
      (await document.l10n.formatValue(
        'notero-preferences-notion-upgrade-dialog-title',
      )) || 'Upgrade Notion Connection';
    const dialogText =
      (await document.l10n.formatValue(
        'notero-preferences-notion-upgrade-dialog-text',
      )) || 'Upgrade connection';

    const confirmed = Services.prompt.confirm(null, dialogTitle, dialogText);
    if (!confirmed) return;

    // Ensure window blur listener works as expected
    setTimeout(() => {
      void this.connectNotion(event);
    }, 100);
  };

  private handleTokenInput = async (event: Event): Promise<void> => {
    const tokenInput = (event.target as HTMLInputElement).value.trim();
    const params = new URLSearchParams(tokenInput);
    try {
      await this.notionAuthManager.handleTokenResponse(params);
    } catch (error) {
      logger.error(error);
      await this.showError(error);
    }
  };

  // Anytype methods

  private handleAnytypeConnectionAdd = () => {
    void this.refreshAnytypeConnectionSection();
  };

  private async refreshAnytypeConnectionSection(): Promise<void> {
    const apiKey = await this.anytypeAuthManager.getOptionalApiKey();

    this.anytypeError.hidden = true;

    if (!apiKey) {
      this.anytypeConnectButton.hidden = false;
      this.anytypeConnectionContainer.hidden = true;
      this.anytypeAuthContainer.hidden = true;
      return;
    }

    this.anytypeConnectionSpinner.setAttribute('status', 'animate');

    try {
      const client = await this.anytypeAuthManager.createClient(window);

      // Check if Anytype is available
      const isAvailable = await client.checkHealth();
      if (!isAvailable) {
        throw new LocalizableError(
          'Anytype is not running',
          'notero-error-anytype-auth-start-failed',
        );
      }

      this.anytypeConnectButton.hidden = true;
      this.anytypeAuthContainer.hidden = true;
      this.anytypeConnectionContainer.hidden = false;
      this.anytypeConnectionSpinner.removeAttribute('status');

      await this.refreshAnytypeSpaceMenu(client);
      await this.initAnytypeTypeMenu();
    } catch (error) {
      logger.error(error);

      this.anytypeConnectionSpinner.removeAttribute('status');
      await this.showAnytypeError(error);

      this.anytypeConnectButton.hidden = false;
      this.anytypeConnectionContainer.hidden = true;
    }
  }

  private async showAnytypeError(error: unknown): Promise<void> {
    this.anytypeError.hidden = false;
    this.anytypeError.value = await getLocalizedErrorMessage(
      error,
      document.l10n,
    );
  }

  private async refreshAnytypeSpaceMenu(
    client: AnytypeClient,
  ): Promise<void> {
    let menuItems: MenuItem[] = [];

    this.anytypeSpaceMenu.disabled = true;

    try {
      const spaces = await client.listSpaces();

      menuItems = spaces.map<MenuItem>((space) => ({
        label: space.name || space.id,
        value: space.id,
      }));

      this.anytypeSpaceMenu.disabled = false;
    } catch (error) {
      logger.error('Failed to load Anytype spaces:', error);
      throw error;
    } finally {
      setMenuItems(this.anytypeSpaceMenu, menuItems);
    }
  }

  private async initAnytypeTypeMenu(): Promise<void> {
    const menuItems: MenuItem[] = [
      { label: 'Page', value: 'page' },
      { label: 'Note', value: 'note' },
      { label: 'Task', value: 'task' },
      { label: 'Custom', value: 'custom' },
    ];

    setMenuItems(this.anytypeTypeMenu, menuItems);
    this.anytypeTypeMenu.disabled = false;
  }

  private connectAnytype = async (): Promise<void> => {
    this.anytypeConnectButton.disabled = true;
    this.anytypeError.hidden = true;

    try {
      // Check if Anytype is available
      const isAvailable = await this.anytypeAuthManager.checkAnytypeAvailable(window);
      if (!isAvailable) {
        throw new LocalizableError(
          'Anytype desktop app is not running',
          'notero-error-anytype-auth-start-failed',
        );
      }

      const challenge = await this.anytypeAuthManager.startAuth(window);
      this.anytypeCurrentChallenge = challenge.challenge_id;

      // Show the auth container with code input
      this.anytypeConnectButton.hidden = true;
      this.anytypeAuthContainer.hidden = false;
      this.anytypeCodeInput.value = '';
      this.anytypeCodeInput.focus();
    } catch (error) {
      logger.error('Failed to start Anytype auth:', error);
      await this.showAnytypeError(error);
      this.anytypeConnectButton.disabled = false;
    }
  };

  private verifyAnytypeCode = async (): Promise<void> => {
    const code = this.anytypeCodeInput.value.trim();

    if (!code || code.length !== 4) {
      await this.showAnytypeError(
        new Error('Please enter the 4-digit code from Anytype'),
      );
      return;
    }

    this.anytypeVerifyButton.disabled = true;
    this.anytypeError.hidden = true;

    try {
      await this.anytypeAuthManager.completeAuth(code, window);
      // Connection will be refreshed by the event listener
    } catch (error) {
      logger.error('Failed to verify Anytype code:', error);
      await this.showAnytypeError(error);
      this.anytypeVerifyButton.disabled = false;
    }
  };

  private disconnectAnytype = async (): Promise<void> => {
    const dialogTitle =
      (await document.l10n.formatValue(
        'notero-preferences-anytype-disconnect-dialog-title',
      )) || 'Disconnect Anytype';
    const dialogText =
      (await document.l10n.formatValue(
        'notero-preferences-anytype-disconnect-dialog-text',
      )) || 'Disconnect from Anytype';

    const confirmed = Services.prompt.confirm(null, dialogTitle, dialogText);
    if (!confirmed) return;

    await this.anytypeAuthManager.removeAllApiKeys();

    await this.refreshAnytypeConnectionSection();
  };
}

type WindowWithNoteroPreferences = typeof window & {
  Notero_Preferences: Preferences;
};

(window as WindowWithNoteroPreferences).Notero_Preferences = new Preferences();
