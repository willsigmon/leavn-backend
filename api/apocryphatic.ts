import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BodyParseError, parseJsonBody } from './_utils';

type BibliaPayload = Record<string, unknown> | undefined;

type ApocryphaRequestBody = {
  path?: string;
  payload?: BibliaPayload;
};

function buildBibliaUrl(path: string, payload: BibliaPayload, apiKey: string): URL {
  // Biblia.com endpoints typically live under api.biblia.com/v1/<path>.js
  const url = new URL(`https://api.biblia.com/v1/${path}.js`);
  url.searchParams.set('key', apiKey);

  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) {
        continue;
      }
      url.searchParams.append(key, String(value));
    }
  }

  return url;
}

function safeJsonParse(raw: string): unknown {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    let body: ApocryphaRequestBody;
    try {
      body = await parseJsonBody<ApocryphaRequestBody>(req);
    } catch (error) {
      if (error instanceof BodyParseError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      throw error;
    }

    const path = body.path?.trim();
    if (!path) {
      res.status(400).json({ error: 'Missing "path" in request body' });
      return;
    }

    const apiKey = process.env.BIBLIA_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Server configuration error: Biblia API key missing' });
      return;
    }

    const url = buildBibliaUrl(path, body.payload, apiKey);

    const upstream = await fetch(url, { method: 'GET' });
    const text = await upstream.text();

    if (!upstream.ok) {
      console.error('Biblia.com proxy failed', {
        path,
        status: upstream.status,
        body: text,
      });
      res.status(upstream.status).json({
        error: 'Failed to proxy Biblia.com request',
        status: upstream.status,
        details: safeJsonParse(text),
      });
      return;
    }

    res.status(200).json(safeJsonParse(text));
  } catch (error: unknown) {
    console.error('Apocryphatic handler error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Unexpected server error', details: message });
  }
}
