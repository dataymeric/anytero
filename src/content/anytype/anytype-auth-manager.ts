/**
 * Anytype Authentication Manager
 * 
 * Manages authentication flow with Anytype using challenge-response mechanism.
 * Stores API keys securely using Zotero's login manager.
 */

import { LocalizableError } from '../errors';
import {
  clearNoteroPref,
  getNoteroPref,
  NoteroPref,
} from '../prefs/notero-pref';
import type {
  EventManager,
  PreferencePaneManager,
  Service,
  ServiceParams,
} from '../services';
import { logger } from '../utils';

import {
  AnytypeClient,
  createAnytypeClient,
  type AnytypeAuthChallenge,
} from './anytype-client';
import {
  getAllApiKeys,
  removeApiKey,
  saveApiKey,
  type AnytypeApiKey,
} from './storage';

type AuthSession = {
  challengeId: string;
  startTime: number;
};

export class AnytypeAuthManager implements Service {
  private currentSession: AuthSession | null = null;
  private eventManager!: EventManager;
  private preferencePaneManager!: PreferencePaneManager;
  private readonly appName = 'Anytero';

  public startup({
    dependencies,
  }: ServiceParams<'eventManager' | 'preferencePaneManager'>) {
    this.eventManager = dependencies.eventManager;
    this.preferencePaneManager = dependencies.preferencePaneManager;
  }

  /**
   * Start the authentication flow
   * This will initiate a challenge and display instructions to the user
   */
  public async startAuth(window: Window): Promise<AnytypeAuthChallenge> {
    if (this.currentSession) {
      logger.warn('Cancelling existing Anytype auth session');
    }

    const client = createAnytypeClient(window);

    try {
      const challenge = await client.startAuthChallenge(this.appName);

      this.currentSession = {
        challengeId: challenge.challenge_id,
        startTime: Date.now(),
      };

      logger.debug('Auth challenge started:', challenge.challenge_id);
      return challenge;
    } catch (error) {
      logger.error('Failed to start auth challenge:', error);
      throw new LocalizableError(
        'Failed to start Anytype authentication',
        'notero-error-anytype-auth-start-failed',
      );
    }
  }

  /**
   * Complete the authentication by providing the 4-digit code
   */
  public async completeAuth(code: string, window: Window): Promise<void> {
    if (!this.currentSession) {
      throw new LocalizableError(
        'No active auth session',
        'notero-error-anytype-no-auth-session',
      );
    }

    const { challengeId } = this.currentSession;

    const client = createAnytypeClient(window);

    try {
      const apiKey = await client.completeAuthChallenge(challengeId, code);

      await saveApiKey(apiKey);

      // Clear any legacy prefs
      clearNoteroPref(NoteroPref.anytypeApiKey);

      this.currentSession = null;
      this.preferencePaneManager.openPreferences();
      this.eventManager.emit('anytype-connection.add', { api_key: apiKey });

      logger.debug('Authentication completed successfully');
    } catch (error) {
      logger.error('Failed to complete auth:', error);
      throw new LocalizableError(
        'Failed to complete Anytype authentication',
        'notero-error-anytype-auth-complete-failed',
      );
    }
  }

  /**
   * Cancel the current authentication session
   */
  public cancelAuth(): void {
    if (this.currentSession) {
      logger.debug('Cancelling auth session:', this.currentSession.challengeId);
      this.currentSession = null;
    }
  }

  /**
   * Get the current authentication session (if active)
   */
  public getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  /**
   * Get all stored API keys
   */
  public async getAllApiKeys(): Promise<AnytypeApiKey[]> {
    return getAllApiKeys();
  }

  /**
   * Get the first available API key
   */
  public async getFirstApiKey(): Promise<AnytypeApiKey | undefined> {
    const keys = await this.getAllApiKeys();
    return keys[0];
  }

  /**
   * Get legacy API key from preferences (for migration)
   */
  public getLegacyApiKey(): string | undefined {
    return getNoteroPref(NoteroPref.anytypeApiKey);
  }

  /**
   * Get optional API key (either from storage or legacy prefs)
   */
  public async getOptionalApiKey(): Promise<string | undefined> {
    const storedKey = await this.getFirstApiKey();
    return storedKey?.api_key || this.getLegacyApiKey();
  }

  /**
   * Get required API key, throwing error if not available
   */
  public async getRequiredApiKey(): Promise<string> {
    const apiKey = await this.getOptionalApiKey();
    if (apiKey) return apiKey;

    throw new LocalizableError(
      'Anytype API key not available',
      'notero-error-missing-anytype-api-key',
    );
  }

  /**
   * Remove all stored API keys
   */
  public async removeAllApiKeys(): Promise<void> {
    clearNoteroPref(NoteroPref.anytypeApiKey);

    for (const key of await this.getAllApiKeys()) {
      await this.removeApiKey(key);
    }
  }

  /**
   * Remove a specific API key
   */
  public async removeApiKey(apiKey: AnytypeApiKey): Promise<void> {
    await removeApiKey(apiKey.id);
    this.eventManager.emit('anytype-connection.remove', apiKey);
  }

  /**
   * Check if Anytype is running and accessible
   */
  public async checkAnytypeAvailable(window: Window): Promise<boolean> {
    const client = createAnytypeClient(window);
    return client.checkHealth();
  }

  /**
   * Create an authenticated Anytype client
   */
  public async createClient(window: Window): Promise<AnytypeClient> {
    const apiKey = await this.getRequiredApiKey();
    return createAnytypeClient(window, apiKey);
  }
}
