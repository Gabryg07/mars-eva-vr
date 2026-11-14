// Wrist panel (legend of the active data layer, weather, controls) and the "data and sources" board.
// Everything shown here is read from the site file, so a new site brings its own credits.
import * as THREE from 'three';
import { Panel, rrect, text, wrap } from './ui.js';

export class Wrist {
  constructor(app) {
    this.app = app; this.panel = new Panel(0.26, 0.17, 2600, { depthTest: true }); const m = this.panel.mesh; m.visible = false;
    m.position.set(0, 0.1, 0.03); m.rotation.x = -0.85; this.dom = document.getElementById('legend'); this.draw();
  }
  attach() { const h = this.app.player.hands.left, m = this.panel.mesh; if (h && m.parent !== h) { h.add(m); m.visible = true; } else if (!h && m.parent) { m.parent.remove(m); m.visible = false; } }
  draw() {
    const { app } = this, L = app.LAYERS[app.layer], w = app.site.weather, track = app.shared.uTrackOn.value > 0.5;
    this.panel.draw((c, W, H) => {
      rrect(c, 3, 3, W - 6, H - 6, 22); c.fillStyle = 'rgba(14,9,6,0.88)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(255,170,110,0.8)'; c.stroke();
      text(c, 'LIVELLO DATI', 26, 42, 20, '#ffb37a', 600); text(c, `${app.layer + 1}/${app.LAYERS.length}`, W - 26, 42, 20, '#d9c4b2', 500, 'right');
      text(c, L.name, 26, 86, 38, '#fff', 700); text(c, L.src, 26, 116, 20, '#d9c4b2');
      let y = 152; for (const [col, label] of L.legend) { if (!label) continue; c.fillStyle = col; rrect(c, 26, y - 18, 34, 22, 5); c.fill(); text(c, label, 72, y, 23, '#fff'); y += 30; }
      if (!L.legend.length) { y = wrap(c, 'Linea azzurra: percorso sicuro. Fasci di luce: tappe.' + (track ? ' Linea bianca: traccia reale di Perseverance.' : ''), 26, y, W - 52, 23, 30, '#fff'); }
      else { if (L.note) y = wrap(c, L.note, 26, y + 2, W - 52, 21, 27, '#d9c4b2'); if (track) text(c, 'Linea bianca: traccia reale di Perseverance', 26, y, 21, '#fff'); }
      const by = H - 78; c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(22, by - 30, W - 44, 2);
      if (w) text(c, `Meteo MEDA sol ${w.sol}: ${Math.round(w.min_temp)} / ${Math.round(w.max_temp)} °C · ${Math.round(w.pressure)} Pa`, 26, by, 21, '#7fe0ff', 600);
      text(c, 'A livello · B traccia rover · X fonti dei dati · Y ricomincia', 26, by + 32, 20, '#d9c4b2'); text(c, 'stick sx cammina · stick dx teletrasporto e rotazione', 26, by + 58, 20, '#d9c4b2');
    });
    if (this.dom) this.dom.innerHTML = `<b>${L.name}</b><small>${L.src}</small>` + L.legend.filter(l => l[1]).map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('') +
      (track ? '<span><i style="background:#fff"></i>traccia reale di Perseverance</span>' : '') + '<span><i style="background:#33e6ff"></i>percorso sicuro</span>';
  }
}

