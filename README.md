# Planera Mera

En planerings- och utvecklingsapp som förvandlar beprövade principer till ett
dagligt verktyg — mörkt tema med guld, byggd för mobilen.

## Funktioner

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
konto.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm run build    # produktionsbygge till dist/
npm run preview  # förhandsgranska bygget
```

Byggd med React, TypeScript och Vite.
