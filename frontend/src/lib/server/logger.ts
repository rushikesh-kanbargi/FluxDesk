// Minimal logger for serverless — stdout captured by Vercel
const isDev = process.env.NODE_ENV !== 'production'

export const logger = {
  info: (msg: string, meta?: object) =>
    console.log(isDev ? `[info] ${msg}` : JSON.stringify({ level: 'info', msg, ...meta })),
  error: (msg: string, meta?: object) =>
    console.error(isDev ? `[error] ${msg}` : JSON.stringify({ level: 'error', msg, ...meta })),
  warn: (msg: string, meta?: object) =>
    console.warn(isDev ? `[warn] ${msg}` : JSON.stringify({ level: 'warn', msg, ...meta })),
  debug: (msg: string, meta?: object) => {
    if (isDev) console.log(`[debug] ${msg}`, meta ?? '')
  },
}
