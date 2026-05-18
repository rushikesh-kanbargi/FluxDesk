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

  // fluxdesk.commitDiff — Commit Writer: staged git diff → conventional commit message
  context.subscriptions.push(
    vscode.commands.registerCommand('fluxdesk.commitDiff', async () => {
      // Try to get staged diff from VS Code's built-in git extension first
      let diff = await getStagedDiff();

      // Fall back to editor selection if no staged changes
      if (!diff) {
        const { text } = getEditorSelection();
        diff = text;
      }

      if (!diff) {
        vscode.window.showInformationMessage(
          'FluxDesk: No staged changes found. Select a diff or description in the editor first.'
        );
        return;
      }
      await provider.activateWithSelection('commit', diff);
    })
  );

  // fluxdesk.bugTaskSelection — Bug → Task: selected error/report → structured ticket
  context.subscriptions.push(
    vscode.commands.registerCommand('fluxdesk.bugTaskSelection', async () => {
      const { text } = getEditorSelection();
      if (!text) {
        vscode.window.showInformationMessage('FluxDesk: Select the bug report or error output first.');
        return;
      }
      await provider.activateWithSelection('bug-task', text);
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

/**
 * Returns the staged git diff from VS Code's built-in git extension.
 * Returns an empty string if no staged changes exist or git is unavailable.
 */
async function getStagedDiff(): Promise<string> {
  try {
    const gitExtension = vscode.extensions.getExtension<{
      getAPI(version: 1): {
        repositories: Array<{ diff(cached: boolean): Promise<string> }>;
      };
    }>('vscode.git');
    if (!gitExtension) { return ''; }
    const api = gitExtension.exports.getAPI(1);
    const repo = api.repositories[0];
    if (!repo) { return ''; }
    const diff = await repo.diff(true); // true = staged (--cached)
    return diff ?? '';
  } catch {
    return '';
  }
}
