import * as https from 'https';
import * as http from 'http';
import * as vscode from 'vscode';

function getApiUrl(): string {
  const cfg = vscode.workspace.getConfiguration('fluxdesk');
  return (cfg.get<string>('apiUrl') || 'http://localhost:3000').replace(/\/$/, '');
}

interface RequestOptions {
  method: 'GET' | 'POST';
  path: string;
  token: string;
  body?: Record<string, unknown>;
}

function request(opts: RequestOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const baseUrl = getApiUrl();
    const url = new URL(opts.path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    const bodyStr = opts.body ? JSON.stringify(opts.body) : undefined;

    const reqOpts: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: opts.method,
      headers: {
        'Authorization': `Bearer ${opts.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-FluxDesk-Client': 'vscode',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = transport.request(reqOpts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode && res.statusCode >= 400) {
          let message = `HTTP ${res.statusCode}`;
          try {
            const parsed = JSON.parse(raw) as { error?: string; message?: string };
            message = parsed.error || parsed.message || message;
          } catch {
            // raw body is not JSON
          }
          reject(new Error(message));
        } else {
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
export async function callTool(
  toolId: string,
  inputs: Record<string, string | number>,
  token: string
): Promise<string> {
  const raw = await request({
    method: 'POST',
    path: `/api/tools/${encodeURIComponent(toolId)}/run`,
    token,
    body: inputs as Record<string, unknown>,
  });

  const parsed = JSON.parse(raw) as { output?: string };
  if (typeof parsed.output !== 'string') {
    throw new Error('Unexpected response from server — no output field');
  }
  return parsed.output;
}

/**
 * Validate a JWT token by calling GET /api/auth/me.
 * Returns true if the token is valid, false otherwise.
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    await request({ method: 'GET', path: '/api/auth/me', token });
    return true;
  } catch {
    return false;
  }
}
