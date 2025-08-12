import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).end();
      return;
    }
    const { model = 'gpt-5-mini', messages = [], temperature = 0.7, max_tokens } = req.body || {};

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    });

    res.json({
      text: completion.choices?.[0]?.message?.content ?? '',
      usage: completion.usage,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Server error' });
  }
}
