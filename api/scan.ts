import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { MODEL, EFFORT, SCAN_PERSONA, ACTION_SCHEMA } from './_lib/agentSchema'

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  const mediaType = ALLOWED_MEDIA_TYPES.includes(match[1]) ? match[1] : 'image/jpeg'
  return { mediaType, data: match[2] }
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
  const image = body?.image as string | undefined
  const context = body?.context

  if (!image) {
    res.status(400).json({ error: 'bad_request', message: 'image saknas.' })
    return
  }
  const parsed = parseDataUrl(image)
  if (!parsed) {
    res.status(400).json({ error: 'bad_request', message: 'Ogiltigt bildformat.' })
    return
  }
  // ~7 MB gräns för att hålla requesten under Vercels bodystorlek utan hård kodning
  if (parsed.data.length > 9_500_000) {
    res.status(413).json({ error: 'too_large', message: 'Bilden är för stor — ta ett nytt foto med lägre upplösning.' })
    return
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: EFFORT,
        format: { type: 'json_schema', schema: ACTION_SCHEMA },
      },
      system: `${SCAN_PERSONA}\n\nAnvändarens aktuella data (JSON):\n${JSON.stringify(context)}`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: parsed.mediaType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: parsed.data,
              },
            },
            {
              type: 'text',
              text: 'Analysera bilden och avgör vilka åtgärder som ska utföras i appen enligt schemat.',
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    )
    if (!textBlock) {
      res.status(502).json({ error: 'no_text', message: 'Inget svar från modellen.' })
      return
    }
    res.status(200).json(JSON.parse(textBlock.text))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    res.status(500).json({ error: 'agent_error', message })
  }
}
