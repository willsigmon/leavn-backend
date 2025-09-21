import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BodyParseError, parseJsonBody } from './_utils';

type PassageRequestBody = {
  q?: string;
  reference?: string;
  html?: boolean;
};

function getReference(req: VercelRequest, body?: PassageRequestBody): string | undefined {
  if (typeof req.query.q === 'string' && req.query.q.trim().length > 0) {
    return req.query.q;
  }
  const candidate = body?.q ?? body?.reference;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }
  return undefined;
}

function getHtmlPreference(req: VercelRequest, body?: PassageRequestBody): boolean {
  if (typeof req.query.html === 'string') {
    return req.query.html.toLowerCase() === 'true';
  }
  if (typeof body?.html === 'boolean') {
    return body.html;
  }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    let body: PassageRequestBody | undefined;
    if (req.method === 'POST') {
      try {
        body = await parseJsonBody<PassageRequestBody>(req);
      } catch (error) {
        if (error instanceof BodyParseError) {
          res.status(error.statusCode).json({ error: error.message });
          return;
        }
        throw error;
      }
    }

    const reference = getReference(req, body);
    if (!reference) {
      res.status(400).json({ error: 'Missing query parameter "q"' });
      return;
    }

    const apiKey = process.env.ESV_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Server configuration error: ESV API key missing' });
      return;
    }

    const includeHtml = getHtmlPreference(req, body);

    const url = new URL('https://api.esv.org/v3/passage/text/');
    url.searchParams.set('q', reference);
    url.searchParams.set('include-verse-numbers', 'true');
    url.searchParams.set('include-first-verse-numbers', 'true');
    url.searchParams.set('include-passage-references', 'false');
    url.searchParams.set('include-footnotes', 'false');
    url.searchParams.set('include-footnote-body', 'false');
    url.searchParams.set('include-headings', 'false');
    url.searchParams.set('include-short-copyright', 'false');
    url.searchParams.set('include-passage-horizontal-lines', 'false');
    url.searchParams.set('include-heading-horizontal-lines', 'false');
    url.searchParams.set('horizontal-line-length', '0');
    url.searchParams.set('include-selahs', 'true');
    url.searchParams.set('indent-using', 'space');
    url.searchParams.set('indent-paragraphs', '0');
    url.searchParams.set('indent-poetry', 'true');
    url.searchParams.set('indent-poetry-lines', '0');
    url.searchParams.set('indent-declares', '0');
    url.searchParams.set('indent-psalm-doxology', '0');
    url.searchParams.set('line-length', '0');
    url.searchParams.set('include-html-formatting', includeHtml ? 'true' : 'false');

    const upstream = await fetch(url, {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error('ESV passage error', upstream.status, text);
      res.status(upstream.status).json({
        error: 'Failed to fetch ESV passage',
        status: upstream.status,
        details: safeJsonParse(text),
      });
      return;
    }

    const data = safeJsonParse(text);
    if (isPassageResponse(data)) {
      data.passages = data.passages.map(stripFootnotesFromPassage);
    }

    res.status(200).json(data);
  } catch (error: unknown) {
    console.error('ESV passage handler failed', error);
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

type PassageResponse = {
  passages: string[];
  [key: string]: unknown;
};

function isPassageResponse(value: unknown): value is PassageResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PassageResponse).passages)
  );
}

function stripFootnotesFromPassage(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/\n\s*\nFootnotes[\s\S]*$/i, '');
  cleaned = cleaned.replace(/\(\d+\)/g, '');
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\s*(?:\(ESV\))\s*$/, '');
  return cleaned.trim();
}
