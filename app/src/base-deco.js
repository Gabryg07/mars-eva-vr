// Hi-tech dressing for the base: hull and dome textures, structural ribs, LED strips, lit door frames, a comms mast,
// a solar array beside the base and warning lights at the airlock. Scenery only (not NASA data). Everything that does
// not move is merged into one mesh per material, so the whole dressing costs a handful of draw calls on the Quest.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R, H, DOOR_W, DOOR_H, TUN, TUN2, R2, XC } from './habitat.js';

const cv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// outer wall: white composite panels, a dark sensor/window band with a cyan light line, small status lights, dust at the foot
export function hullTex(rep = 1) {
  const t = cv(1024, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f1efea'); g.addColorStop(0.75, '#d6d2ca'); g.addColorStop(1, '#a8927e'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 48; i++) for (let j = 0; j < 3; j++) { c.fillStyle = `rgba(0,0,0,${rnd() * 0.05})`; c.fillRect(i * w / 48, j * h / 3, w / 48, h / 3); }
    c.strokeStyle = 'rgba(70,70,80,0.35)'; c.lineWidth = 2; for (let i = 0; i <= 48; i++) { c.beginPath(); c.moveTo(i * w / 48, 0); c.lineTo(i * w / 48, h); c.stroke(); } for (const y of [h / 3, 2 * h / 3]) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    const by = h * 0.2, bh = h * 0.13, gb = c.createLinearGradient(0, by, 0, by + bh); gb.addColorStop(0, '#1d2836'); gb.addColorStop(0.5, '#33465c'); gb.addColorStop(1, '#141b25'); c.fillStyle = gb; c.fillRect(0, by, w, bh);
    c.fillStyle = '#3df0ff'; c.fillRect(0, by + bh + 3, w, 3); c.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 12; i++) c.fillRect(i * w / 12 + 10, by + 4, 30, 3);
    for (let i = 0; i < 24; i++) { c.fillStyle = i % 5 ? '#59ff9a' : '#ffb300'; c.fillRect(i * w / 24 + 8, h * 0.6, 5, 5); }
    c.fillStyle = '#5e6670'; c.fillRect(0, h - 14, w, 14);
  });
  t.wrapS = THREE.RepeatWrapping; t.repeat.x = rep; return t;
}
// dome: gored panels, rings, a darker top cap with a light ring
export function domeTex() {
  const t = cv(1024, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#c9ccd0'); g.addColorStop(1, '#ebe8e2'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 32; i++) for (let j = 1; j < 4; j++) { c.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`; c.fillRect(i * w / 32, j * h / 4, w / 32, h / 4); }
    c.strokeStyle = 'rgba(60,60,70,0.4)'; c.lineWidth = 2; for (let i = 0; i <= 32; i++) { c.beginPath(); c.moveTo(i * w / 32, h * 0.25); c.lineTo(i * w / 32, h); c.stroke(); } for (let j = 1; j < 4; j++) { c.beginPath(); c.moveTo(0, j * h / 4); c.lineTo(w, j * h / 4); c.stroke(); }
    c.fillStyle = '#4a515a'; c.fillRect(0, 0, w, h * 0.22); c.fillStyle = '#3df0ff'; c.fillRect(0, h * 0.22, w, 4); c.fillStyle = '#9aa3ad'; c.fillRect(0, h - 10, w, 10);
  });
  t.wrapS = THREE.RepeatWrapping; t.repeat.y = 2; t.offset.y = -1; return t;   // only the top half of the sphere's v range is used
}

