"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FluxdeskPanelProvider = void 0;
const vscode = __importStar(require("vscode"));
const api_1 = require("./api");
class FluxdeskPanelProvider {
    constructor(extensionUri, auth) {
        this._extensionUri = extensionUri;
        this._auth = auth;
    }
    // Called when the view becomes visible for the first time (or is restored)
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'src', 'webview'),
            ],
        };
        webviewView.webview.html = this._getHtml(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (msg) => {
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
                    const valid = await (0, api_1.validateToken)(token.trim());
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
                        const output = await (0, api_1.callTool)(msg.toolId, msg.inputs, token);
                        this._postMessage({ type: 'result', toolId: msg.toolId, output });
                    }
                    catch (err) {
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
                        }
                        else {
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
    async activateWithSelection(toolId, text, language) {
        await vscode.commands.executeCommand('fluxdeskPanel.focus');
        // Give the webview a moment to be ready after focusing
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (this._view) {
            this._view.show(true);
            this._postMessage({ type: 'prefill', toolId, text, language });
        }
    }
    async _sendAuthState() {
        const authenticated = await this._auth.hasToken();
        this._postMessage({ type: 'authState', authenticated });
    }
    _postMessage(msg) {
        if (this._view) {
            this._view.webview.postMessage(msg);
        }
    }
    _getHtml(webview) {
        const webviewDir = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview');
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, 'style.css'));
        // Content-Security-Policy nonce for inline script (none needed — all JS is in main.js)
        const nonce = getNonce();
        return /* html */ `<!DOCTYPE html>
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
exports.FluxdeskPanelProvider = FluxdeskPanelProvider;
FluxdeskPanelProvider.viewType = 'fluxdeskPanel';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=FluxdeskPanelProvider.js.map