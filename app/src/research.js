// Research room: a second module joined to the base by a short corridor. No mission here, only data for whoever
// wants to study the site: global maps from NASA Mars Trek, close-ups of Jezero from our own layers, the rover's photos
// at each stop, and a kiosk with the mission documentation and the links to every source. Grouped by topic.
import * as THREE from 'three';
import { Panel, rrect, text, wrap } from './ui.js';
import { lang, P } from './i18n.js';
import { R, H, DOOR_W, DOOR_H, TUN2, R2, XC } from './habitat.js';
const L = o => (typeof o === 'string' ? o : o[lang.cur] ?? o.it);
const TOPIC = {
  shape: { c: '#ffb37a', t: { it: 'FORMA DEL PIANETA', en: 'SHAPE OF THE PLANET' } },
  heat: { c: '#ff6b5a', t: { it: 'SUPERFICIE E CALORE', en: 'SURFACE AND HEAT' } },
  comp: { c: '#5be08a', t: { it: 'COMPOSIZIONE', en: 'COMPOSITION' } },
  site: { c: '#7fe0ff', t: { it: 'JEZERO DA VICINO', en: 'JEZERO CLOSE UP' } },
  photo: { c: '#ffd166', t: { it: 'FOTO DI PERSEVERANCE', en: 'PERSEVERANCE PHOTOS' } },
};
const TREK = 'NASA Mars Trek · NASA/JPL-Caltech/USGS';
const MAPS = [
  { topic: 'shape', img: 'mola.jpg', src: 'MGS MOLA · NASA/JPL/GSFC · ' + TREK,
    title: { it: 'Topografia globale (MOLA)', en: 'Global topography (MOLA)' },
    text: { it: "Quote misurate dal laser altimetro MOLA di Mars Global Surveyor (1997-2001), con una precisione verticale di circa un metro. Blu e viola: bacini e pianure basse (Hellas, pianure del nord). Rosso e bianco: altopiani e vulcani di Tharsis. Tra la cima di Olympus Mons e il fondo di Hellas ci sono circa 30 km di dislivello. Il cerchio azzurro è Jezero, sul bordo del bacino di Isidis: il fondo del cratere è a circa 2.550 m sotto il livello di riferimento, che è la quota zero di tutte le mappe del simulatore.",
      en: "Elevations measured by the MOLA laser altimeter on Mars Global Surveyor (1997-2001), with a vertical precision of about one metre. Blue and purple: low basins and plains (Hellas, northern plains). Red and white: highlands and the Tharsis volcanoes. About 30 km separate the top of Olympus Mons from the floor of Hellas. The cyan circle is Jezero, on the rim of the Isidis basin: the crater floor lies about 2,550 m below the reference level, which is the zero of every map in the simulator." } },
  { topic: 'shape', img: 'rough.jpg', src: 'MGS MOLA · ' + TREK,
    title: { it: 'Rugosità della superficie (MOLA)', en: 'Surface roughness (MOLA)' },
    text: { it: "Quanto il terreno è liscio o accidentato su distanze di centinaia di metri, ricavato dalla dispersione degli impulsi laser di MOLA. Le pianure settentrionali sono molto lisce, gli altopiani del sud più accidentati per i crateri e le colate. Serve a scegliere zone sicure per atterraggi, rover e traversate a piedi: una superficie rugosa a questa scala nasconde quasi sempre pendii ripidi e massi alla scala di un astronauta.",
      en: "How smooth or rugged the ground is over hundreds of metres, derived from the spread of the MOLA laser pulses. The northern plains are very smooth, the southern highlands more rugged because of craters and lava flows. It helps choose safe areas for landings, rovers and walking traverses: ground that is rough at this scale almost always hides steep slopes and boulders at the scale of an astronaut." } },
  { topic: 'shape', img: 'isidis.jpg', src: 'MGS MOLA · ' + TREK,
    title: { it: 'Regione di Isidis e Jezero', en: 'Isidis region and Jezero' },
    text: { it: "Jezero è un cratere di circa 45 km sul bordo occidentale del bacino da impatto di Isidis, largo circa 1.500 km (in basso a destra, in blu). Più di 3,5 miliardi di anni fa due valli, Neretva Vallis da ovest e Sava Vallis da nord, portavano acqua nel cratere: si formò un lago, poi traboccato verso est. I sedimenti dei fiumi hanno costruito il delta a ventaglio studiato da Perseverance, il punto più promettente per trovare tracce di vita antica.",
      en: "Jezero is a crater about 45 km wide on the western rim of the Isidis impact basin, about 1,500 km across (bottom right, in blue). More than 3.5 billion years ago two valleys, Neretva Vallis from the west and Sava Vallis from the north, carried water into the crater: a lake formed and later overflowed to the east. River sediments built the fan-shaped delta studied by Perseverance, the most promising spot to find traces of ancient life." } },
  { topic: 'heat', img: 'themisday.jpg', src: 'Mars Odyssey THEMIS · ASU · ' + TREK,
    title: { it: 'Infrarosso diurno (THEMIS)', en: 'Daytime infrared (THEMIS)' },
    text: { it: "Mosaico di Mars Odyssey a 100 m per pixel, uno dei più completi del pianeta. Di giorno la temperatura dipende soprattutto dall'esposizione: i pendii rivolti al Sole sono più caldi (chiari), quelli in ombra più freddi. Per questo la mappa mostra la forma del terreno con grande dettaglio, anche dove le immagini ottiche mancano. Confrontata con quella notturna permette di separare l'effetto della luce da quello del materiale.",
      en: "Mars Odyssey mosaic at 100 m per pixel, one of the most complete of the planet. In daytime temperature depends mostly on how the ground faces the Sun: sunlit slopes are warmer (brighter), shaded ones colder. That is why the map shows the shape of the terrain in fine detail, even where optical images are missing. Compared with the night-time map it separates the effect of light from that of the material." } },
  { topic: 'heat', img: 'inertia.jpg', src: 'MGS TES · ASU · ' + TREK,
    title: { it: 'Inerzia termica (TES)', en: 'Thermal inertia (TES)' },
    text: { it: "Quanto il suolo conserva il calore tra il giorno e la notte, misurato dallo spettrometro TES. Valori bassi (viola): polvere fine, che copre Tharsis, Arabia ed Elysium e si scalda e raffredda in fretta. Valori alti (giallo e rosso): sabbia grossa, roccia affiorante e suolo cementato. Per chi pianifica un'uscita indica dove la polvere può essere profonda e il passo faticoso, e dove invece si trova roccia da campionare.",
      en: "How well the ground keeps its heat between day and night, measured by the TES spectrometer. Low values (purple): fine dust, which blankets Tharsis, Arabia and Elysium and heats up and cools down quickly. High values (yellow and red): coarse sand, exposed rock and cemented soil. For EVA planning it shows where dust may be deep and walking tiring, and where there is rock to sample." } },
  { topic: 'comp', img: 'clay.jpg', src: 'MGS TES · ASU · ' + TREK,
    title: { it: 'Silicati in lamine e vetro (TES)', en: 'Sheet silicates and glass (TES)' },
    text: { it: "Abbondanza stimata dallo spettrometro infrarosso TES di silicati in lamine (argille) o di vetro vulcanico ricco di silice: i due materiali hanno spettri simili a questa risoluzione. I valori più alti (giallo e rosso) sono nelle pianure settentrionali. Se si tratti di basalto alterato dall'acqua o di rocce vulcaniche diverse è ancora discusso: è uno dei motivi per cui servono analisi sul posto e campioni.",
      en: "Abundance of sheet silicates (clays) or silica-rich volcanic glass estimated by the TES infrared spectrometer: at this resolution the two materials have similar spectra. The highest values (yellow and red) are in the northern plains. Whether this is basalt altered by water or a different volcanic rock is still debated: one of the reasons why in-situ analyses and samples are needed." } },
  { topic: 'comp', img: 'site_minerals.jpg', src: 'MRO CRISM FRT00005C5E · NASA/JPL-Caltech/JHUAPL',
    title: { it: 'Minerali a Jezero (CRISM)', en: 'Minerals at Jezero (CRISM)' },
    text: { it: "Rosso: olivina. Verde: argille di ferro e magnesio. Blu: carbonati. Dati CRISM a 18 m per pixel, 7,2 km di lato, riallineati alla nostra immagine CTX. Argille e carbonati si formano in presenza d'acqua e possono intrappolare molecole organiche: sono i bersagli migliori per i campioni. Lungo il margine del delta i carbonati segnano probabilmente l'antica riva del lago. Linea azzurra: il percorso dell'uscita.",
      en: "Red: olivine. Green: iron-magnesium clays. Blue: carbonates. CRISM data at 18 m per pixel, 7.2 km across, co-registered to our CTX image. Clays and carbonates form in water and can trap organic molecules: they are the best targets for samples. Along the delta margin the carbonates probably mark the ancient lake shore. Cyan line: the EVA route." } },
  { topic: 'site', img: 'site_ortho.jpg', src: 'MRO CTX · NASA/JPL-Caltech/MSSS/USGS',
    title: { it: 'Il fronte del delta (CTX)', en: 'The delta front (CTX)' },
    text: { it: "Immagine della Context Camera di MRO a 6 m per pixel, 7,2 km di lato, nord in alto. A sinistra il ventaglio del delta con i suoi canali; a destra il fondo del cratere. Le tappe dell'uscita (punti bianchi) seguono il fronte del delta, dove gli strati sono esposti: in questo tratto la scarpata sale di circa 50 m. Il punto giallo è la base, una scelta del nostro scenario.",
      en: "MRO Context Camera image at 6 m per pixel, 7.2 km across, north up. On the left, the delta fan and its channels; on the right, the crater floor. The EVA stops (white dots) follow the delta front, where the layers are exposed: along this stretch the scarp rises about 50 m. The yellow dot is the base, a choice of our scenario." } },
  { topic: 'site', img: 'site_slope.jpg', src: 'HiRISE/CTX DTM · USGS Astrogeology',
    title: { it: 'Pendenze e ostacoli', en: 'Slopes and obstacles' },
    text: { it: "Calcolate dai modelli del terreno HiRISE (1 m) e CTX (20 m). Verde sotto 10°, giallo 10–20°, arancio 20–30°, rosso oltre 30°, cioè oltre il limite della tuta. La velocità a piedi segue la funzione di Tobler: in salita o in discesa ripida si rallenta molto. Il percorso a costo minimo tra le tappe evita le zone rosse e limita quelle arancioni.",
      en: "Computed from the HiRISE (1 m) and CTX (20 m) terrain models. Green under 10°, yellow 10–20°, orange 20–30°, red over 30°, beyond the suit limit. Walking speed follows Tobler's function: steep climbs and descents slow you down a lot. The least-cost route between the stops avoids the red areas and keeps the orange ones short." } },
  { topic: 'site', img: 'site_thermal.jpg', src: 'Mars Odyssey THEMIS · ASU',
    title: { it: 'Infrarosso notturno (THEMIS)', en: 'Night-time infrared (THEMIS)' },
    text: { it: "Di notte la roccia compatta resta calda (chiaro), sabbia e polvere si raffreddano in fretta (scuro). Mosaico THEMIS a 100 m per pixel, 29 km di lato: si vede tutto il cratere, con il delta a ovest. Le unità rocciose del fondo, esplorate dal rover, spiccano come zone calde. Per un'uscita indica dove si cammina su roccia e dove si affonda nella sabbia.",
      en: "At night solid rock stays warm (bright), sand and dust cool quickly (dark). THEMIS mosaic at 100 m per pixel, 29 km across: the whole crater is visible, with the delta to the west. The rocky units of the floor, explored by the rover, stand out as warm areas. For an EVA it shows where you walk on rock and where you sink into sand." } },
];
const DOCS = { title: { it: 'Documentazione della missione', en: 'Mission documentation' }, lines: [
  { it: 'Perseverance (missione Mars 2020) è atterrato il 18 febbraio 2021 nel cratere Jezero, a 18,4° N e 77,4° E.', en: 'Perseverance (Mars 2020 mission) landed on 18 February 2021 in Jezero crater, at 18.4° N, 77.4° E.' },
  { it: 'Jezero, circa 45 km, ospitava un lago. Il delta conserva i sedimenti portati dai fiumi: il posto migliore dove cercare tracce di vita antica.', en: 'Jezero, about 45 km wide, once held a lake. The delta preserves sediments carried by rivers: the best place to look for traces of ancient life.' },
  { it: 'Il rover raccoglie campioni sigillati in provette, pensati per tornare sulla Terra con una missione futura.', en: 'The rover collects samples sealed in tubes, meant to be returned to Earth by a future mission.' },
  { it: 'Strumenti: Mastcam-Z (camere), SuperCam (laser e spettrometri), PIXL e SHERLOC (chimica e molecole organiche), RIMFAX (radar del sottosuolo), MEDA (meteo), MOXIE (ossigeno dalla CO₂).', en: 'Instruments: Mastcam-Z (cameras), SuperCam (laser and spectrometers), PIXL and SHERLOC (chemistry and organic molecules), RIMFAX (ground radar), MEDA (weather), MOXIE (oxygen from CO₂).' },
  { it: 'Convenzioni: quote riferite a MOLA, ore in tempo solare locale (LMST), sol = giorno marziano di 24 h 39 min.', en: 'Conventions: elevations referred to MOLA, times in local mean solar time (LMST), sol = Martian day of 24 h 39 min.' },
] };
const LINKS = { title: { it: 'Fonti e link', en: 'Sources and links' }, rows: [
  ['trek.nasa.gov/mars', { it: 'cartine globali e regionali (Mars Trek)', en: 'global and regional maps (Mars Trek)' }],
  ['mars.nasa.gov/mars2020/multimedia/raw-images', { it: 'foto raw di Perseverance', en: 'Perseverance raw images' }],
  ['astrogeology.usgs.gov', { it: 'modelli del terreno HiRISE e CTX', en: 'HiRISE and CTX terrain models' }],
  ['pds-geosciences.wustl.edu', { it: 'spettri CRISM (PDS)', en: 'CRISM spectra (PDS)' }],
  ['pds-atmospheres.nmsu.edu', { it: 'dati meteo MEDA (PDS)', en: 'MEDA weather data (PDS)' }],
  ['mars.nasa.gov/mars2020', { it: 'sito della missione', en: 'mission website' }],
], note: { it: 'Avvicinati ai pannelli per leggere. Y (R sulla tastiera) torna al menu.', en: 'Walk up to the panels to read. Y (R on the keyboard) goes back to the menu.' } };

