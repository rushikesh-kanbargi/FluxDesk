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
exports.callTool = callTool;
exports.validateToken = validateToken;
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const vscode = __importStar(require("vscode"));
function getApiUrl() {
    const cfg = vscode.workspace.getConfiguration('fluxdesk');
    return (cfg.get('apiUrl') || 'http://localhost:4000').replace(/\/$/, '');
}
function request(opts) {
    return new Promise((resolve, reject) => {
        const baseUrl = getApiUrl();
        const url = new URL(opts.path, baseUrl);
        const isHttps = url.protocol === 'https:';
        const transport = isHttps ? https : http;
        const bodyStr = opts.body ? JSON.stringify(opts.body) : undefined;
        const reqOpts = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: opts.method,
            headers: {
                'Authorization': `Bearer ${opts.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
            },
        };
        const req = transport.request(reqOpts, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode && res.statusCode >= 400) {
                    let message = `HTTP ${res.statusCode}`;
                    try {
                        const parsed = JSON.parse(raw);
                        message = parsed.error || parsed.message || message;
                    }
                    catch {
                        // raw body is not JSON
                    }
                    reject(new Error(message));
                }
                else {
                    resolve(raw);
                }
            });
        });
        req.on('error', reject);
        if (bodyStr) {
            req.write(bodyStr);
        }
        req.end();
    });
}
/**
 * Call a FluxDesk tool. Returns the output text.
 * Endpoint: POST /api/tools/:toolId/run
 */
async function callTool(toolId, inputs, token) {
    const raw = await request({
        method: 'POST',
        path: `/api/tools/${encodeURIComponent(toolId)}/run`,
        token,
        body: inputs,
    });
    const parsed = JSON.parse(raw);
    if (typeof parsed.output !== 'string') {
        throw new Error('Unexpected response from server — no output field');
    }
    return parsed.output;
}
/**
 * Validate a JWT token by calling GET /api/auth/me.
 * Returns true if the token is valid, false otherwise.
 */
async function validateToken(token) {
    try {
        await request({ method: 'GET', path: '/api/auth/me', token });
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=api.js.map