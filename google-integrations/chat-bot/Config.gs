/**
 * Config.gs — FluxDesk Chat Bot configuration helpers
 *
 * API URL is stored in Script Properties (admin-set, shared across all users).
 * Per-user JWT tokens are stored in User Properties (each user's own storage).
 *
 * Script Properties key : FLUXDESK_API_URL
 * User Properties key   : FLUXDESK_USER_TOKEN
 */

var SCRIPT_PROP_API_URL   = 'FLUXDESK_API_URL';
var USER_PROP_TOKEN       = 'FLUXDESK_USER_TOKEN';
var DEFAULT_API_URL       = 'https://flux-desk-vpqg.vercel.app';

/**
 * Returns the configured FluxDesk API base URL.
 * Falls back to DEFAULT_API_URL if not set so the bot never hard-crashes.
 * Trailing slash is always stripped.
 */
function getApiUrl() {
  var stored = PropertiesService.getScriptProperties().getProperty(SCRIPT_PROP_API_URL);
  var url = stored || DEFAULT_API_URL;
  return url.replace(/\/$/, '');
}

/**
 * Persists the API base URL to Script Properties.
 * Can only be called by a script admin (e.g. from Apps Script IDE or a
 * one-time setup function).
 *
 * @param {string} url - Full base URL, e.g. "https://api.fluxdesk.app"
 */
function setApiUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('setApiUrl: url must be a non-empty string');
  }
  PropertiesService.getScriptProperties().setProperty(
    SCRIPT_PROP_API_URL,
    url.replace(/\/$/, '')
  );
}

/**
 * Returns the JWT access token stored for the current user, or null if not set.
 */
function getUserToken() {
  return PropertiesService.getUserProperties().getProperty(USER_PROP_TOKEN) || null;
}

/**
 * Persists the user's JWT access token in their User Properties store.
 *
 * @param {string} token - FluxDesk JWT access token
 */
function setUserToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('setUserToken: token must be a non-empty string');
  }
  PropertiesService.getUserProperties().setProperty(USER_PROP_TOKEN, token.trim());
}

/**
 * Clears the stored token for the current user (logout).
 */
function clearUserToken() {
  PropertiesService.getUserProperties().deleteProperty(USER_PROP_TOKEN);
}