export class Credits {
  constructor(app) {
    this.app = app; this.panel = new Panel(2.6, 2.3, 1280 / 2.6, { depthTest: false }); this.panel.mesh.visible = false; this.panel.mesh.renderOrder = 150; app.scene.add(this.panel.mesh);
    const s = app.site, m = s.mission, w = s.weather, g = s.georefCheck, rows = [
      ['Immagine', 'Ortomosaico MRO HiRISE 25 cm/pixel e CTX 6 m/pixel (mosaici «Mars 2020 Terrain Relative Navigation», USGS Astrogeology)', 'NASA/JPL-Caltech/University of Arizona/MSSS/USGS'],
      ['Topografia', 'Modello del terreno HiRISE 1 m e CTX 20 m; pendenze e quote calcolate da questi' + (g ? `. Verifica: su ${g.n} posizioni del rover lo scarto in quota è ${Math.abs(g.meanDz).toFixed(2).replace('.', ',')} ± ${g.stdDz.toFixed(2).replace('.', ',')} m` : ''), 'NASA/JPL-Caltech/University of Arizona/USGS'],
      ['Rover', 'Posizioni sol per sol e traccia di Perseverance (localizzazione ufficiale Mars 2020); foto dalle immagini raw di Mastcam-Z e Navcam', 'NASA/JPL-Caltech/ASU'],
      ...(s.overlays?.minerals ? [['Minerali', `Spettrometro CRISM di MRO, osservazione FRT00005C5E a 18 m/pixel: indici di olivina, argille e carbonati (Viviano-Beck et al. 2014). Riallineato all'immagine CTX per correlazione: corretto uno scarto di ${Math.round(Math.hypot(...(s.overlays.minerals.shiftM || [0, 0])))} m`, 'NASA/JPL-Caltech/JHUAPL']] : []),
      ...(s.overlays?.thermal ? [['Infrarosso', 'Mosaico notturno THEMIS di Mars Odyssey, 100 m/pixel: quanto il suolo trattiene il calore, cioè roccia compatta oppure sabbia', 'NASA/JPL-Caltech/Arizona State University']] : []),
      ['Meteo', w ? `Stazione MEDA di Perseverance, sol ${w.sol}: da ${Math.round(w.min_temp)} a ${Math.round(w.max_temp)} °C, ${Math.round(w.pressure)} Pa, tramonto alle ${String(w.sunset).slice(0, 5)}` : 'Stazione MEDA di Perseverance', 'NASA/JPL-Caltech/CAB (CSIC-INTA)'],
      ['Radiazioni', `${String(m.radiation.mSvPerDay).replace('.', ',')} mSv al giorno in superficie, misurati da Curiosity RAD nel cratere Gale (Hassler et al., Science 2014): valore di riferimento, a Jezero non c'è un rivelatore`, 'NASA/JPL-Caltech/SwRI'],
      ['Modello', `Passo: funzione di Tobler scalata a ${String(m.walk.flatSpeed).replace('.', ',')} m/s in piano. Ossigeno: lavoro metabolico con tuta (${m.metabolic.massKg} kg, gravità ${String(m.gravity).replace('.', ',')} m/s²), riserva del ${Math.round(m.oxygen.reserveFraction * 100)}%. Limiti di pendenza ${m.slopeLimitsDeg.join('°, ')}°. Sono ipotesi nostre, modificabili nel file del sito.`, 'Squadra'],
    ];
    this.panel.draw((c, W, H) => {
      rrect(c, 4, 4, W - 8, H - 8, 30); c.fillStyle = 'rgba(14,9,6,0.94)'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#ffb37a'; c.stroke();
      text(c, 'Dati e fonti', 44, 76, 46, '#fff', 700); text(c, s.name, W - 44, 76, 24, '#d9c4b2', 500, 'right');
      let y = 132; for (const [k, t, cr] of rows) { text(c, k.toUpperCase(), 44, y, 21, '#ffb37a', 700); const y2 = wrap(c, t, 230, y, W - 274, 24, 31, '#fff'); text(c, cr, 230, y2 - 4, 19, '#7fe0ff'); y = y2 + 36; }
      text(c, 'Premi di nuovo X (o C sulla tastiera) per chiudere', W / 2, H - 34, 21, '#d9c4b2', 400, 'center');
    });
  }
  toggle() {
    const m = this.panel.mesh; m.visible = !m.visible; this.app.hud.panel.mesh.visible = !m.visible; if (!m.visible) return;
    const p = this.app.player, h = p.head(), a = p.headYaw(), ux = -Math.sin(a), uz = -Math.cos(a), r = 2.3;
    m.position.set(h.x + ux * r, h.y + 0.05, h.z + uz * r); m.rotation.set(0, Math.atan2(-ux, -uz), 0);
  }
}
