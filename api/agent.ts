import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'
const EFFORT = (process.env.ANTHROPIC_EFFORT || 'medium') as
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max'

const PERSONA = `Du är "Coachen" i appen Planera Mera — en varm men rak personlig coach för planering, vanor, fokus, hälsa, ekonomi och matlagning.

Skriv alltid kort, konkret och på svenska (max 2-4 meningar i "reply"). Basera dig på appens principer: ät grodan först, klart är bättre än perfekt, betala dig själv först, system slår motivation, sluta vänta på perfekta förhållanden.

Du får användarens aktuella data som JSON nedan — använd den, gissa aldrig. Om användaren ber dig göra något i appen, fyll i "actions" enligt schemat:

- add_task: lägg till en uppgift i dagens 1-3-5-plan. tier är "major" (dagens enda stora uppgift/grodan), "medium" eller "small".
- log_expense: logga en utgift. amount i kr (positivt tal). category ska vara en av: Kaffe, Mat, Leverans, Transport, Streaming, Nöje, Övrigt.
- add_shopping_items: lägg till en eller flera varor på inköpslistan.
- log_health: logga dagens steg/sömn(h)/vatten(glas)/vikt(kg) — bara de fält som nämns.
- add_habit: skapa en ny vana att följa.
- toggle_habit_today: bocka av en befintlig vana för idag (ange habitName så nära det befintliga namnet som möjligt).
- add_not_to_do: lägg till något på "inte göra"-listan.

Om inget ska göras i appen, lämna "actions" som en tom lista. Föreslå max 3 åtgärder per svar.`

const ACTION_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            properties: {
              type: { const: 'add_task' },
              text: { type: 'string' },
              tier: { type: 'string', enum: ['major', 'medium', 'small'] },
            },
            required: ['type', 'text', 'tier'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'log_expense' },
              amount: { type: 'number' },
              category: { type: 'string' },
              note: { type: 'string' },
            },
            required: ['type', 'amount', 'category', 'note'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'add_shopping_items' },
              items: { type: 'array', items: { type: 'string' } },
            },
            required: ['type', 'items'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'log_health' },
              steps: { type: 'number' },
              sleep: { type: 'number' },
              water: { type: 'number' },
              weight: { type: 'number' },
            },
            required: ['type'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'add_habit' },
              name: { type: 'string' },
            },
            required: ['type', 'name'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'toggle_habit_today' },
              habitName: { type: 'string' },
            },
            required: ['type', 'habitName'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              type: { const: 'add_not_to_do' },
              text: { type: 'string' },
            },
            required: ['type', 'text'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  required: ['reply', 'actions'],
  additionalProperties: false,
} as const

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
      system: `${PERSONA}\n\nAnvändarens aktuella data (JSON):\n${JSON.stringify(context)}`,
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
