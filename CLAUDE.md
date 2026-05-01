# PULA of Dracula — Context proiect

## Ce e proiectul
Memecoin românesc pe Solana. Site la pulaofdracula.fun.
Token: B8a7twkUV1fnB317PxihGXsE9XKbyGgfxNUBwicwpump

## Versiune curentă
v131

## Structură importantă
- `index.html` — pagina principală
- `manifest.json` — PWA config
- `traista/` — directorul C.U.R. Wallet (PWA)
- `traista/assets_v75/index-cbJp19NE.js` — INTERZIS la citire (780KB minificat)

## Convenții
- Versiunile cresc la deploy: v131 → v132 → ...
- Nume noi de asset-uri la fiecare build (cache busting)
- Site live se deployează din branch-ul main

## Status curent
- C.U.R. Wallet PWA instalabil ✓
- Preț PULA live din DexScreener ✓
- V.U.L.V.A. și L.I.M.B.A. descrise ✓
- Vârful PULA hardcoded ✓
- Jertfa 1 SOL definită narrativ ✓

## În lucru
- Fix PWA icon: fundal alb → transparent
- Fix PWA splash title: "C.U.R. Wallet - PULA of Dracula" → "C.U.R. Wallet"
- Fix PWA icon: tăiat jos → necropat

## Workflow
Stefan (viziune) → Claudiu pe web (strategie + prompt-uri) 
→ CLIffy (execuție) → Stefan aprobă

## Reguli specifice acestui proiect
- Mereu testează PWA după modificări (manifest.json valid)
- La modificări la /traista/ verifică că service worker-ul 
  se reînregistrează corect
- NU atinge bundle-ul minificat — modifică sursele și rebuild
