/**
 * SetupFlow.gs — Token setup dialog flow for the FluxDesk Chat bot
 *
 * Google Chat interactive dialogs are triggered via card button actions.
 * The dialog collects the user's JWT token, validates it against the API,
 * then stores it in User Properties on success.
 *
 * Flow:
 *   1. User clicks "Set API Token" on the setup card
 *      → openSetupDialog() is called via onCardAction()
 *      → Returns a Dialog with a text input
 *
 *   2. User submits the dialog
 *      → handleTokenSubmit() is called via onCardAction()
 *      → Validates token against GET /api/auth/me
 *      → On success: stores token, returns success dialog
 *      → On failure: returns error dialog with retry option
 */

/**
 * Returns a Chat Dialog response containing the token input form.
 * Called when the user clicks "Set API Token".
 *
 * @returns {Object} Chat API dialog response envelope
 */
function openSetupDialog() {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: buildTokenInputCard(),
        },
      },
    },
  };
}

/**
 * Handles the token form submission.
 * Validates the token, stores it on success, or returns an error dialog.
 *
 * @param {Object} event - The card action event from Chat
 * @returns {Object} Chat API dialog response envelope
 */
function handleTokenSubmit(event) {
  var token = '';
  try {
    var inputs = event.common.formInputs;
    token = (inputs.userToken && inputs.userToken.stringInputs.value[0]) || '';
    token = token.trim();
  } catch (_) {}

  if (!token) {
    return buildDialogError('Token cannot be empty. Please paste your FluxDesk access token.');
  }

  // Validate against the live API
  var result = validateToken(token);

  if (!result.valid) {
    return buildDialogError(
      'Token validation failed: ' + (result.error || 'Unknown error') +
      '\n\nMake sure you copied the full token from FluxDesk Settings → API.'
    );
  }

  // Store the valid token
  setUserToken(token);

  var displayName = (result.user && (result.user.displayName || result.user.username)) || 'there';

  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: {
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: '<b>Connected successfully, ' + escapeHtml(displayName) + '!</b>\n\n' +
                        'Your FluxDesk account is now linked. Type <b>/help</b> to see available commands.',
                    },
                  },
                ],
              },
              {
                widgets: [
                  {
                    buttons: [
                      {
                        textButton: {
                          text: 'Done',
                          onClick: {
                            action: {
                              actionMethodName: 'dismissDialog',
                            },
                          },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },
  };
}

/**
 * Handles the token clear/logout action.
 *
 * @returns {Object} Chat API dialog response envelope
 */
function handleTokenClear() {
  clearUserToken();

  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: {
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: 'Your FluxDesk token has been removed. ' +
                        'Click "Set API Token" any time to reconnect.',
                    },
                  },
                ],
              },
              {
                widgets: [
                  {
                    buttons: [
                      {
                        textButton: {
                          text: 'Done',
                          onClick: {
                            action: {
                              actionMethodName: 'dismissDialog',
                            },
                          },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },
  };
}

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Builds the card body for the token input form.
 * @returns {Object} Card body object
 */
function buildTokenInputCard() {
  return {
    sections: [
      {
        header: 'Connect your FluxDesk account',
        widgets: [
          {
            textParagraph: {
              text: 'Paste your FluxDesk access token below.\n\n' +
                'To get your token:\n' +
                '1. Open your FluxDesk instance\n' +
                '2. Go to <b>Settings → API</b>\n' +
                '3. Copy the Access Token\n\n' +
                '<i>Your token is stored securely in Google\'s User Properties ' +
                'and is never shared with other users.</i>',
            },
          },
          {
            textInput: {
              label: 'FluxDesk Access Token',
              type: 'SINGLE_LINE',
              name: 'userToken',
              hintText: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
            },
          },
        ],
      },
      {
        widgets: [
          {
            buttons: [
              {
                textButton: {
                  text: 'Connect Account',
                  onClick: {
                    action: {
                      actionMethodName: 'handleTokenSubmit',
                    },
                  },
                },
              },
              {
                textButton: {
                  text: 'Remove Existing Token',
                  onClick: {
                    action: {
                      actionMethodName: 'handleTokenClear',
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Returns a dialog response that shows an error with a retry button.
 *
 * @param {string} message - Error message to display
 * @returns {Object} Chat API dialog response envelope
 */
function buildDialogError(message) {
  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: {
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: '<b>Setup failed</b>\n\n' + escapeHtml(message),
                    },
                  },
                ],
              },
              {
                widgets: [
                  {
                    buttons: [
                      {
                        textButton: {
                          text: 'Try Again',
                          onClick: {
                            action: {
                              actionMethodName: 'openSetupDialog',
                            },
                          },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },
  };
}
