import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { BodyParseError, parseJsonBody } from './_utils';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).end();
      return;
    }

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
      model = 'gpt-5-mini',
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
    res.status(500).json({ error: e?.message || 'Server error' });
  }
}
