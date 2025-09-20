import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { BodyParseError, parseJsonBody } from './_utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({ error: 'OpenAI API key not configured' });
      return;
    }

    const client = new OpenAI({ apiKey });

    let body: Record<string, unknown>;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      if (error instanceof BodyParseError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      throw error;
    }

    const {
      model = 'gpt-4o-mini',
      messages = [],
      temperature = 0.7,
      max_tokens,
    } = body as {
      model?: string;
      messages?: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
      temperature?: number;
      max_tokens?: number;
    };

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
    const status = e?.status ?? e?.response?.status ?? 500;
    res.status(status >= 400 && status <= 599 ? status : 500).json({ error: e?.message || 'Server error' });
  }
}
