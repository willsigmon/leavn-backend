import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BodyParseError, parseJsonBody } from './_utils';

type SearchRequestBody = {
  q?: string;
  query?: string;
  page?: number;
};

function getQuery(req: VercelRequest, body?: SearchRequestBody): string | undefined {
  if (typeof req.query.q === 'string' && req.query.q.trim().length > 0) {
    return req.query.q;
  }
  const candidate = body?.q ?? body?.query;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }
  return undefined;
}

function getPage(req: VercelRequest, body?: SearchRequestBody): number | undefined {
  const fromQuery = req.query.page;
  if (typeof fromQuery === 'string') {
    const parsed = parseInt(fromQuery, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  if (typeof body?.page === 'number' && Number.isFinite(body.page) && body.page > 0) {
    return Math.floor(body.page);
  }
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    let body: SearchRequestBody | undefined;
    if (req.method === 'POST') {
      try {
        body = await parseJsonBody<SearchRequestBody>(req);
      } catch (error) {
        if (error instanceof BodyParseError) {
          res.status(error.statusCode).json({ error: error.message });
          return;
        }
        throw error;
      }
    }

    const query = getQuery(req, body);
    if (!query) {
      res.status(400).json({ error: 'Missing query parameter "q"' });
      return;
    }

    const apiKey = process.env.ESV_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Server configuration error: ESV API key missing' });
      return;
    }

    const page = getPage(req, body) ?? 1;

    const url = new URL('https://api.esv.org/v3/passage/search/');
    url.searchParams.set('q', query);
    url.searchParams.set('page', String(page));

    const upstream = await fetch(url, {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error('ESV search error', upstream.status, text);
      res.status(upstream.status).json({
        error: 'Failed to perform ESV search',
        status: upstream.status,
        details: safeJsonParse(text),
      });
      return;
    }

    const data = safeJsonParse(text);
    res.status(200).json(data);
  } catch (error: unknown) {
    console.error('ESV search handler failed', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Unexpected server error', details: message });
  }
}

function safeJsonParse(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
