import type { VercelRequest } from '@vercel/node';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Buffer)
  );
}

export class BodyParseError extends Error {
  statusCode: number;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'BodyParseError';
    this.statusCode = 400;
    if (cause !== undefined) {
      // Preserve original error for logging/debugging
      (this as any).cause = cause;
    }
  }
}

export async function parseJsonBody<T extends Record<string, unknown> = Record<string, unknown>>(
  req: VercelRequest,
): Promise<T> {
  const existing = req.body;

  if (isPlainObject(existing)) {
    return existing as T;
  }

  let raw = '';

  if (typeof existing === 'string') {
    raw = existing;
  } else if (existing instanceof Buffer) {
    raw = existing.toString('utf8');
  } else {
    const chunks: Buffer[] = [];

    for await (const chunk of req) {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else if (chunk instanceof Buffer) {
        chunks.push(chunk);
      } else {
        chunks.push(Buffer.from(chunk));
      }
    }

    if (chunks.length === 0) {
      req.body = {};
      return {} as T;
    }

    raw = Buffer.concat(chunks).toString('utf8');
  }

  if (!raw.trim()) {
    req.body = {};
    return {} as T;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      throw new Error('Payload must be a JSON object');
    }
    req.body = parsed;
    return parsed as T;
  } catch (error) {
    throw new BodyParseError('Invalid JSON payload received', error);
  }
}
