import * as vscode from 'vscode';
import { AuthManager } from './auth';
import { FluxdeskPanelProvider } from './FluxdeskPanelProvider';

export function activate(context: vscode.ExtensionContext): void {
  const auth = new AuthManager(context.secrets);
  const provider = new FluxdeskPanelProvider(context.extensionUri, auth);

  // Register the sidebar webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FluxdeskPanelProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // fluxdesk.openPanel — focus the activity bar panel
  context.subscriptions.push(
    vscode.commands.registerCommand('fluxdesk.openPanel', async () => {
      await vscode.commands.executeCommand('fluxdeskPanel.focus');
    })
  );

  // fluxdesk.reviewSelection — Code Review tool with selected text pre-filled
  context.subscriptions.push(
    vscode.commands.registerCommand('fluxdesk.reviewSelection', async () => {
      const { text, language } = getEditorSelection();
      if (!text) {
        vscode.window.showInformationMessage('FluxDesk: Select some code first.');
        return;
      }
      await provider.activateWithSelection('code-review', text, language);
    })
  );

  // fluxdesk.explainSelection — Concept Explainer tool
  context.subscriptions.push(
    vscode.commands.registerCommand('fluxdesk.explainSelection', async () => {
      const { text } = getEditorSelection();
      if (!text) {
        vscode.window.showInformationMessage('FluxDesk: Select some text first.');
        return;
      }
      await provider.activateWithSelection('concept-explainer', text);
    })
  );

  // fluxdesk.forgeSelection — PromptForge tool
  context.subscriptions.push(
    vscode.commands.registerCommand('fluxdesk.forgeSelection', async () => {
      const { text } = getEditorSelection();
      if (!text) {
        vscode.window.showInformationMessage('FluxDesk: Select some text first.');
        return;
      }
      await provider.activateWithSelection('forge', text);
    })
  );
}

export function deactivate(): void {
  // Nothing to clean up
}

function getEditorSelection(): { text: string; language: string } {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    return { text: '', language: '' };
  }
  return {
    text: editor.document.getText(editor.selection),
    language: editor.document.languageId,
  };
}
