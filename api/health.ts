import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.status(200).json({ status: 'ok' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'server error' });
  }
}
