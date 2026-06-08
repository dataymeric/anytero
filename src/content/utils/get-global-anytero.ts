import type { Anytero, ZoteroWithAnytero } from '../anytero';

/**
 * Return the `Anytero` object from the global `Zotero` object.
 * This can be used from any script, such as the main bootstrap entrypoint and
 * the preferences window, to access global Anytero functionality.
 */
export function getGlobalAnytero(): Anytero {
  const anytero = (Zotero as ZoteroWithAnytero).Anytero;
  if (anytero) return anytero;
  throw new Error('Zotero.Anytero object not available');
}
