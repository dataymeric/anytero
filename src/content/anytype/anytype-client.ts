/**
 * Anytype API Client
 *
 * A TypeScript client for interacting with the Anytype local API.
 * Provides authentication, object creation, updates, and retrieval.
 */

import { logger } from '../utils';

const ANYTYPE_API_BASE_URL = 'http://localhost:31009';
const ANYTYPE_API_VERSION = '2025-11-08';

export interface AnytypeAuthChallenge {
  challenge_id: string;
}

export interface AnytypeAuthResponse {
  api_key: string;
}

export interface AnytypeIcon {
  emoji?: string;
  format?: 'emoji' | 'image';
  image?: string;
}

export interface AnytypeProperty {
  key: string;
  text?: string;
  number?: number;
  select?: string;
  multi_select?: string[];
  date?: string;
  files?: string[];
  checkbox?: boolean;
  url?: string;
  email?: string;
  phone?: string;
  objects?: string[];
}

export interface AnytypeObject {
  id: string;
  space_id: string;
  type_key: string;
  name?: string;
  body?: string;
  icon?: AnytypeIcon;
  properties?: AnytypeProperty[];
  template_id?: string;
  created_date?: string;
  last_modified_date?: string;
}

export interface CreateObjectParams {
  name?: string;
  body?: string;
  icon?: AnytypeIcon;
  properties?: AnytypeProperty[];
  template_id?: string;
  type_key: string;
}

export interface UpdateObjectParams {
  name?: string;
  body?: string;
  icon?: AnytypeIcon;
  properties?: AnytypeProperty[];
}

export interface AnytypeSpace {
  id: string;
  name: string;
  description?: string;
  icon?: AnytypeIcon;
  created_date?: string;
  last_modified_date?: string;
}

export interface AnytypeObjectType {
  id: string;
  key: string;
  name: string;
  description?: string;
  icon?: AnytypeIcon;
  properties?: {
    key: string;
    name: string;
    type: string;
  }[];
}

export class AnytypeClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'AnytypeClientError';
  }
}

export class AnytypeClient {
  private baseUrl: string;
  private apiKey: string | null = null;
  private window: Window;

  constructor(baseUrl: string = ANYTYPE_API_BASE_URL, window: Window) {
    this.baseUrl = baseUrl;
    this.window = window;
  }

