import React from 'react';
import ReactDOM from 'react-dom';
import type { createRoot } from 'react-dom/client';

import type { FluentMessageId } from '../../locale/fluent-types';
import type { AnytypeAuthManager, AnytypeClient } from '../anytype';
import { LocalizableError } from '../errors';
import type { EventManager } from '../services';
import {
  createXULElement,
  getGlobalAnytero,
  getLocalizedErrorMessage,
  getXULElementById,
  logger,
} from '../utils';

import { PAGE_TITLE_FORMAT_L10N_IDS, PageTitleFormat } from './anytero-pref';
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
  private anytypeAuthManager!: AnytypeAuthManager;
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
  private pageTitleFormatMenu!: XUL.MenuListElement;

  public async init(): Promise<void> {
    await Zotero.uiReadyPromise;

    this.eventManager = getGlobalAnytero().eventManager;
    this.anytypeAuthManager = getGlobalAnytero().anytypeAuthManager;

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    this.anytypeConnectionContainer = getXULElementById(
      'anytero-anytypeConnection-container',
    )!;
    this.anytypeConnectionSpinner = getXULElementById(
      'anytero-anytypeConnection-spinner',
    )!;
    this.anytypeConnectButton = getXULElementById('anytero-anytypeConnect')!;
    this.anytypeDisconnectButton = getXULElementById(
      'anytero-anytypeDisconnect',
    )!;
    this.anytypeAuthContainer = getXULElementById(
      'anytero-anytypeAuth-container',
    )!;
    this.anytypeCodeInput = document.getElementById(
      'anytero-anytypeCode',
    ) as HTMLInputElement;
    this.anytypeVerifyButton = getXULElementById('anytero-anytypeVerify')!;
    this.anytypeSpaceMenu = getXULElementById('anytero-anytypeSpace')!;
    this.anytypeTypeMenu = getXULElementById('anytero-anytypeType')!;
    this.anytypeError = getXULElementById('anytero-anytypeError')!;
    this.pageTitleFormatMenu = getXULElementById('anytero-pageTitleFormat')!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    /* eslint-disable @typescript-eslint/no-misused-promises */
    this.anytypeConnectButton.addEventListener('command', this.connectAnytype);
    this.anytypeDisconnectButton.addEventListener(
      'command',
      this.disconnectAnytype,
    );
    this.anytypeVerifyButton.addEventListener(
      'command',
      this.verifyAnytypeCode,
    );
    /* eslint-enable @typescript-eslint/no-misused-promises */

    // Refresh the type menu whenever the selected space changes. Registered
    // once here (not inside refreshAnytypeConnectionSection, which may run
    // multiple times) to avoid stacking duplicate listeners.
    this.anytypeSpaceMenu.addEventListener(
      'command',
      this.handleAnytypeSpaceChange,
    );

    window.addEventListener('unload', () => {
      this.deinit();
    });

    await this.initPageTitleFormatMenu();
    await this.initSyncConfigsTable();

    // Don't block window from loading while waiting for network responses
    setTimeout(() => {
      void this.refreshAnytypeConnectionSection();
    }, 100);

    this.eventManager.addListener(
      'anytype-connection.add',
      this.handleAnytypeConnectionAdd,
    );
  }

  private deinit(): void {
    this.eventManager.removeListener(
      'anytype-connection.add',
      this.handleAnytypeConnectionAdd,
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
      'anytero-syncConfigsTable-container',
    )!;
    const collection = await document.l10n.formatValue(
      'anytero-preferences-collection-column',
    );
    const syncEnabled = await document.l10n.formatValue(
      'anytero-preferences-sync-enabled-column',
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

  private handleAnytypeConnectionAdd = () => {
    void this.refreshAnytypeConnectionSection();
  };

  private handleAnytypeSpaceChange = () => {
    void this.initAnytypeTypeMenu();
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

      const isAvailable = await client.checkHealth();

      if (!isAvailable) {
        throw new LocalizableError(
          'Anytype is not running',
          'anytero-error-anytype-auth-start-failed',
        );
      }

      this.anytypeConnectButton.hidden = true;
      this.anytypeAuthContainer.hidden = true;
      this.anytypeConnectionContainer.hidden = false;
      this.anytypeConnectionSpinner.removeAttribute('status');

      await this.refreshAnytypeSpaceMenu(client);
      await this.initAnytypeTypeMenu();
    } catch (error) {
      logger.error('Error in refreshAnytypeConnectionSection:', error);

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

  private async refreshAnytypeSpaceMenu(client: AnytypeClient): Promise<void> {
    let menuItems: MenuItem[] = [];

    this.anytypeSpaceMenu.disabled = true;

    try {
      const spaces = await client.listSpaces();

      if (spaces.length === 0) {
        logger.warn('No spaces returned from Anytype API');
        menuItems = [
          {
            label: 'No spaces found',
            value: '',
            disabled: true,
          },
        ];
      } else {
        menuItems = spaces.map<MenuItem>((space) => ({
          label: space.name || space.id,
          value: space.id,
        }));
        this.anytypeSpaceMenu.disabled = false;
      }
    } catch (error) {
      logger.error('Failed to load Anytype spaces:', error);
      menuItems = [
        {
          label: 'Failed to load spaces',
          value: '',
          disabled: true,
        },
      ];
      throw error;
    } finally {
      setMenuItems(this.anytypeSpaceMenu, menuItems);
    }
  }

  private async initAnytypeTypeMenu(): Promise<void> {
    let menuItems: MenuItem[] = [];

    this.anytypeTypeMenu.disabled = true;

    try {
      const client = await this.anytypeAuthManager.createClient(window);

      // Read directly from the menulist value, not from preferences
      const spaceId = this.anytypeSpaceMenu.value;

      if (!spaceId) {
        menuItems = [
          {
            label: 'Select a space first',
            value: '',
            disabled: true,
          },
        ];
      } else {
        const types = await client.listObjectTypes(spaceId);

        if (types.length === 0) {
          logger.warn('No types returned from Anytype API');
          menuItems = [
            {
              label: 'No custom types found',
              value: '',
              disabled: true,
            },
          ];
        } else {
          menuItems = types.map<MenuItem>((type) => ({
            label: type.name || type.key,
            value: type.key,
          }));
          this.anytypeTypeMenu.disabled = false;
        }
      }
    } catch (error) {
      logger.error('Failed to load Anytype object types:', error);
      menuItems = [
        {
          label: 'Failed to load types',
          value: '',
          disabled: true,
        },
      ];
    } finally {
      setMenuItems(this.anytypeTypeMenu, menuItems);
    }
  }

  private connectAnytype = async (): Promise<void> => {
    this.anytypeConnectButton.disabled = true;
    this.anytypeError.hidden = true;

    try {
      const isAvailable =
        await this.anytypeAuthManager.checkAnytypeAvailable(window);
      if (!isAvailable) {
        throw new LocalizableError(
          'Anytype desktop app is not running',
          'anytero-error-anytype-auth-start-failed',
        );
      }

      await this.anytypeAuthManager.startAuth(window);

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
        'anytero-preferences-anytype-disconnect-dialog-title',
      )) || 'Disconnect Anytype';
    const dialogText =
      (await document.l10n.formatValue(
        'anytero-preferences-anytype-disconnect-dialog-text',
      )) || 'Disconnect from Anytype';

    const confirmed = Services.prompt.confirm(null, dialogTitle, dialogText);
    if (!confirmed) return;

    await this.anytypeAuthManager.removeAllApiKeys();

    await this.refreshAnytypeConnectionSection();
  };
}

type WindowWithAnyteroPreferences = typeof window & {
  Anytero_Preferences: Preferences;
};

(window as WindowWithAnyteroPreferences).Anytero_Preferences =
  new Preferences();
