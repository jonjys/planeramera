import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { MODEL, EFFORT, CHAT_PERSONA, ACTION_SCHEMA } from './_lib/agentSchema'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({
      error: 'missing_api_key',
      message:
        'ANTHROPIC_API_KEY saknas. Lägg till den under Vercel-projektets Settings → Environment Variables och deploya om.',
    })
    return
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const messages = body?.messages as ChatMessage[] | undefined
  const context = body?.context

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'bad_request', message: 'messages saknas.' })
    return
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: EFFORT,
        format: { type: 'json_schema', schema: ACTION_SCHEMA },
      },
      system: `${CHAT_PERSONA}\n\nAnvändarens aktuella data (JSON):\n${JSON.stringify(context)}`,
      messages,
    })

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    )
    if (!textBlock) {
      res.status(502).json({ error: 'no_text', message: 'Inget svar från modellen.' })
      return
    }
    const parsed = JSON.parse(textBlock.text)
    res.status(200).json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    res.status(500).json({ error: 'agent_error', message })
  }
}
