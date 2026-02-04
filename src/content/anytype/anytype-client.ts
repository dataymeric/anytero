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
    const response = await this.request<{ spaces: AnytypeSpace[] }>(
      '/v1/spaces',
      {
        method: 'GET',
      },
    );

    return response.spaces;
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
    const response = await this.request<{ objects: AnytypeObject[] }>(
      `/v1/spaces/${spaceId}/objects`,
      {
        method: 'GET',
      },
    );

    return response.objects;
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

    return this.request<AnytypeObject>(`/v1/spaces/${spaceId}/objects`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
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

    await this.request<void>(`/v1/spaces/${spaceId}/objects/${objectId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search for objects across all spaces or within a specific space
   */
  public async searchObjects(query: string, spaceId?: string): Promise<AnytypeObject[]> {
    const endpoint = spaceId 
      ? `/v1/spaces/${spaceId}/search`
      : '/v1/search';

    const response = await this.request<{ objects: AnytypeObject[] }>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify({ query }),
      },
    );

    return response.objects;
  }

  /**
   * Check if Anytype API is available
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await this.window.fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Anytype-Version': ANYTYPE_API_VERSION,
        },
      });
      return response.ok;
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
      throw new AnytypeClientError('API key not set. Please authenticate first.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      const data = await response.json();
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
