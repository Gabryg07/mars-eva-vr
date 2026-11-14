# Marswalk — prova generale di un'uscita a piedi su Marte

Progetto per il NASA Space Apps Challenge 2026, sfida *Interplanetary Survival Guide: Martian Map*.

Un simulatore VR (Meta Quest 2, oppure PC) in cui un astronauta prova in anticipo una passeggiata scientifica sul fronte del delta del cratere Jezero. Il terreno e le immagini sono dati reali delle missioni NASA.

**Demo:** https://gabryg07.github.io/mars-eva-vr/

## Dati NASA usati

| Dato | Missione e strumento | Fonte |
| --- | --- | --- |
| Modello del terreno a 1 m | Mars Reconnaissance Orbiter, HiRISE | USGS Astrogeology, mosaici Mars 2020 Terrain Relative Navigation |
| Immagine ottica a 25 cm | Mars Reconnaissance Orbiter, HiRISE | USGS Astrogeology, mosaici Mars 2020 TRN |
| Terreno e immagine di contesto (20 m, 6 m) | Mars Reconnaissance Orbiter, CTX | USGS Astrogeology, mosaici Mars 2020 TRN |
| Percorso e tappe del rover | Mars 2020 Perseverance | NASA/JPL-Caltech, mappa "Where is Perseverance" |

Verifica della georeferenziazione: sulle 132 tappe del rover dentro l'area, la quota riportata dal rover e quella del nostro terreno differiscono in media di 1 cm (deviazione standard 7 cm).

## Struttura

- `app/` — applicazione WebXR (Three.js, Vite). `npm install && npm run dev`.
- `pipeline/` — script Python che scaricano e ritagliano i dati per un sito. Tutto ciò che dipende dal luogo sta in `pipeline/sites/<id>.json`: cambiando coordinate e sorgenti la stessa app funziona per un'altra zona.
- `test/` — prove automatiche con Chromium e un Quest 2 emulato (IWER).

## Uso dell'intelligenza artificiale

Il codice è stato scritto con l'assistenza di Claude (Anthropic). I dati sono esclusivamente dati NASA/USGS pubblici; nessun dato è stato generato con IA.
