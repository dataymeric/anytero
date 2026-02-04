/**
 * Anytype API Key Storage
 *
 * Manages secure storage of Anytype API keys using Zotero's login manager.
 */

import { z } from 'zod';

import { logger } from '../utils';

const ANYTYPE_API_DOMAIN = 'anytype.local';
const ANYTYPE_API_ORIGIN = `anytype://${ANYTYPE_API_DOMAIN}`;

const anytypeApiKeySchema = z.object({
  api_key: z.string(),
  id: z.string(),
  created_date: z.string(),
}) satisfies z.ZodType<{
  api_key: string;
  id: string;
  created_date: string;
}>;

export type AnytypeApiKey = z.infer<typeof anytypeApiKeySchema>;

function getHttpRealm(keyId: string): string {
  return `anytero/${keyId}@${ANYTYPE_API_DOMAIN}`;
}

function generateKeyId(): string {
  return `key_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function buildLoginInfo(apiKey: string, keyId: string): XPCOM.nsILoginInfo {
  const nsLoginInfo = Components.Constructor(
    '@mozilla.org/login-manager/loginInfo;1',
    Components.interfaces.nsILoginInfo,
    'init',
  );

  const keyData: AnytypeApiKey = {
    api_key: apiKey,
    id: keyId,
    created_date: new Date().toISOString(),
  };

  return new nsLoginInfo(
    ANYTYPE_API_ORIGIN,
    null,
    getHttpRealm(keyId),
    keyId,
    JSON.stringify(keyData),
  );
}

async function findLogin(
  keyId: string,
): Promise<XPCOM.nsILoginInfo | undefined> {
  const logins = await Services.logins.searchLoginsAsync({
    origin: ANYTYPE_API_ORIGIN,
    httpRealm: getHttpRealm(keyId),
  });
  return logins[0];
}

export async function getAllApiKeys(): Promise<AnytypeApiKey[]> {
  const logins = await Services.logins.searchLoginsAsync({
    origin: ANYTYPE_API_ORIGIN,
  });

  return logins
    .map((login) => {
      try {
        return anytypeApiKeySchema.parse(JSON.parse(login.password));
      } catch (error) {
        logger.warn(
          'Encountered invalid login with HTTP realm:',
          login.httpRealm,
          error,
        );
        return null;
      }
    })
    .filter(Boolean);
}

export async function saveApiKey(apiKey: string): Promise<void> {
  const keyId = generateKeyId();
  const loginInfo = buildLoginInfo(apiKey, keyId);

  logger.debug('Saving new API key with ID:', keyId);
  await Services.logins.addLoginAsync(loginInfo);
}

export async function removeApiKey(keyId: string): Promise<void> {
  const existingLogin = await findLogin(keyId);

  if (existingLogin) {
    logger.debug('Removing API key with ID:', keyId);
    Services.logins.removeLogin(existingLogin);
  } else {
    logger.warn('API key not found with ID:', keyId);
  }
}
