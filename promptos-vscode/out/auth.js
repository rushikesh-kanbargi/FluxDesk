"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManager = void 0;
const TOKEN_KEY = 'fluxdesk.jwt';
class AuthManager {
    constructor(secrets) {
        this.secrets = secrets;
    }
    async getToken() {
        return this.secrets.get(TOKEN_KEY);
    }
    async saveToken(token) {
        await this.secrets.store(TOKEN_KEY, token.trim());
    }
    async clearToken() {
        await this.secrets.delete(TOKEN_KEY);
    }
    async hasToken() {
        const t = await this.getToken();
        return typeof t === 'string' && t.length > 0;
    }
}
exports.AuthManager = AuthManager;
//# sourceMappingURL=auth.js.map