  /**
   * Set the API key for authentication
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get the current API key
   */
  public getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Check if the client is authenticated
   */
  public isAuthenticated(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Initiate authentication challenge
   * This will display a 4-digit code in the Anytype desktop app
   *
   * @param appName The name of your application
   * @returns Challenge ID to be used for completing authentication
   */
  public async startAuthChallenge(
    appName: string = 'Anytero',
  ): Promise<AnytypeAuthChallenge> {
    logger.debug('Starting Anytype auth challenge for app:', appName);

    const response = await this.request<AnytypeAuthChallenge>(
      '/v1/auth/challenges',
      {
        method: 'POST',
        body: JSON.stringify({ app_name: appName }),
        requiresAuth: false,
      },
    );

    logger.debug('Auth challenge started:', response.challenge_id);
    return response;
  }

  /**
   * Complete authentication by providing the challenge ID and 4-digit code
   *
   * @param challengeId The challenge ID from startAuthChallenge
   * @param code The 4-digit code shown in Anytype desktop app
   * @returns API key to be used for future requests
   */
  public async completeAuthChallenge(
    challengeId: string,
    code: string,
  ): Promise<string> {
    logger.debug('Completing auth challenge:', challengeId);

    const response = await this.request<AnytypeAuthResponse>(
      '/v1/auth/api_keys',
      {
        method: 'POST',
        body: JSON.stringify({
          challenge_id: challengeId,
          code,
        }),
        requiresAuth: false,
      },
    );

    this.apiKey = response.api_key;
    logger.debug('Authentication successful');
    return response.api_key;
  }

  /**
   * List all available spaces
   */
  public async listSpaces(): Promise<AnytypeSpace[]> {
    const response = await this.request<
      | { data?: AnytypeSpace[]; pagination?: unknown }
      | { spaces?: AnytypeSpace[] }
      | AnytypeSpace[]
    >('/v1/spaces', {
      method: 'GET',
    });

    logger.debug('listSpaces response:', response);

    // Check if response is an array (some APIs return arrays directly)
    if (Array.isArray(response)) {
      logger.debug('Response is a direct array of spaces');
      return response;
    }

    // Check if response is an object with data property (Anytype API format)
    if (response && typeof response === 'object' && 'data' in response) {
      const data = response.data;
      if (!data || !Array.isArray(data)) {
        logger.warn('Data property exists but is not an array:', data);
        return [];
      }
      logger.debug(`Found ${data.length} spaces in data property`);
      return data;
    }

    // Check if response is an object with spaces property (legacy format)
    if (response && typeof response === 'object' && 'spaces' in response) {
      const spaces = response.spaces;
      if (!spaces || !Array.isArray(spaces)) {
        logger.warn('Spaces property exists but is not an array:', spaces);
        return [];
      }
      return spaces;
    }

    logger.warn('Unexpected response format from /v1/spaces:', response);
    return [];
  }

  /**
   * Get a specific space by ID
   */
  public async getSpace(spaceId: string): Promise<AnytypeSpace> {
    return this.request<AnytypeSpace>(`/v1/spaces/${spaceId}`, {
      method: 'GET',
    });
  }

  /**
   * Create a new space
   */
  public async createSpace(
    name: string,
    description?: string,
  ): Promise<AnytypeSpace> {
    return this.request<AnytypeSpace>('/v1/spaces', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  /**
   * List objects in a space
   */
  public async listObjects(spaceId: string): Promise<AnytypeObject[]> {
    const response = await this.request<
      { data?: AnytypeObject[]; objects?: AnytypeObject[] }
    >(`/v1/spaces/${spaceId}/objects`, {
      method: 'GET',
    });

    // Check for 'data' property first (Anytype API format)
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    // Fallback to 'objects' property (legacy format)
    return response.objects || [];
  }

  /**
   * List all object types available in a space
   * Falls back to extracting types from existing objects if the types endpoint doesn't exist
   */
  public async listObjectTypes(spaceId: string): Promise<AnytypeObjectType[]> {
    logger.debug('Fetching object types for space:', spaceId);

    try {
      // Try the types endpoint first
      const response = await this.request<{
        data?: AnytypeObjectType[];
        types?: AnytypeObjectType[];
      }>(`/v1/spaces/${spaceId}/types`);

      // Handle both response formats
      if (response && typeof response === 'object') {
        if ('data' in response && Array.isArray(response.data)) {
          logger.debug('Found', response.data.length, 'types in data property');
          return response.data;
        }
        if ('types' in response && Array.isArray(response.types)) {
          logger.debug('Found', response.types.length, 'types in types property');
          return response.types;
        }
      }

      logger.warn('Unexpected response format from listObjectTypes, trying fallback');
    } catch (error) {
      logger.warn('Types endpoint failed, falling back to extracting from objects:', error);
    }

    // Fallback: Extract unique types from existing objects
    try {
      const objects = await this.listObjects(spaceId);
      const typeMap = new Map<string, AnytypeObjectType>();

      // Extract unique types
      for (const obj of objects) {
        if (obj.type_key && !typeMap.has(obj.type_key)) {
          typeMap.set(obj.type_key, {
            id: obj.type_key,
            key: obj.type_key,
            name: obj.type_key.charAt(0).toUpperCase() + obj.type_key.slice(1),
          });
        }
      }

      const extractedTypes = Array.from(typeMap.values());
      logger.debug('Extracted', extractedTypes.length, 'types from objects');

      // Add common built-in types if not already present
      const builtInTypes = [
        { id: 'page', key: 'page', name: 'Page' },
        { id: 'note', key: 'note', name: 'Note' },
        { id: 'task', key: 'task', name: 'Task' },
      ];

      for (const builtIn of builtInTypes) {
        if (!typeMap.has(builtIn.key)) {
          extractedTypes.push(builtIn);
        }
      }

      return extractedTypes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (fallbackError) {
      logger.error('Failed to extract types from objects:', fallbackError);
      // Last resort: return common built-in types
      return [
        { id: 'page', key: 'page', name: 'Page' },
        { id: 'note', key: 'note', name: 'Note' },
        { id: 'task', key: 'task', name: 'Task' },
      ];
    }
  }

  /**
   * Get a specific object by ID
   */
  public async getObject(
    spaceId: string,
    objectId: string,
  ): Promise<AnytypeObject> {
    return this.request<AnytypeObject>(
      `/v1/spaces/${spaceId}/objects/${objectId}`,
      {
        method: 'GET',
      },
    );
  }

  /**
   * Create a new object in a space
   */
  public async createObject(
    spaceId: string,
    params: CreateObjectParams,
  ): Promise<AnytypeObject> {
    logger.debug('Creating object in space:', spaceId, params);

    const response = await this.request<{ object?: AnytypeObject } | AnytypeObject>(
      `/v1/spaces/${spaceId}/objects`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    );

    // Handle wrapped response format
    if (response && typeof response === 'object' && 'object' in response && response.object) {
      return response.object;
    }

    // Handle direct object response
    return response as AnytypeObject;
  }

  /**
   * Update an existing object
   */
  public async updateObject(
    spaceId: string,
    objectId: string,
    params: UpdateObjectParams,
  ): Promise<AnytypeObject> {
    logger.debug('Updating object:', objectId, 'in space:', spaceId, params);

    return this.request<AnytypeObject>(
      `/v1/spaces/${spaceId}/objects/${objectId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      },
    );
  }

  /**
   * Delete an object
   */
  public async deleteObject(spaceId: string, objectId: string): Promise<void> {
    logger.debug('Deleting object:', objectId, 'in space:', spaceId);

    await this.request<Record<string, never>>(`/v1/spaces/${spaceId}/objects/${objectId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search for objects across all spaces or within a specific space
   */
  public async searchObjects(
    query: string,
    spaceId?: string,
  ): Promise<AnytypeObject[]> {
    const endpoint = spaceId ? `/v1/spaces/${spaceId}/search` : '/v1/search';

    const response = await this.request<{
      data?: AnytypeObject[];
      objects?: AnytypeObject[];
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });

    // Check for 'data' property first (Anytype API format)
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    // Fallback to 'objects' property (legacy format)
    return response.objects || [];
  }

  /**
   * Check if Anytype API is available
   *
   * Since Anytype doesn't have a dedicated /health endpoint, we check
   * if the API server is reachable by making a request to /v1/spaces.
   * A 401 Unauthorized response indicates the server is running (just not authenticated).
   * Any successful response (2xx) also indicates the server is running.
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await this.window.fetch(`${this.baseUrl}/v1/spaces`, {
        method: 'GET',
        headers: {
          'Anytype-Version': ANYTYPE_API_VERSION,
        },
      });
      // 401 means server is running but we're not authenticated - that's fine for health check
      // Any 2xx response also indicates server is running
      return response.ok || response.status === 401;
    } catch (error) {
      logger.warn('Anytype API health check failed:', error);
      return false;
    }
  }

  /**
   * Internal request method
   */
  private async request<T>(
    endpoint: string,
    options: {
      method: string;
      body?: string;
      requiresAuth?: boolean;
    } = { method: 'GET', requiresAuth: true },
  ): Promise<T> {
    const { method, body, requiresAuth = true } = options;

    if (requiresAuth && !this.apiKey) {
      throw new AnytypeClientError(
        'API key not set. Please authenticate first.',
      );
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Anytype-Version': ANYTYPE_API_VERSION,
    };

    if (requiresAuth && this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    logger.debug(`Making ${method} request to:`, url);

    try {
      const response = await this.window.fetch(url, {
        method,
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: unknown;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = errorText;
        }

        logger.error('Anytype API error:', response.status, errorData);
        throw new AnytypeClientError(
          `API request failed: ${response.statusText}`,
          response.status,
          errorData,
        );
      }

      // Handle empty responses (e.g., DELETE)
      if (
        response.status === 204 ||
        response.headers.get('content-length') === '0'
      ) {
        return undefined as T;
      }

      const data = await response.json();
      logger.debug(`Response data from ${endpoint}:`, JSON.stringify(data).substring(0, 500));
      return data as T;
    } catch (error) {
      if (error instanceof AnytypeClientError) {
        throw error;
      }

      logger.error('Network error:', error);
      throw new AnytypeClientError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

/**
 * Create a new Anytype client instance
 */
export function createAnytypeClient(
  window: Window,
  apiKey?: string,
  baseUrl?: string,
): AnytypeClient {
  const client = new AnytypeClient(baseUrl, window);
  if (apiKey) {
    client.setApiKey(apiKey);
  }
  return client;
}
