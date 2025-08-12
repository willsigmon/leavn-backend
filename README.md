# leavn-backend

This repository contains a minimal Vercel Serverless Functions backend for the **Leavn** iOS app. It exposes three API endpoints to proxy vendor services so that API keys are never shipped in the client application. The endpoints are implemented as Vercel Functions written in TypeScript.

## Endpoints

| Route              | Method | Description                                           |
|--------------------|--------|-------------------------------------------------------|
| `/api/bible`       | GET    | Retrieves a Bible passage from the ESV API.           |
| `/api/voice`       | POST   | Generates speech audio via the ElevenLabs API.        |
| `/api/ai-chat`     | POST   | Sends a chat completion request to the OpenAI API.    |

All requests proxy the relevant vendor API using credentials set as environment variables (`ESV_API_KEY`, `ELEVENLABS_API_KEY`, `OPENAI_API_KEY`). Keys must be configured in your Vercel project before deployment.

## Setup & Deployment

1. Install dependencies:

```bash
npm install
```

2. Create a project on Vercel and link it locally:

```bash
vercel login
vercel link
```

Follow the prompts to select or create the `leavn-backend` project.

3. Set the required environment variables in the Vercel dashboard:

```
ESV_API_KEY=<your-esv-key>
ELEVENLABS_API_KEY=<your-elevenlabs-key>
OPENAI_API_KEY=<your-openai-key>
```

4. Deploy the functions:

```bash
vercel deploy --prod
```

After deployment, the functions will be available at your Vercel domain under the `/api` path. For example, `https://your-project.vercel.app/api/bible?q=John%203:16`.
