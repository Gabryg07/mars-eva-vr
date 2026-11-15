// Demo game "Operazione deposito": recover the ten sample tubes Perseverance left on the ground at the Three Forks depot
// and bring them back to the base, as a rehearsal for Mars Sample Return. Each tube lies where the rover stood on the sol
// it was dropped (official localized waypoints; the tube falls under the rover, so the true spot is within about a metre).
// A scanner on the readout points to the nearest tube and beeps faster as you get close; hold the trigger to pick it up
// (the hold is the seal check). The carrier takes 5 tubes, so the player plans two trips; tubes count once they are inside
// the base, in the return canister. Score: time for all 10 (stars), with distance walked and suit oxygen as in the mission.
import * as THREE from 'three';
import { Panel, rrect, text, wrap } from './ui.js';
import { lang } from './i18n.js';
const L = o => (typeof o === 'string' ? o : o[lang.cur] ?? o.it);
const PICK = 1.6, HOLD = 1.5, GLOW = 12, CAP = 5;   // CAP: slots in the astronaut's sample carrier, so the job takes two trips
// what is inside each depot tube (the depot holds one of each pair the rover collected, plus the atmosphere and witness tubes)
const CONTENT = {
  'Malay': { it: 'roccia ignea del fondo del cratere', en: 'igneous rock from the crater floor' },
  'Mageik': { it: 'roccia sedimentaria fine, affioramento Amalik', en: 'fine-grained sedimentary rock, Amalik outcrop' },
  'Crosswind Lake': { it: 'regolite (sabbia e polvere della superficie)', en: 'regolith (surface sand and dust)' },
  'Roubion': { it: 'atmosfera marziana: il primo tentativo di carotaggio, la roccia si sbriciolò', en: 'Martian air: the first coring attempt, the rock crumbled' },
  'Coulettes': { it: 'roccia ignea ricca di olivina, Séítah', en: 'olivine-rich igneous rock, Séítah' },
  'Montdenier': { it: 'roccia ignea del fondo del cratere, affioramento Rochette', en: 'igneous rock from the crater floor, Rochette outcrop' },
  'Bearwallow': { it: 'roccia fangosa di Wildcat Ridge, adatta a conservare tracce di vita', en: 'Wildcat Ridge mudstone, good at preserving traces of life' },
  'Skyland': { it: 'arenaria di Skinner Ridge, fronte del delta', en: 'Skinner Ridge sandstone, delta front' },
  'Atsah': { it: 'roccia ignea del fondo del cratere', en: 'igneous rock from the crater floor' },
  'Amalik Witness': { it: 'provetta testimone: controlla la contaminazione portata da Terra', en: 'witness tube: checks for contamination brought from Earth' },
};
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class SampleGame {
  constructor(app, root) {
    this.app = app; this.active = false; this.tubes = []; this.g = new THREE.Group(); this.g.visible = false; app.world.add(this.g);
    const body = new THREE.MeshLambertMaterial({ color: 0xe8e6e0, emissive: 0x222222 }), cap = new THREE.MeshLambertMaterial({ color: 0x4a4f57 }), ringM = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    this.panel = new Panel(1.2, 0.42, 520, { depthTest: false }); const m = this.panel.mesh; m.renderOrder = 201; m.visible = false; app.camera.add(m);
    this.card = new Panel(1.3, 0.62, 520, { depthTest: true }); this.card.mesh.visible = false; app.world.add(this.card.mesh);
    this.brief = new Panel(1.7, 1.42, 560, { depthTest: true }); this.brief.mesh.visible = false; app.world.add(this.brief.mesh);
    fetch(`${root}research/activity.json`).then(r => r.json()).then(d => {
      const w = d.waypoints, at = sol => { let k = 0; for (let i = 0; i < w.length; i++) if (w[i][0] <= sol) k = i; return w[k]; };
      d.depot.forEach(([name, sol], i) => {
        const p = at(sol), x = p[1] + Math.sin(i * 2.4) * 0.5, z = -p[2] + Math.cos(i * 2.4) * 0.5, gy = app.ground(x, z) ?? 0, t = new THREE.Group(); t.position.set(x, gy + 0.025, z); t.rotation.y = i * 1.3; this.g.add(t);
        const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.15, 12).rotateZ(Math.PI / 2), body); t.add(tb); const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.035, 12).rotateZ(Math.PI / 2), cap); cp.position.x = 0.09; t.add(cp);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 32).rotateX(-Math.PI / 2), ringM.clone()); ring.position.y = 0.01; t.add(ring);
        this.tubes.push({ name, sol, x, z, g: t, ring, st: 'ground' });
      });
      // a gold beacon over the depot so the player knows where to head first
      const cx = this.tubes.reduce((a, t) => a + t.x, 0) / this.tubes.length, cz = this.tubes.reduce((a, t) => a + t.z, 0) / this.tubes.length, gy = app.ground(cx, cz) ?? 0;
      this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 90, 10, 1, true).translate(0, 45, 0), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })); this.beacon.position.set(cx, gy, cz); this.g.add(this.beacon); this.depot = [cx, cz];
    }).catch(e => console.warn('game', e));
    addEventListener('keydown', e => { if (e.code === 'KeyE') this.keyE = true; }); addEventListener('keyup', e => { if (e.code === 'KeyE') this.keyE = false; });
    app.renderer.domElement.addEventListener('mousedown', () => { this.mouse = true; }); addEventListener('mouseup', () => { this.mouse = false; });
  }
  begin() {
    if (!this.tubes.length) return; this.active = true; this.done = false; this.t = 0; this.walk = 0; this.hold = 0; this.home = false; this.last = null; this.out = false; this.prev = null; this.g.visible = true; this.panel.mesh.visible = true;
    for (const t of this.tubes) { t.st = 'ground'; t.g.visible = true; } if (this.app.pois) this.app.pois.group.visible = false; this.toast(L({ it: 'Esci dall\'airlock e segui il raggio dorato', en: 'Leave through the airlock and follow the gold beam' }), 8);
    const app = this.app, h = app.player.head(), a = app.player.headYaw(), ux = -Math.sin(a), uz = -Math.cos(a), bm = this.brief.mesh; bm.position.set(h.x + ux * 2.3, h.y + 0.2, h.z + uz * 2.3); bm.rotation.set(0, Math.atan2(-ux, -uz), 0); bm.visible = true; this.drawBrief(false);
  }
  end() { this.active = false; this.g.visible = false; this.panel.mesh.visible = false; this.card.mesh.visible = false; this.brief.mesh.visible = false; if (this.app.pois) this.app.pois.group.visible = true; }
  get carried() { return this.tubes.filter(t => t.st === 'carried').length; }
  get stored() { return this.tubes.filter(t => t.st === 'stored').length; }
  get count() { return this.tubes.filter(t => t.st !== 'ground').length; }
  nearest(h) { let best = null, bd = Infinity; for (const t of this.tubes) { if (t.st !== 'ground') continue; const d = Math.hypot(t.x - h.x, t.z - h.z); if (d < bd) { bd = d; best = t; } } return best ? { t: best, d: bd } : null; }
  // the trigger is ours only when a tube is within reach (otherwise it keeps its usual job)
  press() { if (!this.active || this.done) return false; const n = this.nearest(this.app.player.head()); return !!(n && n.d < PICK && this.carried < CAP); }
  toast(msg, s = 3) { this.msg = msg; this.msgT = s; }
  beep(f, d = 0.07, v = 0.15) { const ctx = this.app.ambience?.ctx; if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime; o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.02); }
  update(dt) {
    if (!this.active) return; const app = this.app, h = app.player.head(); if (app.hud) app.hud.panel.mesh.visible = false;
    const xr = app.renderer.xr.isPresenting, m = this.panel.mesh; if (xr) { m.scale.setScalar(0.42); m.position.set(-0.3, -0.33, -0.95); m.rotation.set(-0.45, 0.32, 0); } else { m.scale.setScalar(0.7); m.position.set(0.5, 0.3, -1.25); m.rotation.set(0, -0.2, 0); }
    if (!app.habitat.indoors(h.x, h.z)) this.out = true;   // the clock starts at the airlock, so reading the briefing is free
    if (!this.done && this.out) { this.t += dt; if (this.prev) this.walk += Math.hypot(h.x - this.prev.x, h.z - this.prev.z); } this.prev = { x: h.x, z: h.z };
    const n = this.nearest(h), held = this.keyE || this.mouse || ['left', 'right'].some(k => app.player._pad(k)?.trigger);
    for (const t of this.tubes) if (t.st === 'ground') { const d = Math.hypot(t.x - h.x, t.z - h.z); t.ring.visible = d < GLOW; t.ring.material.opacity = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(this.t * 5)); t.ring.material.color.setHex(n && t === n.t && n.d < PICK ? (this.carried < CAP ? 0x59ff9a : 0xff5050) : 0xffd166); }
    if (this.brief.mesh.visible && !app.habitat.indoors(h.x, h.z) && !this.done) this.brief.mesh.visible = false;
    if (this.beacon) this.beacon.visible = this.count === 0 && !this.done;
    // scanner beeps: faster and higher when close
    if (n && n.d < 40 && !this.done) { this.bT = (this.bT || 0) - dt; if (this.bT <= 0) { this.beep(n.d < PICK ? 1320 : 660 + (40 - n.d) * 12); this.bT = Math.max(0.12, n.d / 18); } }
    // pick up: hold the trigger (E or mouse on a PC) within reach
    const full = this.carried >= CAP; if (n && n.d < PICK && full && !this.done && !(this.msgT > 0)) this.toast(L({ it: 'Contenitore pieno (5 posti): porta queste provette alla base', en: 'Carrier full (5 slots): take these tubes to the base' }), 4);
    if (n && n.d < PICK && held && !full && !this.done) { this.hold += dt; if (this.hold >= HOLD) { this.collect(n.t); this.hold = 0; } } else this.hold = 0;
    // all tubes (or some) back inside the base: the run ends
    if (!this.done && this.carried > 0 && app.habitat.indoors(h.x, h.z)) { for (const t of this.tubes) if (t.st === 'carried') t.st = 'stored'; this.beep(990, 0.15, 0.2);
      if (this.stored === 10) this.finish(); else this.toast(L({ it: `${this.stored} provette nel contenitore di rientro: ne mancano ${10 - this.stored}`, en: `${this.stored} tubes in the return canister: ${10 - this.stored} to go` }), 6); }
    if (this.msgT > 0) this.msgT -= dt; if (this.cardT > 0 && (this.cardT -= dt) <= 0) this.card.mesh.visible = false;
    if ((this._a = (this._a || 0) + dt) > 0.15 || this.hold > 0) { this._a = 0; this.draw(n, h); }
  }
  collect(t) {
    t.st = 'carried'; t.g.visible = false; this.beep(880, 0.12, 0.2); setTimeout(() => this.beep(1320, 0.18, 0.2), 120); this.last = t;
    const c = this.count; this.toast(this.carried >= CAP || c === 10 ? L({ it: 'Contenitore pieno: torna alla base', en: 'Carrier full: head back to the base' }) : L({ it: `Sigillo integro · provetta nel contenitore (${this.carried}/${CAP})`, en: `Seal intact · tube in the carrier (${this.carried}/${CAP})` }), 4);
    const app = this.app, h = app.player.head(), a = app.player.headYaw() - 0.35, ux = -Math.sin(a), uz = -Math.cos(a), cm = this.card.mesh; cm.position.set(h.x + ux * 1.6, h.y - 0.1, h.z + uz * 1.6); cm.rotation.set(0, Math.atan2(-ux, -uz), 0); cm.visible = true; this.cardT = 7;
    this.card.draw((cv, W, H) => { rrect(cv, 4, 4, W - 8, H - 8, 22); cv.fillStyle = 'rgba(14,10,8,0.95)'; cv.fill(); cv.lineWidth = 5; cv.strokeStyle = '#ffd166'; cv.stroke();
      text(cv, L({ it: `PROVETTA ${c} DI 10`, en: `TUBE ${c} OF 10` }), 28, 50, 22, '#ffd166', 700); text(cv, L({ it: `lasciata al sol ${t.sol}`, en: `dropped on sol ${t.sol}` }), W - 28, 50, 20, '#d9c4b2', 500, 'right');
      text(cv, `«${t.name}»`, 28, 108, 44, '#fff', 700); wrap(cv, L(CONTENT[t.name] || { it: '', en: '' }), 28, 158, W - 56, 26, 34, '#f2e9e1');
      text(cv, L({ it: 'Deposito di Three Forks · posizione del rover in quel sol', en: 'Three Forks depot · rover position on that sol' }), 28, H - 26, 17, '#a8988a', 400); });
  }
  finish() {
    this.done = true; const stars = this.t < 720 ? 3 : this.t < 1080 ? 2 : 1; this.stars = stars; this.beep(660, 0.2); setTimeout(() => this.beep(990, 0.3), 200);
    this.toast(L({ it: 'Missione compiuta! Y (R sulla tastiera) per tornare al menu', en: 'Mission accomplished! Y (R on the keyboard) for the menu' }), 999);
    const app = this.app, h = app.player.head(), a = app.player.headYaw(), ux = -Math.sin(a), uz = -Math.cos(a), bm = this.brief.mesh; bm.position.set(h.x + ux * 2.3, h.y + 0.2, h.z + uz * 2.3); bm.rotation.set(0, Math.atan2(-ux, -uz), 0); bm.visible = true; this.drawBrief(true);
  }
  drawBrief(end) {
    const g = this, para = (c, s, y, W, sz = 24, col = '#f2e9e1') => s.split('\n').reduce((yy, line) => wrap(c, line, 34, yy, W - 68, sz, sz * 1.32, col), y);
    this.brief.draw((c, W, H) => { rrect(c, 4, 4, W - 8, H - 8, 26); c.fillStyle = 'rgba(14,10,8,0.95)'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#ffd166'; c.stroke();
      text(c, L(end ? { it: 'MISSIONE COMPIUTA', en: 'MISSION ACCOMPLISHED' } : { it: 'OPERAZIONE DEPOSITO · DEMO', en: 'OPERATION DEPOT · DEMO' }), 34, 62, 38, '#ffd166', 700);
      let y = 108;
      if (!end) {
        y = para(c, L({ it: 'Tra dicembre 2022 e gennaio 2023 Perseverance ha lasciato 10 provette sigillate sul terreno di Three Forks, a 150 m da qui: rocce, sabbia, aria marziana e una provetta testimone. È la copia di riserva dei campioni da riportare sulla Terra.', en: 'Between December 2022 and January 2023 Perseverance left 10 sealed tubes on the ground at Three Forks, 150 m from here: rocks, sand, Martian air and a witness tube. They are the backup set of the samples meant to come back to Earth.' }), y, W);
        y = para(c, L({ it: 'Il tuo compito: recuperarle tutte e metterle nel contenitore di rientro dentro la base.', en: 'Your job: recover all of them and put them in the return canister inside the base.' }), y + 10, W, 26, '#fff');
        y = para(c, L({ it: '• Il raggio dorato segna il deposito. Lo scanner sul visore indica la provetta più vicina e suona più veloce quando ti avvicini.\n• A meno di 1,5 m: tieni premuto il grilletto (al PC: E) per controllare il sigillo e raccoglierla.\n• Il portacampioni ha 5 posti: servono due viaggi. Le provette contano solo quando sono dentro la base.\n• Le pendenze ti rallentano e la tuta consuma ossigeno come nella missione vera.', en: '• The gold beam marks the depot. The scanner on your visor points to the nearest tube and beeps faster as you get closer.\n• Within 1.5 m: hold the trigger (on PC: E) to check the seal and pick it up.\n• The carrier holds 5: it takes two trips. Tubes only count once they are inside the base.\n• Slopes slow you down and the suit uses oxygen as in the real mission.' }), y + 12, W, 22, '#d9c4b2');
        para(c, L({ it: 'Obiettivo: tutte e 10 in meno di 12 minuti per 3 stelle. Esci dall\'airlock per cominciare.', en: 'Target: all 10 in under 12 minutes for 3 stars. Leave through the airlock to begin.' }), y + 12, W, 24, '#ffd166');
      } else {
        text(c, '★'.repeat(g.stars) + '☆'.repeat(3 - g.stars), 34, y + 20, 56, '#ffd166', 700);
        y = para(c, L({ it: `10 provette recuperate in ${fmt(g.t)}, ${Math.round(g.walk)} m percorsi a piedi.`, en: `10 tubes recovered in ${fmt(g.t)}, ${Math.round(g.walk)} m on foot.` }), y + 64, W, 28, '#fff');
        y = para(c, L({ it: 'Nella realtà questo lavoro toccherà a una missione robotica di rientro dei campioni, il cui progetto è ancora in discussione. Un astronauta lo farebbe in un pomeriggio: è uno dei motivi per cui si studiano le missioni umane su Marte.', en: 'In reality this job falls to a robotic sample return mission, whose design is still being debated. An astronaut could do it in an afternoon: one of the reasons human missions to Mars are being studied.' }), y + 14, W, 22, '#d9c4b2');
        para(c, L({ it: '3 stelle: sotto 12 min · 2 stelle: sotto 18 min · 1 stella: completata. Y (R) per il menu.', en: '3 stars: under 12 min · 2 stars: under 18 min · 1 star: completed. Y (R) for the menu.' }), y + 16, W, 20, '#a8988a');
      }
    });
  }
  draw(n, h) {
    const app = this.app; this.panel.draw((c, W, H) => {
      rrect(c, 4, 4, W - 8, H - 8, 24); c.fillStyle = 'rgba(14,10,8,0.82)'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#ffd166'; c.stroke();
      text(c, L({ it: 'OPERAZIONE DEPOSITO', en: 'OPERATION DEPOT' }), 26, 44, 22, '#ffd166', 700); text(c, fmt(this.t), W - 26, 44, 26, '#fff', 700, 'right');
      // ten tube slots
      for (let i = 0; i < 10; i++) { const x = 26 + i * 40; rrect(c, x, 64, 32, 56, 8); c.fillStyle = i < this.stored ? '#ffd166' : i < this.count ? '#7fe0ff' : 'rgba(255,255,255,0.12)'; c.fill(); }
      text(c, `${this.stored}/10`, 436, 92, 32, '#fff', 700); text(c, L({ it: `in mano ${this.carried}/${CAP}`, en: `carried ${this.carried}/${CAP}` }), 436, 118, 18, '#7fe0ff', 600);
      const st = app.mission.state(h); text(c, `O₂ ${Math.round(st.o2Frac * 100)}%`, W - 120, 44, 22, st.o2Frac > 0.3 ? '#59ff9a' : '#ff5050', 700, 'right');
      if (this.done) { text(c, this.count === 10 ? '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars) : L({ it: 'consegna parziale', en: 'partial delivery' }), W - 26, 104, 34, '#ffd166', 700, 'right');
        text(c, L({ it: `${this.count} provette in ${fmt(this.t)} · ${Math.round(this.walk)} m a piedi`, en: `${this.count} tubes in ${fmt(this.t)} · ${Math.round(this.walk)} m walked` }), 26, 160, 24, '#f2e9e1', 600); }
      else if (n) { // scanner: arrow towards the nearest tube, relative to where the head points
        const dx = n.t.x - h.x, dz = n.t.z - h.z, ang = Math.atan2(-dx, -dz) - app.player.headYaw(), cx = W - 50, cy = 96;
        c.save(); c.translate(cx, cy); c.rotate(-ang); c.fillStyle = n.d < PICK ? '#59ff9a' : '#7fe0ff'; c.beginPath(); c.moveTo(0, -26); c.lineTo(17, 18); c.lineTo(0, 9); c.lineTo(-17, 18); c.closePath(); c.fill(); c.restore();
        text(c, n.d < PICK ? (this.carried >= CAP ? L({ it: 'Contenitore pieno: torna alla base', en: 'Carrier full: go back to the base' }) : L({ it: 'Tieni premuto il grilletto (E): controllo del sigillo', en: 'Hold the trigger (E): seal check' })) : this.carried >= CAP ? L({ it: 'Contenitore pieno: torna alla base', en: 'Carrier full: go back to the base' }) : L({ it: `Provetta più vicina: ${n.d < 1000 ? Math.round(n.d) + ' m' : (n.d / 1000).toFixed(1) + ' km'}`, en: `Nearest tube: ${n.d < 1000 ? Math.round(n.d) + ' m' : (n.d / 1000).toFixed(1) + ' km'}` }), 26, 160, 24, n.d < PICK ? '#59ff9a' : '#f2e9e1', 600);
        if (this.hold > 0) { rrect(c, 26, 176, (W - 52) * Math.min(1, this.hold / HOLD), 10, 5); c.fillStyle = '#59ff9a'; c.fill(); } }
      else { text(c, L({ it: 'Riporta le provette alla base', en: 'Bring the tubes back to the base' }), 26, 160, 24, '#59ff9a', 600); }
      if (this.msgT > 0 && this.msg) text(c, this.msg, 26, 200, 20, '#ffd166', 600);
    });
  }
}