export class ResearchRoom {
  constructor(app, hab, root) {
    this.app = app; this.hab = hab; this.boards = []; const s = hab.side, g = hab.group, col = c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
    const add = (par, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
    // corridor from the base wall to the room wall
    const u0 = R - 0.25, u1 = XC - R2 + 0.3, um = s * (u0 + u1) / 2, Lc = u1 - u0, grey = col(0xcfd4d8), shell = col(0xc8bcae);
    for (const z of [-DOOR_W / 2, DOOR_W / 2]) add(g, new THREE.PlaneGeometry(Lc, DOOR_H), grey, um, DOOR_H / 2, z);
    for (const z of [-DOOR_W / 2 - 0.12, DOOR_W / 2 + 0.12]) add(g, new THREE.PlaneGeometry(Lc, DOOR_H + 0.15), shell, um, DOOR_H / 2 + 0.07, z);
    add(g, new THREE.PlaneGeometry(Lc, DOOR_W).rotateX(Math.PI / 2), grey, um, DOOR_H, 0); add(g, new THREE.PlaneGeometry(Lc, DOOR_W + 0.24).rotateX(Math.PI / 2), shell, um, DOOR_H + 0.15, 0);
    add(g, new THREE.PlaneGeometry(Lc, DOOR_W).rotateX(-Math.PI / 2), col(0x555b62), um, 0.004, 0);
    const sign = new Panel(1.5, 0.34, 400); sign.mesh.material.depthTest = true; sign.mesh.position.set(s * (R - 0.12), DOOR_H + 0.24, 0); sign.mesh.rotation.y = -s * Math.PI / 2; g.add(sign.mesh); this.sign = sign;
    // the room: a wider module with the same construction as the base
    const rg = this.rg = new THREE.Group(); rg.position.set(s * XC, 0, 0); rg.rotation.y = s * Math.PI / 2; g.add(rg);
    const a = Math.asin(DOOR_W / 2 / R2), wallT = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2a3036'); gr.addColorStop(1, '#1b1f24'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 256);
      x.strokeStyle = 'rgba(127,224,255,0.18)'; x.lineWidth = 3; for (let i = 0; i <= 24; i++) { x.beginPath(); x.moveTo(i * 1024 / 24, 0); x.lineTo(i * 1024 / 24, 256); x.stroke(); } x.fillStyle = '#7fe0ff'; x.fillRect(0, 205, 1024, 4); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; })();
    add(rg, new THREE.CylinderGeometry(R2 + 0.06, R2 + 0.06, H + 0.3, 48, 1, true, Math.PI + a, 2 * Math.PI - 2 * a), new THREE.MeshBasicMaterial({ color: 0xd9d0c4 }), 0, (H + 0.3) / 2);
    add(rg, new THREE.CylinderGeometry(R2, R2, H + 0.3, 48, 1, true, Math.PI + a, 2 * Math.PI - 2 * a), new THREE.MeshBasicMaterial({ map: wallT, side: THREE.BackSide }), 0, (H + 0.3) / 2);
    add(rg, new THREE.CylinderGeometry(R2 + 0.03, R2 + 0.03, H + 0.3 - DOOR_H, 6, 1, true, Math.PI - a, 2 * a), col(0xbfb2a2), 0, DOOR_H + (H + 0.3 - DOOR_H) / 2);
    const dome = add(rg, new THREE.SphereGeometry(R2 + 0.06, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd9d0c4 }), 0, H + 0.3); dome.scale.y = 0.38;
    const ceil = add(rg, new THREE.SphereGeometry(R2, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x343b42, side: THREE.BackSide }), 0, H + 0.3); ceil.scale.y = 0.36;
    add(rg, new THREE.RingGeometry(R2 * 0.3, R2 * 0.36, 48).rotateX(Math.PI / 2), col(0xe8f8ff), 0, H + 0.3 + R2 * 0.36 * 0.9);
    add(rg, new THREE.CircleGeometry(R2, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3b4148 }), 0, 0.005);
    add(rg, new THREE.RingGeometry(0.95, 1.05, 48).rotateX(-Math.PI / 2), col(0x7fe0ff), 0, 0.01);
    add(rg, new THREE.CylinderGeometry(R2 + 0.25, R2 + 0.4, 3.2, 48, 1, true), col(0x6b5a4c), 0, -1.6);
    // central kiosk, two faces: documentation towards the door, sources on the back
    add(rg, new THREE.BoxGeometry(1.9, 1.45, 0.12), new THREE.MeshBasicMaterial({ color: 0x1b1714 }), 0, 1.5, 0); add(rg, new THREE.CylinderGeometry(0.12, 0.25, 0.8, 12), new THREE.MeshBasicMaterial({ color: 0x555b62 }), 0, 0.4, 0);
    this.docs = new Panel(1.8, 1.35, 560, { depthTest: true }); this.docs.mesh.position.set(0, 1.5, -0.07); this.docs.mesh.rotation.y = Math.PI; rg.add(this.docs.mesh);
    this.links = new Panel(1.8, 1.35, 560, { depthTest: true }); this.links.mesh.position.set(0, 1.5, 0.07); rg.add(this.links.mesh);
    // wall boards, in topic order starting left of the door
    const photoStops = app.site.pois.filter(p => p.photos?.length);
    const items = [...MAPS.map(m => ({ kind: 'map', ...m })), ...photoStops.map(p => ({ kind: 'photo', topic: 'photo', p }))], n = items.length, span = 2 * Math.PI - 0.62;
    items.forEach((it, i) => { const phi = Math.PI + 0.31 + span * (i + 0.5) / n, pnl = new Panel(1.62, 1.24, 600, { depthTest: true });
      pnl.mesh.position.set(Math.sin(phi) * (R2 - 0.12), 1.55, Math.cos(phi) * (R2 - 0.12)); pnl.mesh.rotation.y = phi + Math.PI; rg.add(pnl.mesh);
      const b = { ...it, pnl, imgs: [] }; this.boards.push(b);
      const files = it.kind === 'map' ? [`${root}research/${it.img}`] : it.p.photos.slice(0, 4).map(ph => `${root}sites/${app.siteId}/${ph.file}`);
      files.forEach((f, k) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { b.imgs[k] = im; this.drawBoard(b); }; im.src = f; }); });
    this.redraw();
  }
  redraw() {
    this.sign.draw((c, W, Hh) => { rrect(c, 2, 2, W - 4, Hh - 4, 16); c.fillStyle = '#1b1714'; c.fill(); text(c, L({ it: 'SALA DATI →', en: 'RESEARCH ROOM →' }), W / 2, Hh * 0.68, 64, '#7fe0ff', 700, 'center'); });
    for (const b of this.boards) this.drawBoard(b);
    this.docs.draw((c, W, Hh) => { this.frame(c, W, Hh, '#ffb37a'); text(c, L(DOCS.title), 40, 70, 40, '#fff', 700); let y = 124;
      for (const l of DOCS.lines) { c.fillStyle = '#ffb37a'; c.fillRect(40, y - 16, 10, 10); y = wrap(c, L(l), 66, y, W - 106, 25, 33, '#fff') + 12; } });
    this.links.draw((c, W, Hh) => { this.frame(c, W, Hh, '#7fe0ff'); text(c, L(LINKS.title), 40, 70, 40, '#fff', 700); let y = 130;
      for (const [u, d] of LINKS.rows) { text(c, u, 40, y, 26, '#7fe0ff', 700); text(c, L(d), 40, y + 32, 23, '#d9c4b2'); y += 86; }
      wrap(c, L(LINKS.note), 40, Hh - 54, W - 80, 22, 28, '#ffb37a', 600); });
  }
  frame(c, W, Hh, colr) { rrect(c, 4, 4, W - 8, Hh - 8, 26); c.fillStyle = 'rgba(14,9,6,0.95)'; c.fill(); c.lineWidth = 4; c.strokeStyle = colr; c.stroke(); }
  drawBoard(b) {
    const tp = TOPIC[b.topic];
    b.pnl.draw((c, W, Hh) => {
      this.frame(c, W, Hh, tp.c); c.fillStyle = tp.c; rrect(c, 4, 4, W - 8, 40, 20); c.fill(); c.fillRect(4, 24, W - 8, 20); text(c, L(tp.t), 30, 33, 21, '#1a0f0a', 700);
      if (b.kind === 'photo') {
        const p = b.p; text(c, P(p, 'title'), 30, 88, 32, '#fff', 700); const cw = 300, ch = 225;
        p.photos.slice(0, 4).forEach((ph, i) => { const x = 30 + (i % 2) * (cw + 16), y = 110 + (i >> 1) * (ch + 34), im = b.imgs[i];
          if (im) { const k = Math.max(cw / im.width, ch / im.height), sw = cw / k, sh = ch / k; c.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, cw, ch); } else { c.fillStyle = '#3a2418'; c.fillRect(x, y, cw, ch); }
          text(c, `${ph.camera} · sol ${ph.sol}`, x, y + ch + 22, 17, tp.c, 600); });
        const tx = 30 + 2 * cw + 40; wrap(c, P(p, 'text'), tx, 128, W - tx - 30, 21, 28, '#fff');
        text(c, 'NASA/JPL-Caltech/ASU · mars.nasa.gov raw images', 30, Hh - 22, 17, '#8a7a6c'); return;
      }
      text(c, L(b.title), 30, 88, 32, '#fff', 700); const im = b.imgs[0], asp = im ? im.width / im.height : 2, wide = asp > 1.2;
      if (wide) { const ih = Math.min(380, (W - 60) / asp), iw = ih * asp, ix = (W - iw) / 2; if (im) c.drawImage(im, ix, 104, iw, ih); else { c.fillStyle = '#3a2418'; c.fillRect(ix, 104, iw, ih); } wrap(c, L(b.text), 30, 104 + ih + 30, W - 60, 21, 27, '#fff'); }
      else { const ih = 470, iw = im ? ih * im.width / im.height : ih; if (im) c.drawImage(im, 30, 104, iw, ih); else { c.fillStyle = '#3a2418'; c.fillRect(30, 104, iw, ih); } wrap(c, L(b.text), 30 + iw + 24, 126, W - iw - 78, 20, 27, '#fff'); }
      text(c, b.src, 30, Hh - 22, 17, '#8a7a6c');
    });
  }
}