// inside of the main dome: pale gored panels with lit seams
export function ceilTex() {
  const t = cv(1024, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#eef2f5'); g.addColorStop(1, '#b9c2ca'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(70,80,90,0.35)'; c.lineWidth = 3; for (let i = 0; i < 24; i++) { c.beginPath(); c.moveTo(i * w / 24, h * 0.3); c.lineTo(i * w / 24, h); c.stroke(); }
    c.fillStyle = 'rgba(61,240,255,0.8)'; for (const y of [h * 0.3, h * 0.65]) c.fillRect(0, y, w, 4); });
  t.wrapS = THREE.RepeatWrapping; t.repeat.y = 2; t.offset.y = -1; return t;
}
// inside walls: light panels, recessed light strips every few panels, a cyan rail at hand height
export function innerTex() {
  const t = cv(1024, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e9edf0'); g.addColorStop(1, '#aeb7c0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(40,50,60,0.28)'; c.lineWidth = 3; for (let i = 0; i <= 24; i++) { c.beginPath(); c.moveTo(i * w / 24, 0); c.lineTo(i * w / 24, h); c.stroke(); } for (const y of [h / 3, 2 * h / 3]) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let i = 0; i < 24; i += 4) { c.fillStyle = '#fffbe8'; c.fillRect(i * w / 24 + 4, 10, 8, h * 0.5); }
    c.fillStyle = '#3df0ff'; c.fillRect(0, h * 0.62, w, 5); c.fillStyle = '#4b535c'; c.fillRect(0, h - 18, w, 18); });
  t.wrapS = THREE.RepeatWrapping; return t;
}
export class BaseDeco {
  constructor(app, hab) {
    this.app = app; this.hab = hab; const g = hab.group, parts = new Map(), s = hab.side;
    const M = {
      rib: new THREE.MeshBasicMaterial({ color: 0x9aa1aa }), dark: new THREE.MeshBasicMaterial({ color: 0x3c4148 }), led: new THREE.MeshBasicMaterial({ color: 0x3df0ff, side: THREE.DoubleSide }),
      warm: new THREE.MeshBasicMaterial({ color: 0xfff1d6, side: THREE.DoubleSide }), yel: new THREE.MeshBasicMaterial({ color: 0xffb300 }), panel: new THREE.MeshBasicMaterial({ color: 0x1b2a4a, side: THREE.DoubleSide }), frame: new THREE.MeshBasicMaterial({ color: 0xc9ced4 }),
    };
    const put = (m, geo, x = 0, y = 0, z = 0, ry = 0, rx = 0) => { geo.rotateX(rx); geo.rotateY(ry); geo.translate(x, y, z); if (geo.index) geo = geo.toNonIndexed(); geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); (parts.get(m) || parts.set(m, []).get(m)).push(geo); };
    const near = (t, list, a) => list.some(o => Math.abs(Math.atan2(Math.sin(t - o), Math.cos(t - o))) < a);
    // modules: centre (local x), radius, wall height, angles of the openings (angle t: x = sin t, z = cos t)
    const mods = [{ x: 0, r: R, h: H, open: [Math.PI / 2, Math.PI, 3 * Math.PI / 2] }, { x: s * XC, r: R2, h: H + 0.4, open: [s > 0 ? 3 * Math.PI / 2 : Math.PI / 2] }, { x: -s * XC, r: R2, h: H + 0.9, open: [s > 0 ? Math.PI / 2 : 3 * Math.PI / 2] }];
    for (const md of mods) {
      const ro = md.r + 0.06, gap = (DOOR_W / 2 + 0.35) / md.r, n = Math.round(md.r * 3);
      // structural ribs on the outside, and a foot ring
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n * Math.PI * 2; if (near(t, md.open, gap)) continue; put(M.rib, new THREE.BoxGeometry(0.14, md.h + 0.1, 0.1), md.x + Math.sin(t) * (ro + 0.04), (md.h + 0.1) / 2 - 0.05, Math.cos(t) * (ro + 0.04), t); }
      put(M.dark, new THREE.CylinderGeometry(ro + 0.1, ro + 0.14, 0.22, 48, 1, true), md.x, 0.08, 0);
      // LED strip under the eave, outside; inside: a floor-edge strip and a warm light band where wall meets ceiling
      put(M.led, new THREE.TorusGeometry(ro + 0.09, 0.025, 4, 64), md.x, md.h - 0.12, 0, 0, Math.PI / 2);
      put(M.led, new THREE.RingGeometry(md.r - 0.09, md.r - 0.05, 64), md.x, 0.012, 0, 0, -Math.PI / 2);
      put(M.warm, new THREE.CylinderGeometry(md.r - 0.03, md.r - 0.03, 0.06, 64, 1, true), md.x, md.h - 0.06, 0);
      // lit frames around every opening, inside and out
      for (const t of md.open) for (const rr of [md.r - 0.05, ro + 0.03]) { const cx = md.x + Math.sin(t) * rr, cz = Math.cos(t) * rr, hw = DOOR_W / 2 + 0.06;
        for (const k of [-1, 1]) put(M.led, new THREE.BoxGeometry(0.05, DOOR_H, 0.05), cx + Math.cos(t) * hw * k, DOOR_H / 2, cz - Math.sin(t) * hw * k, t);
        put(M.led, new THREE.BoxGeometry(DOOR_W + 0.17, 0.05, 0.05), cx, DOOR_H + 0.03, cz, t); }
    }
    // comms mast with a dish on the main dome
    const top = H + (R + 0.06) * 0.42; put(M.rib, new THREE.CylinderGeometry(0.05, 0.08, 1.6, 8), 0, top + 0.7, 0); put(M.dark, new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), 0, top - 0.02, 0);
    put(M.frame, new THREE.SphereGeometry(0.55, 20, 8, 0, Math.PI * 2, 0, 0.9), 0, 0, 0, 0, 0); { const d = parts.get(M.frame).pop(); d.rotateX(-1.1); d.translate(0.3, top + 1.1, 0.25); parts.get(M.frame).push(d); }
    put(M.rib, new THREE.CylinderGeometry(0.015, 0.015, 0.6, 5), 0, top + 1.75, 0);
    // airlock: hazard stripe posts and LED edges along the ramp
    const z1 = -R - TUN; for (const k of [-1, 1]) { put(M.yel, new THREE.BoxGeometry(0.16, DOOR_H + 0.3, 0.16), k * (DOOR_W / 2 + 0.22), (DOOR_H + 0.3) / 2, z1 - 0.05); put(M.led, new THREE.BoxGeometry(0.04, 0.04, TUN), k * (DOOR_W / 2 + 0.13), DOOR_H + 0.2, z1 + TUN / 2); }
    // solar array behind the base, on the ground, panels tilted towards the equator
    const wp = this.solar = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const lx = -4.5 + i * 3, lz = R + 6 + j * 2.6, [x, z] = hab.world(lx, lz), gy = app.ground(x, z); if (gy == null) continue; wp.push([x, gy, z]); }
    const sp = []; for (const [x, gy, z] of wp) { const yl = gy - hab.floorY;   // in the habitat group's frame
      const [lx, lz] = hab.local(x, z), face = -hab.yaw;   // panels face world south (+z), whatever the base's yaw
      const pg = new THREE.BoxGeometry(2.6, 0.04, 1.4); pg.rotateX(0.32); pg.rotateY(face); pg.translate(lx, yl + 1.0, lz); sp.push(pg);
      put(M.rib, new THREE.CylinderGeometry(0.05, 0.06, 1.0, 6), lx, yl + 0.5, lz); }
    if (sp.length) { const geo = mergeGeometries(sp.map(q => { q.deleteAttribute('normal'); return q; })); g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: cellTex(), color: 0xffffff }))); }
    for (const [m, list] of parts) g.add(new THREE.Mesh(mergeGeometries(list), m));
    // blinking lights: red on the mast, amber over the airlock door
    this.blink = [[0xff3030, 0, top + 2.08, 0], [0xffa020, 0, DOOR_H + 0.62, z1 - 0.08]].map(([c, x, y, z]) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), new THREE.MeshBasicMaterial({ color: c })); o.position.set(x, y, z); g.add(o); return o; });
    this.t = 0;
  }
  canPass(x, z) { for (const [px, , pz] of this.solar) if (Math.hypot(x - px, z - pz) < 1.3) return false; return true; }
  update(dt) { this.t += dt; const on = this.t % 1.6 < 0.25; this.blink[0].visible = on; this.blink[1].visible = this.t % 1.0 < 0.5; }
}
// solar cells: dark blue grid with thin silver lines (a box's faces all reuse it, which reads fine at this size)
function cellTex() { return cv(256, 128, (c, w, h) => { c.fillStyle = '#16264a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(190,210,240,0.5)'; c.lineWidth = 1; for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * w / 16, 0); c.lineTo(i * w / 16, h); c.stroke(); } for (let j = 0; j <= 6; j++) { c.beginPath(); c.moveTo(0, j * h / 6); c.lineTo(w, j * h / 6); c.stroke(); } c.strokeStyle = '#c9ced4'; c.lineWidth = 4; c.strokeRect(0, 0, w, h); }); }
