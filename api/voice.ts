import type { VercelRequest, VercelResponse } from '@vercel/node';

// POST /api/voice
// Proxies ElevenLabs Text-to-Speech API. Requires `ELEVENLABS_API_KEY` env var.
export const config = {
  api: {
    // Allow up to 2 MB body (ElevenLabs can handle longer requests)
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).end();
      return;
    }

    const { text, voiceId, model = 'eleven_turbo_v2', format = 'mp3_44100_128' } = req.body || {};
    if (!text || !voiceId) {
      res.status(400).json({ error: 'Missing text or voiceId' });
      return;
    }

    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
    const r = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': String(process.env.ELEVENLABS_API_KEY),
      },
      body: JSON.stringify({ text, model_id: model, output_format: format }),
    });

    if (!r.ok || !r.body) {
      res.status(r.status || 500).json({ error: 'ElevenLabs API request failed' });
      return;
    }

    // Stream the audio response to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    const reader = (r.body as ReadableStream<Uint8Array>).getReader();
    // Write chunks as they arrive
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Note: Write buffer directly; convert Uint8Array to Buffer
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error' });
  }
}
