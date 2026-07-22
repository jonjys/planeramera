# Planera Mera

En planerings- och utvecklingsapp som förvandlar beprövade principer till ett
dagligt verktyg — mörkt tema med guld, byggd för mobilen.

## Funktioner

- **Onboarding** — välkomstflöde med namn och valbart startpaket.
- **XP & nivåer** — poäng för klara uppgifter, vanor, rutiner, fokuspass och
  reflektioner; nivåbadge i sidhuvudet.
- **Profil** — nivå och XP, veckans siffror, aktivitets-heatmap (12 veckor),
  utmärkelser, vilka paket du följer och säkerhetskopiering.
- **Utforska** — skapa delningspaket av dina listor och följ andras via länk;
  fyra inbyggda kreatörspaket.
- **Kvällsreflektion** — betygsätt dagen och skriv ner vad som gick bra.

- **Idag** — dagsplan enligt 1-3-5-regeln (1 stor, 3 mellanstora, 5 små
  uppgifter), "ät grodan först", snabböversikt av rutiner och vanor.
- **Rutiner** — minsta hemrutin som checklistor: dagligt, veckovis och
  månadsvis. Nollställs automatiskt varje dag / måndag / den 1:a.
- **Vanor** — vanetracker med veckorutnät och streaks 🔥.
- **Fokus** — Pomodoro-timer (25/5, lång paus efter 4 rundor), fokusritual,
  2-minutersregeln, 5-sekundersregeln m.m.
- **Ekonomi** — utgiftslogg med 30-dagarsutmaningen, kategorifördelning,
  "betala dig själv först"-kalkylator och tydliga sparmål med progress.
- **Inköp** — inköpslista med snabbval för prisvärda basvaror,
  "innan du går"-checklista och tysta pengaläckor.
- **Guide** — 8 japanska principer mot lathet, penningvanor och minnestips
  som referenskort.

All data sparas lokalt i webbläsaren (localStorage) — ingen backend, inget
konto. Undantaget är **AI-Coachen** (se nedan), som kräver en liten
serverfunktion för att prata med Claude.

## 📷 Kvittoskanner — noll skrivande

Tryck ✨ → 📷, fota ett kvitto (eller vilken skärmdump som helst), och Claudes
bildseende (`api/scan.ts`) läser av summa, butik och kategori automatiskt och
loggar utgiften — ingen kategori att välja, inget belopp att skriva. Funkar
även på skärmdumpar av att-göra-listor eller andra appars vy. Delar backend
och action-schema med AI-Coachen (`api/_lib/agentSchema.ts`).

## AI-Coach 🤖

En riktig konversations-agent byggd på Claude API (Vercel-serverfunktion i
`api/agent.ts`). Den ser din aktuella data (dagsplan, vanor, ekonomi, hälsa)
och kan både svara på frågor och agera åt dig — logga en utgift, lägga till
en uppgift, handla in, bocka av en vana — genom ett strukturerat JSON-svar
(`{reply, actions}`) som körs lokalt i din webbläsare. Ingen data lagras
på servern; anropet går direkt till Anthropics API och tillbaka.

**Kräver en miljövariabel i Vercel-projektet:**

```
ANTHROPIC_API_KEY=din-api-nyckel
```

Lägg till den under Vercel → ditt projekt → Settings → Environment
Variables, och deploya om. Skaffa en nyckel på
[console.anthropic.com](https://console.anthropic.com).

Valfria miljövariabler:

```
ANTHROPIC_MODEL=claude-opus-4-8   # standard — byt t.ex. till claude-haiku-4-5 för lägre kostnad
ANTHROPIC_EFFORT=medium           # low | medium | high | xhigh | max
```

Standardmodellen är Claude Opus 4.8 — Anthropics mest kapabla modell, vilket
även är den dyraste. För en hobbyapp med låg trafik är kostnaden marginell,
men om du vill sänka den går det bra att sätta `ANTHROPIC_MODEL=claude-haiku-4-5`
för snabbare och billigare svar.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm run build    # produktionsbygge till dist/
npm run preview  # förhandsgranska bygget
```

Byggd med React, TypeScript och Vite.
