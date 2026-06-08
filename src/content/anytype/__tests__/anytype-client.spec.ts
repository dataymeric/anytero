import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createWindowMock } from '../../../../test/utils';
import { AnytypeClient, AnytypeClientError } from '../anytype-client';

describe('AnytypeClient', () => {
  let client: AnytypeClient;
  let mockWindow: Window;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockWindow = createWindowMock();
    mockFetch = vi.fn();
    Object.defineProperty(mockWindow, 'fetch', {
      value: mockFetch,
      writable: true,
    });
    client = new AnytypeClient('http://localhost:31009', mockWindow);
  });

  describe('authentication', () => {
    it('should start auth challenge', async () => {
      const challengeId = 'challenge_123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ challenge_id: challengeId }),
      });

      const challenge = await client.startAuthChallenge('TestApp');

      expect(challenge.challenge_id).toBe(challengeId);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:31009/v1/auth/challenges',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ app_name: 'TestApp' }),
        }),
      );
    });

    it('should complete auth challenge', async () => {
      const apiKey = 'test_api_key_123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ api_key: apiKey }),
      });

      const result = await client.completeAuthChallenge(
        'challenge_123',
        '1234',
      );

      expect(result).toBe(apiKey);
      expect(client.getApiKey()).toBe(apiKey);
      expect(client.isAuthenticated()).toBe(true);
    });

    it('should throw error on failed auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid code'),
      });

      await expect(
        client.completeAuthChallenge('challenge_123', '9999'),
      ).rejects.toThrow(AnytypeClientError);
    });
  });

  describe('spaces', () => {
    beforeEach(() => {
      client.setApiKey('test_api_key');
    });

    it('should list spaces', async () => {
      const spaces = [
        { id: 'space_1', name: 'My Space' },
        { id: 'space_2', name: 'Work Space' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ spaces }),
      });

      const result = await client.listSpaces();

      expect(result).toEqual(spaces);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:31009/v1/spaces',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_api_key',
          }),
        }),
      );
    });

    it('should get specific space', async () => {
      const space = { id: 'space_1', name: 'My Space' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(space),
      });

      const result = await client.getSpace('space_1');

      expect(result).toEqual(space);
    });
  });

  describe('objects', () => {
    beforeEach(() => {
      client.setApiKey('test_api_key');
    });

    it('should create object', async () => {
      const object = {
        id: 'obj_123',
        space_id: 'space_1',
        type_key: 'page',
        name: 'Test Object',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(object),
      });

      const result = await client.createObject('space_1', {
        type_key: 'page',
        name: 'Test Object',
      });

      expect(result).toEqual(object);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:31009/v1/spaces/space_1/objects',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should update object', async () => {
      const updatedObject = {
        id: 'obj_123',
        space_id: 'space_1',
        type_key: 'page',
        name: 'Updated Object',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(updatedObject),
      });

      const result = await client.updateObject('space_1', 'obj_123', {
        name: 'Updated Object',
      });

      expect(result.name).toBe('Updated Object');
    });

    it('should get object', async () => {
      const object = {
        id: 'obj_123',
        space_id: 'space_1',
        type_key: 'page',
        name: 'Test Object',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(object),
      });

      const result = await client.getObject('space_1', 'obj_123');

      expect(result).toEqual(object);
    });

    it('should delete object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ 'content-length': '0' }),
      });

      await expect(
        client.deleteObject('space_1', 'obj_123'),
      ).resolves.toBeUndefined();
    });
  });

  describe('health check', () => {
    it('should return true when API returns 200 OK', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await client.checkHealth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:31009/v1/spaces',
        expect.any(Object),
      );
    });

    it('should return true when API returns 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const result = await client.checkHealth();

      expect(result).toBe(true);
    });

    it('should return false when API is not available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.checkHealth();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      client.setApiKey('test_api_key');
    });

    it('should throw error when not authenticated', async () => {
      const unauthClient = new AnytypeClient(
        'http://localhost:31009',
        mockWindow,
      );

      await expect(unauthClient.listSpaces()).rejects.toThrow(
        'API key not set',
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.listSpaces()).rejects.toThrow(AnytypeClientError);
    });

    it('should handle API errors with details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () =>
          Promise.resolve(JSON.stringify({ error: 'Object not found' })),
      });

      await expect(client.getObject('space_1', 'invalid')).rejects.toThrow(
        AnytypeClientError,
      );
    });
  });
});
