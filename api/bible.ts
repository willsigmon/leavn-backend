import type { VercelRequest, VercelResponse } from '@vercel/node';

// GET /api/bible?q=John%203:16
// Proxies the ESV API to retrieve passage text. Requires `ESV_API_KEY` env var.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (!q) {
      res.status(400).json({ error: 'Missing query parameter q' });
      return;
    }

    // Build ESV API URL. See https://api.esv.org/docs/v3-passage-text/
    const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(q)}&include-verse-numbers=false&include-footnotes=false`;

    const r = await fetch(url, {
      headers: {
        // The ESV API expects the API key in the Authorization header prefixed with "Token"
        Authorization: `Token ${process.env.ESV_API_KEY}`,
      },
    });

    if (!r.ok) {
      res.status(r.status).json({ error: 'ESV API request failed' });
      return;
    }

    const data = await r.json() as any;
    // ESV API returns an object with a `passages` array. We'll return the first passage text.
    const passage = Array.isArray(data.passages) && data.passages.length > 0 ? data.passages[0] : '';

    res.json({ reference: data.canonical ?? data.query, text: passage });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error' });
  }
}
