// Simple logger that is disabled in production and redacts common PII
const isProd = process.env.NODE_ENV === 'production'

function redact(input: unknown): unknown {
  try {
    const str = typeof input === 'string' ? input : JSON.stringify(input)
    // Redact emails and long numeric IDs
    return str
      .replace(/([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, '[REDACTED_EMAIL]')
      .replace(/\b\d{6,}\b/g, '[REDACTED_ID]')
  } catch {
    return '[UNSERIALIZABLE]'
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProd) console.debug(...args.map(redact))
  },
  log: (...args: unknown[]) => {
    if (!isProd) console.log(...args.map(redact))
  },
  warn: (...args: unknown[]) => {
    if (!isProd) console.warn(...args.map(redact))
  },
  error: (...args: unknown[]) => {
    // Errors we keep, but still redact obvious PII
    console.error(...args.map(redact))
  }
}


