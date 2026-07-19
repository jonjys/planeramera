export type RoutinePeriod = 'daily' | 'weekly' | 'monthly'

export interface RoutineItem {
  id: string
  text: string
}

export const defaultRoutines: Record<RoutinePeriod, RoutineItem[]> = {
  daily: [
    { id: 'd1', text: 'Bädda sängen' },
    { id: 'd2', text: 'Öppna fönstren och vädra' },
    { id: 'd3', text: 'Diska' },
    { id: 'd4', text: 'Torka av bänkar och handfat' },
    { id: 'd5', text: 'Lägg tillbaka saker på sin plats' },
    { id: 'd6', text: 'Ta ut soporna om de är fulla' },
    { id: 'd7', text: 'Håll köket rent' },
  ],
  weekly: [
    { id: 'w1', text: 'Tvätta' },
    { id: 'w2', text: 'Byt lakan' },
    { id: 'w3', text: 'Städa badrummet' },
    { id: 'w4', text: 'Moppa eller dammsug golven' },
    { id: 'w5', text: 'Organisera ytorna' },
    { id: 'w6', text: 'Rengör kylskåpet' },
    { id: 'w7', text: 'Kolla efter utgången mat' },
  ],
  monthly: [
    { id: 'm1', text: 'Rengör skåpen' },
    { id: 'm2', text: 'Organisera lådorna' },
    { id: 'm3', text: 'Djuprengör ugn och spis' },
    { id: 'm4', text: 'Tvätta soptunnan' },
    { id: 'm5', text: 'Gå igenom förvarade saker' },
    { id: 'm6', text: 'Donera eller släng oanvända saker' },
  ],
}

export const defaultHabits = [
  { id: 'h1', name: 'Träning' },
  { id: 'h2', name: 'Läsning' },
  { id: 'h3', name: 'Fokusarbete' },
  { id: 'h4', name: '15 min om pengar' },
]

export const expenseCategories = [
  'Kaffe',
  'Mat',
  'Leverans',
  'Transport',
  'Streaming',
  'Nöje',
  'Övrigt',
] as const

export const pantryStaples = [
  'Ris',
  'Bönor',
  'Ägg',
  'Pasta',
  'Frysta grönsaker',
  'Frukt',
  'Fullkornsbröd',
  'Fryst protein',
  'Havregryn',
  'Yoghurt',
  'Tomatsås',
  'Kryddor',
  'Fryst vitlök',
  'Kyckling',
]

export const beforeYouGo = [
  'Kolla vad du redan har hemma',
  'Skriv en lista (och håll dig till den)',
  'Sätt en utgiftsgräns',
  'Handla aldrig hungrig',
  'Planera måltider, inte impulsköp',
  'Använd liknande ingredienser i flera måltider',
]

export interface Principle {
  icon: string
  title: string
  subtitle: string
  points: string[]
}

export const principles: Principle[] = [
  {
    icon: '🌱',
    title: 'Kaizen',
    subtitle: '1-minutersregeln',
    points: [
      'Börja med något så litet att hjärnan inte kan vägra: en armhävning, en mening, en minut.',
      'En minut idag, en bättre du imorgon.',
    ],
  },
  {
    icon: '🌅',
    title: 'Ikigai',
    subtitle: 'En anledning att vakna',
    points: [
      'Frågan är inte "vad gör du?" utan "varför går du upp?".',
      'När ditt "varför" är tydligt blir ansträngningen lättare.',
    ],
  },
  {
    icon: '🍚',
    title: 'Hara Hachi Bu',
    subtitle: 'Sluta vid 80 % mätt',
    points: [
      'Att äta för mycket sänker fokus, energi och mental skärpa.',
      'Sluta äta innan du känner dig helt mätt — håll dig aktiv och energisk.',
    ],
  },
  {
    icon: '🧘',
    title: 'Förankra ditt fokus',
    subtitle: 'Skapa en ritual',
    points: [
      'Jobba 25 minuter, ta 5 minuters paus.',
      'Upprepa en enkel ritual innan du börjar: ett djupt andetag, en kort fras.',
      'Med tiden kopplar hjärnan ritualen till djupt fokus.',
    ],
  },
  {
    icon: '🗂️',
    title: 'Seiri & Seiton',
    subtitle: 'Håll din miljö organiserad',
    points: [
      'En rörig miljö skapar mentalt brus.',
      'Stök ökar stress, sänker fokus och gör det svårare att vara produktiv.',
    ],
  },
  {
    icon: '🏺',
    title: 'Kintsugi',
    subtitle: 'Avsluta, även om det inte är perfekt',
    points: [
      'Prokrastinering döljer ofta en rädsla att misslyckas.',
      'Att avsluta bygger momentum. Klart är bättre än perfekt.',
    ],
  },
  {
    icon: '🍃',
    title: 'Wabi-Sabi',
    subtitle: 'Agera innan allt är perfekt',
    points: [
      'Vänta inte på perfekta förhållanden — börja med det du har.',
      'Mycket prokrastinering är bara rädsla förklädd till tålamod.',
    ],
  },
  {
    icon: '📊',
    title: 'Bygg ett system',
    subtitle: 'Spåra dina framsteg',
    points: [
      'Motivation ensam förändrar inte beteende.',
      'Synliga framsteg bygger konsekvens. Tydliga system skapar varaktig disciplin.',
      'Små steg, stor förändring.',
    ],
  },
]

