/**
 * ApiClient.gs — HTTP client for the FluxDesk REST API
 *
 * All requests are JSON over HTTPS (or HTTP for local dev).
 * Tokens are never logged or stored here; they're read from Config.gs at call time.
 *
 * Tool endpoint  : POST /api/tools/:toolId/run
 * Auth check     : GET  /api/auth/me
 */

/**
 * Calls a FluxDesk tool and returns the parsed response object.
 *
 * @param {string} toolId  - Tool identifier (e.g. "code-review", "forge")
 * @param {Object} inputs  - Tool-specific input fields matching the backend schema
 * @param {string} token   - User's JWT access token
 * @returns {{ output: string, usageId: string, provider: string, durationMs: number }}
 * @throws {Error} with a human-readable message on HTTP error or network failure
 */
function callTool(toolId, inputs, token) {
  var url = getApiUrl() + '/api/tools/' + encodeURIComponent(toolId) + '/run';

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token,
    },
    payload: JSON.stringify(inputs),
    muteHttpExceptions: true,
  };

  var response;
  try {
    response = UrlFetchApp.fetch(url, options);
  } catch (networkErr) {
    throw new Error('Network error reaching FluxDesk API: ' + networkErr.message);
  }

  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code === 401) {
    throw new Error('Your FluxDesk token is invalid or expired. Use /token to update it.');
  }
  if (code === 404) {
    throw new Error('Tool "' + toolId + '" is not available on this FluxDesk instance.');
  }
  if (code === 429) {
    throw new Error('Rate limit reached. Please wait a moment and try again.');
  }
  if (code < 200 || code >= 300) {
    var errMsg = 'API error ' + code;
    try {
      var parsed = JSON.parse(body);
      if (parsed.message) errMsg += ': ' + parsed.message;
      if (parsed.error)   errMsg += ': ' + parsed.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  try {
    return JSON.parse(body);
  } catch (_) {
    throw new Error('Unexpected response format from FluxDesk API.');
  }
}

/**
 * Validates a JWT token by calling GET /api/auth/me.
 *
 * @param {string} token - JWT access token to validate
 * @returns {{ valid: boolean, user: Object|null, error: string|null }}
 */
function validateToken(token) {
  var url = getApiUrl() + '/api/auth/me';

  var options = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + token,
    },
    muteHttpExceptions: true,
  };

  var response;
  try {
    response = UrlFetchApp.fetch(url, options);
  } catch (networkErr) {
    return { valid: false, user: null, error: 'Network error: ' + networkErr.message };
  }

  var code = response.getResponseCode();

  if (code === 200) {
    try {
      var user = JSON.parse(response.getContentText());
      return { valid: true, user: user, error: null };
    } catch (_) {
      return { valid: false, user: null, error: 'Invalid response from server.' };
    }
  }

  if (code === 401) {
    return { valid: false, user: null, error: 'Token is invalid or expired.' };
  }

  return { valid: false, user: null, error: 'Server returned status ' + code + '.' };
}
