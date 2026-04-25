import * as vscode from 'vscode';

const TOKEN_KEY = 'fluxdesk.jwt';

export class AuthManager {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getToken(): Promise<string | undefined> {
    return this.secrets.get(TOKEN_KEY);
  }

  async saveToken(token: string): Promise<void> {
    await this.secrets.store(TOKEN_KEY, token.trim());
  }

  async clearToken(): Promise<void> {
    await this.secrets.delete(TOKEN_KEY);
  }

  async hasToken(): Promise<boolean> {
    const t = await this.getToken();
    return typeof t === 'string' && t.length > 0;
  }
}
