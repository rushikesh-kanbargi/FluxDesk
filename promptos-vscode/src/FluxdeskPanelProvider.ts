import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AuthManager } from './auth';
import { callTool, validateToken } from './api';

type IncomingMessage =
  | { type: 'saveToken'; token: string }
  | { type: 'clearToken' }
  | { type: 'getSelection' }
  | { type: 'callTool'; toolId: string; inputs: Record<string, string | number> }
  | { type: 'insertText'; text: string }
  | { type: 'ready' };

export class FluxdeskPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'fluxdeskPanel';

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private readonly _auth: AuthManager;

  constructor(extensionUri: vscode.Uri, auth: AuthManager) {
    this._extensionUri = extensionUri;
    this._auth = auth;
  }

  // Called when the view becomes visible for the first time (or is restored)
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'src', 'webview'),
      ],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg: IncomingMessage) => {
      switch (msg.type) {
        case 'ready':
          await this._sendAuthState();
          break;

        case 'saveToken': {
          const { token } = msg;
          if (!token || token.trim().length === 0) {
            this._postMessage({ type: 'error', message: 'Token cannot be empty.' });
            return;
          }
          const valid = await validateToken(token.trim());
          if (!valid) {
            this._postMessage({ type: 'error', message: 'Invalid or expired token. Check your FluxDesk credentials.' });
            return;
          }
          await this._auth.saveToken(token.trim());
          this._postMessage({ type: 'authState', authenticated: true });
          break;
        }

        case 'clearToken':
          await this._auth.clearToken();
          this._postMessage({ type: 'authState', authenticated: false });
          break;

        case 'getSelection': {
          const editor = vscode.window.activeTextEditor;
          if (!editor || editor.selection.isEmpty) {
            this._postMessage({ type: 'selection', text: '' });
            return;
          }
          const text = editor.document.getText(editor.selection);
          const language = editor.document.languageId;
          this._postMessage({ type: 'selection', text, language });
          break;
        }

        case 'callTool': {
          const token = await this._auth.getToken();
          if (!token) {
            this._postMessage({ type: 'error', message: 'No token stored. Please set your API token first.' });
            return;
          }
          try {
            this._postMessage({ type: 'loading', toolId: msg.toolId });
            const output = await callTool(msg.toolId, msg.inputs, token);
            this._postMessage({ type: 'result', toolId: msg.toolId, output });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this._postMessage({ type: 'error', message });
          }
          break;
        }

        case 'insertText': {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showWarningMessage('No active editor to insert text into.');
            return;
          }
          await editor.edit((edit) => {
            if (editor.selection.isEmpty) {
              edit.insert(editor.selection.active, msg.text);
            } else {
              edit.replace(editor.selection, msg.text);
            }
          });
          break;
        }
      }
    });
  }

  /**
   * Programmatically activate this tool with pre-filled text.
   * Used by the selection-aware commands (reviewSelection, etc.).
   */
  public async activateWithSelection(toolId: string, text: string, language?: string): Promise<void> {
    await vscode.commands.executeCommand('fluxdeskPanel.focus');
    // Give the webview a moment to be ready after focusing
    await new Promise<void>((resolve) => setTimeout(resolve, 150));
    if (this._view) {
      this._view.show(true);
      this._postMessage({ type: 'prefill', toolId, text, language });
    }
  }

  private async _sendAuthState(): Promise<void> {
    const authenticated = await this._auth.hasToken();
    this._postMessage({ type: 'authState', authenticated });
  }

  private _postMessage(msg: Record<string, unknown>): void {
    if (this._view) {
      this._view.webview.postMessage(msg);
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const webviewDir = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview');

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDir, 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDir, 'style.css')
    );

    // Content-Security-Policy nonce for inline script (none needed — all JS is in main.js)
    const nonce = getNonce();

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource};
             script-src 'nonce-${nonce}' ${webview.cspSource};
             font-src ${webview.cspSource};" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>FluxDesk</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
