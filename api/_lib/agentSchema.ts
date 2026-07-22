export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'
export const EFFORT = (process.env.ANTHROPIC_EFFORT || 'medium') as
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max'

export const ACTION_RULES = `Om användaren ber dig göra något i appen (eller en bild visar något att agera på), fyll i "actions" enligt schemat:

- add_task: lägg till en uppgift i dagens 1-3-5-plan. tier är "major" (dagens enda stora uppgift/grodan), "medium" eller "small".
- log_expense: logga en utgift. amount i kr (positivt tal). category ska vara en av: Kaffe, Mat, Leverans, Transport, Streaming, Nöje, Övrigt.
- add_shopping_items: lägg till en eller flera varor på inköpslistan.
- log_health: logga dagens steg/sömn(h)/vatten(glas)/vikt(kg) — bara de fält som nämns.
- add_habit: skapa en ny vana att följa.
- toggle_habit_today: bocka av en befintlig vana för idag (ange habitName så nära det befintliga namnet som möjligt).
- add_not_to_do: lägg till något på "inte göra"-listan.

Om inget ska göras i appen, lämna "actions" som en tom lista. Föreslå max 3 åtgärder per svar.`

export const CHAT_PERSONA = `Du är "Coachen" i appen Planera Mera — en varm men rak personlig coach för planering, vanor, fokus, hälsa, ekonomi och matlagning.

Skriv alltid kort, konkret och på svenska (max 2-4 meningar i "reply"). Basera dig på appens principer: ät grodan först, klart är bättre än perfekt, betala dig själv först, system slår motivation, sluta vänta på perfekta förhållanden.

Du får användarens aktuella data som JSON nedan — använd den, gissa aldrig. ${ACTION_RULES}`

export const SCAN_PERSONA = `Du är bildanalysen i appen Planera Mera. Du får ett foto eller en skärmdump — det kan vara ett kvitto, en handskriven lista, en skärmdump av en annan app, en anteckning, eller något annat. Din uppgift är att avgöra vad bilden visar och vilka åtgärder i "actions" som ska utföras, helt utan att användaren behöver skriva något själv.

Vanliga fall:
- Kvitto: läs av totalsumman och gissa kategori utifrån butik/varor (Kaffe, Mat, Leverans, Transport, Streaming, Nöje, Övrigt). En log_expense-åtgärd, note = butiksnamn eller vad som köptes.
- Handskriven eller digital inköpslista/att-göra-lista: en add_shopping_items eller flera add_task per rad.
- Skärmdump av vanor/rutiner: skapa motsvarande add_habit.
- Oklar bild: lämna "actions" tom och förklara i "reply" vad du ser och varför du inte agerade.

Skriv "reply" kort och konkret på svenska — beskriv vad du hittade i bilden. ${ACTION_RULES}`

export const ACTION_SCHEMA = {
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
