import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventManager } from '../../services/event-manager';
import type { PreferencePaneManager } from '../../services/preference-pane-manager';
import { AnytypeAuthManager } from '../anytype-auth-manager';
import * as anytypeClient from '../anytype-client';
import type { AnytypeClient } from '../anytype-client';
import * as storage from '../storage';

// Mock modules
vi.mock('../anytype-client', () => ({
  createAnytypeClient: vi.fn(),
  AnytypeClient: vi.fn(),
}));

vi.mock('../storage', () => ({
  getAllApiKeys: vi.fn(),
  saveApiKey: vi.fn(),
  removeApiKey: vi.fn(),
}));

vi.mock('../prefs/anytero-pref', () => ({
  clearAnyteroPref: vi.fn(),
  getAnyteroPref: vi.fn(),
  AnyteroPref: {
    anytypeApiKey: 'anytypeApiKey',
  },
}));

describe('AnytypeAuthManager', () => {
  let authManager: AnytypeAuthManager;
  let mockEventManager: EventManager;
  let mockPreferencePaneManager: PreferencePaneManager;
  let mockWindow: Window;
  let mockClient: {
    startAuthChallenge: ReturnType<typeof vi.fn>;
    completeAuthChallenge: ReturnType<typeof vi.fn>;
    checkHealth: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Setup mock window
    mockWindow = {} as Window;

    // Setup mock event manager
    mockEventManager = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as EventManager;

    // Setup mock preference pane manager
    mockPreferencePaneManager = {
      openPreferences: vi.fn(),
    } as unknown as PreferencePaneManager;

    // Setup mock client
    mockClient = {
      startAuthChallenge: vi.fn(),
      completeAuthChallenge: vi.fn(),
      checkHealth: vi.fn(),
    };

    // Mock the client factory
    vi.mocked(anytypeClient.createAnytypeClient).mockReturnValue(
      mockClient as unknown as AnytypeClient,
    );

    // Mock storage functions
    vi.mocked(storage.getAllApiKeys).mockResolvedValue([]);

    // Create auth manager and inject dependencies
    authManager = new AnytypeAuthManager();
    authManager.startup({
      dependencies: {
        eventManager: mockEventManager,
        preferencePaneManager: mockPreferencePaneManager,
      },
      pluginInfo: {} as never,
    });
  });

  describe('authentication flow', () => {
    it('should start auth challenge successfully', async () => {
      const challengeId = 'challenge_123';
      vi.mocked(mockClient.startAuthChallenge).mockResolvedValue({
        challenge_id: challengeId,
      });

      const challenge = await authManager.startAuth(mockWindow);

      expect(challenge.challenge_id).toBe(challengeId);
      expect(mockClient.startAuthChallenge).toHaveBeenCalledWith('Anytero');
      expect(authManager.getCurrentSession()).toEqual({
        challengeId,
        startTime: expect.any(Number),
      });
    });

    it('should complete auth and save API key', async () => {
      const challengeId = 'challenge_123';
      const apiKey = 'new_api_key_123';

      // Start auth first
      vi.mocked(mockClient.startAuthChallenge).mockResolvedValue({
        challenge_id: challengeId,
      });
      await authManager.startAuth(mockWindow);

      // Complete auth
      vi.mocked(mockClient.completeAuthChallenge).mockResolvedValue(apiKey);

      await authManager.completeAuth('1234', mockWindow);

      expect(mockClient.completeAuthChallenge).toHaveBeenCalledWith(
        challengeId,
        '1234',
      );
      expect(storage.saveApiKey).toHaveBeenCalledWith(apiKey);
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        'anytype-connection.add',
        {
          api_key: apiKey,
        },
      );
      expect(mockPreferencePaneManager.openPreferences).toHaveBeenCalled();
      expect(authManager.getCurrentSession()).toBeNull();
    });

    it('should throw error when completing auth without session', async () => {
      await expect(
        authManager.completeAuth('1234', mockWindow),
      ).rejects.toThrow();
    });

    it('should cancel auth session', async () => {
      const challengeId = 'challenge_123';
      vi.mocked(mockClient.startAuthChallenge).mockResolvedValue({
        challenge_id: challengeId,
      });

      await authManager.startAuth(mockWindow);
      authManager.cancelAuth();

      expect(authManager.getCurrentSession()).toBeNull();
    });
  });

  describe('API key management', () => {
    it('should get all API keys', async () => {
      const mockKeys = [
        { id: '1', api_key: 'key1', created_date: '2024-01-01T00:00:00.000Z' },
        { id: '2', api_key: 'key2', created_date: '2024-01-02T00:00:00.000Z' },
      ];
      vi.mocked(storage.getAllApiKeys).mockResolvedValue(mockKeys);

      const keys = await authManager.getAllApiKeys();

      expect(keys).toEqual(mockKeys);
    });

    it('should get first API key', async () => {
      const mockKey = {
        id: '1',
        api_key: 'key1',
        created_date: '2024-01-01T00:00:00.000Z',
      };
      vi.mocked(storage.getAllApiKeys).mockResolvedValue([mockKey]);

      const key = await authManager.getFirstApiKey();

      expect(key).toEqual(mockKey);
    });

    it('should get optional API key', async () => {
      const mockKey = {
        id: '1',
        api_key: 'key1',
        created_date: '2024-01-01T00:00:00.000Z',
      };
      vi.mocked(storage.getAllApiKeys).mockResolvedValue([mockKey]);

      const apiKey = await authManager.getOptionalApiKey();

      expect(apiKey).toBe('key1');
    });

    it('should throw error when getting required API key without keys', async () => {
      vi.mocked(storage.getAllApiKeys).mockResolvedValue([]);

      await expect(authManager.getRequiredApiKey()).rejects.toThrow();
    });

    it('should remove API key', async () => {
      const mockKey = {
        id: '1',
        api_key: 'key1',
        created_date: '2024-01-01T00:00:00.000Z',
      };

      await authManager.removeApiKey(mockKey);

      expect(storage.removeApiKey).toHaveBeenCalledWith('1');
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        'anytype-connection.remove',
        mockKey,
      );
    });

    it('should remove all API keys', async () => {
      const mockKeys = [
        { id: '1', api_key: 'key1', created_date: '2024-01-01T00:00:00.000Z' },
        { id: '2', api_key: 'key2', created_date: '2024-01-02T00:00:00.000Z' },
      ];
      vi.mocked(storage.getAllApiKeys).mockResolvedValue(mockKeys);

      await authManager.removeAllApiKeys();

      expect(storage.removeApiKey).toHaveBeenCalledTimes(2);
      expect(storage.removeApiKey).toHaveBeenCalledWith('1');
      expect(storage.removeApiKey).toHaveBeenCalledWith('2');
    });
  });

  describe('client creation', () => {
    it('should create authenticated client', async () => {
      const mockKey = {
        id: '1',
        api_key: 'key1',
        created_date: '2024-01-01T00:00:00.000Z',
      };
      vi.mocked(storage.getAllApiKeys).mockResolvedValue([mockKey]);

      const client = await authManager.createClient(mockWindow);

      expect(client).toBeDefined();
      expect(anytypeClient.createAnytypeClient).toHaveBeenCalledWith(
        mockWindow,
        'key1',
      );
    });

    it('should throw when creating client without API key', async () => {
      vi.mocked(storage.getAllApiKeys).mockResolvedValue([]);

      await expect(authManager.createClient(mockWindow)).rejects.toThrow();
    });
  });

  describe('health check', () => {
    it('should check if Anytype is available', async () => {
      vi.mocked(mockClient.checkHealth).mockResolvedValue(true);

      const isAvailable = await authManager.checkAnytypeAvailable(mockWindow);

      expect(isAvailable).toBe(true);
      expect(mockClient.checkHealth).toHaveBeenCalled();
    });

    it('should return false when Anytype is not available', async () => {
      vi.mocked(mockClient.checkHealth).mockResolvedValue(false);

      const isAvailable = await authManager.checkAnytypeAvailable(mockWindow);

      expect(isAvailable).toBe(false);
    });
  });
});