export const moneyHabits: Principle[] = [
  {
    icon: '✍️',
    title: 'Vana 1: Skriv ner allt du spenderar',
    subtitle: 'I 30 dagar. Allt.',
    points: [
      'Kaffe, taxi, leverans, streaming — allt räknas.',
      'Du vet inte vart pengarna tar vägen förrän du skriver ner och ser.',
    ],
  },
  {
    icon: '💰',
    title: 'Vana 2: Betala dig själv först',
    subtitle: '10 % av inkomsten',
    points: [
      'Varje månad, innan du betalar en enda räkning: sätt undan 10 % till dig själv.',
      'Tjänar du 30 000? Spara 3 000. De pengarna är heliga — rör dem inte.',
    ],
  },
  {
    icon: '🎯',
    title: 'Vana 3: Sätt ett tydligt mål',
    subtitle: 'Vaga mål = vaga resultat',
    points: [
      'Säg inte "jag vill spara pengar". Säg "jag vill spara 100 000 på 2 år".',
      'Tydliga mål = du vet exakt vad du ska göra varje dag.',
    ],
  },
  {
    icon: '📈',
    title: 'Vana 5: Investera varje månad',
    subtitle: 'Konsekvens är hemligheten',
    points: [
      'Även om det bara är 500 kr. Vänta inte på "extra pengar" — den dagen kommer aldrig.',
      'Samma datum varje månad, fast belopp. Konsekvent månadssparande slår engångsinsatser.',
    ],
  },
  {
    icon: '📚',
    title: 'Vana 6: Lär dig om pengar',
    subtitle: '15 minuter om dagen',
    points: [
      'Läs en bok, se en video, lyssna på en podd.',
      '15 minuter × 365 dagar = 91 timmars lärande på ett år.',
      'Bättre kunskap = bättre beslut.',
    ],
  },
]

export const memoryTips: Principle[] = [
  {
    icon: '🧠',
    title: 'Sluta försöka minnas allt',
    subtitle: 'Din hjärna är inte ett lager',
    points: [
      'Skriv ner saker direkt. Använd påminnelser utan dåligt samvete.',
      'Lägg in möten i kalendern på en gång. Samla viktig info på ett ställe.',
      'Organisation minskar mental belastning. System fungerar bättre än motivation.',
    ],
  },
  {
    icon: '⚠️',
    title: 'Det som skadar ditt minne',
    subtitle: 'Undvik dessa',
    points: [
      'För mycket stimulans, dålig sömn och multitasking.',
      'Kronisk stress, informationsöverflöd — och att inte skriva ner saker.',
    ],
  },
]

export const focusMethods: Principle[] = [
  {
    icon: '⚡',
    title: '2-minutersregeln',
    subtitle: 'Gör det nu',
    points: [
      'Tar det mindre än 2 minuter? Gör det direkt.',
      'Låt inte småsaker samlas på hög — minska mentalt brus.',
    ],
  },
  {
    icon: '🚀',
    title: '5-sekundersregeln',
    subtitle: '5-4-3-2-1 — agera',
    points: [
      'Räkna ner 5-4-3-2-1 och sätt igång.',
      'Sluta vänta på motivation. Övervinn det första motståndet.',
    ],
  },
  {
    icon: '🐸',
    title: 'Ät grodan',
    subtitle: 'Det svåraste först',
    points: [
      'Börja med den tyngsta uppgiften.',
      'Bygg momentum för resten av dagen.',
    ],
  },
  {
    icon: '🚫',
    title: '"Inte göra"-listan',
    subtitle: 'Skydda din energi',
    points: [
      'Identifiera onödiga uppgifter. Delegera när det går.',
      'Skydda din mentala energi.',
    ],
  },
  {
    icon: '1️⃣',
    title: 'Sluta multitaska',
    subtitle: 'En sak i taget',
    points: [
      'Gör en sak i taget — minska mental trötthet och förbättra fokus.',
    ],
  },
  {
    icon: '🧩',
    title: 'Bryt ner stora uppgifter',
    subtitle: 'Mindre steg',
    points: [
      'Dela upp dem i mindre delar — minska känslan av överväldigande och gör det lättare att börja.',
    ],
  },
]
