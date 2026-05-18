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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const auth_1 = require("./auth");
const FluxdeskPanelProvider_1 = require("./FluxdeskPanelProvider");
function activate(context) {
    const auth = new auth_1.AuthManager(context.secrets);
    const provider = new FluxdeskPanelProvider_1.FluxdeskPanelProvider(context.extensionUri, auth);
    // Register the sidebar webview provider
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(FluxdeskPanelProvider_1.FluxdeskPanelProvider.viewType, provider, { webviewOptions: { retainContextWhenHidden: true } }));
    // fluxdesk.openPanel — focus the activity bar panel
    context.subscriptions.push(vscode.commands.registerCommand('fluxdesk.openPanel', async () => {
        await vscode.commands.executeCommand('fluxdeskPanel.focus');
    }));
    // fluxdesk.reviewSelection — Code Review tool with selected text pre-filled
    context.subscriptions.push(vscode.commands.registerCommand('fluxdesk.reviewSelection', async () => {
        const { text, language } = getEditorSelection();
        if (!text) {
            vscode.window.showInformationMessage('FluxDesk: Select some code first.');
            return;
        }
        await provider.activateWithSelection('code-review', text, language);
    }));
    // fluxdesk.explainSelection — Concept Explainer tool
    context.subscriptions.push(vscode.commands.registerCommand('fluxdesk.explainSelection', async () => {
        const { text } = getEditorSelection();
        if (!text) {
            vscode.window.showInformationMessage('FluxDesk: Select some text first.');
            return;
        }
        await provider.activateWithSelection('concept-explainer', text);
    }));
    // fluxdesk.forgeSelection — PromptForge tool
    context.subscriptions.push(vscode.commands.registerCommand('fluxdesk.forgeSelection', async () => {
        const { text } = getEditorSelection();
        if (!text) {
            vscode.window.showInformationMessage('FluxDesk: Select some text first.');
            return;
        }
        await provider.activateWithSelection('forge', text);
    }));
    // fluxdesk.commitDiff — Commit Writer: staged git diff → conventional commit message
    context.subscriptions.push(vscode.commands.registerCommand('fluxdesk.commitDiff', async () => {
        // Try to get staged diff from VS Code's built-in git extension first
        let diff = await getStagedDiff();
        // Fall back to editor selection if no staged changes
        if (!diff) {
            const { text } = getEditorSelection();
            diff = text;
        }
        if (!diff) {
            vscode.window.showInformationMessage('FluxDesk: No staged changes found. Select a diff or description in the editor first.');
            return;
        }
        await provider.activateWithSelection('commit', diff);
    }));
    // fluxdesk.bugTaskSelection — Bug → Task: selected error/report → structured ticket
    context.subscriptions.push(vscode.commands.registerCommand('fluxdesk.bugTaskSelection', async () => {
        const { text } = getEditorSelection();
        if (!text) {
            vscode.window.showInformationMessage('FluxDesk: Select the bug report or error output first.');
            return;
        }
        await provider.activateWithSelection('bug-task', text);
    }));
}
function deactivate() {
    // Nothing to clean up
}
function getEditorSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
        return { text: '', language: '' };
    }
    return {
        text: editor.document.getText(editor.selection),
        language: editor.document.languageId,
    };
}
/**
 * Returns the staged git diff from VS Code's built-in git extension.
 * Returns an empty string if no staged changes exist or git is unavailable.
 */
async function getStagedDiff() {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            return '';
        }
        const api = gitExtension.exports.getAPI(1);
        const repo = api.repositories[0];
        if (!repo) {
            return '';
        }
        const diff = await repo.diff(true); // true = staged (--cached)
        return diff ?? '';
    }
    catch {
        return '';
    }
}
//# sourceMappingURL=extension.js.map