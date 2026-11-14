// Surface habitat at the base: a small pressurised module with an airlock tunnel. The EVA starts and ends inside it.
// Scenario element (not NASA data): its position is the "base" point of the site file.
import * as THREE from 'three';
import { T, num } from './i18n.js';
const R = 4.2, H = 2.6, DOOR_W = 1.5, DOOR_H = 2.1, TUN = 2.4, RAMP = 2.2;
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const panels = (base, line, cols, rows, extra) => tex(1024, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, base[0]); g.addColorStop(1, base[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = line; c.lineWidth = 3; for (let i = 0; i <= cols; i++) { c.beginPath(); c.moveTo(i * w / cols, 0); c.lineTo(i * w / cols, h); c.stroke(); } for (let j = 1; j < rows; j++) { c.beginPath(); c.moveTo(0, j * h / rows); c.lineTo(w, j * h / rows); c.stroke(); } extra?.(c, w, h); });
export class Habitat {
  constructor(app, cx, cz, yaw) {
    this.app = app; this.cx = cx; this.cz = cz; this.yaw = yaw; this.cos = Math.cos(yaw); this.sin = Math.sin(yaw);
    let top = -Infinity; for (let a = 0; a < 16; a++) for (const r of [0, R * 0.6, R + 0.3]) { const y = app.ground(cx + Math.cos(a * 0.3927) * r, cz + Math.sin(a * 0.3927) * r); if (y != null && y > top) top = y; }
    this.floorY = top + 0.12; const g = this.group = new THREE.Group(); g.position.set(cx, this.floorY, cz); g.rotation.y = yaw;
    const mat = (map, side = THREE.DoubleSide) => new THREE.MeshBasicMaterial({ map, side }), col = (c, side = THREE.DoubleSide) => new THREE.MeshBasicMaterial({ color: c, side });
    const a = Math.asin(DOOR_W / 2 / R), add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
    const outT = panels(['#e9e2d8', '#b9a795'], 'rgba(60,40,30,0.35)', 24, 2), inT = panels(['#dfe4e8', '#aab2ba'], 'rgba(40,50,60,0.3)', 24, 3, (c, w, h) => { c.fillStyle = '#ff9a52'; c.fillRect(0, h * 0.62, w, 6); });
    outT.wrapS = inT.wrapS = THREE.RepeatWrapping;
    add(new THREE.CylinderGeometry(R + 0.06, R + 0.06, H, 48, 1, true, Math.PI + a, 2 * Math.PI - 2 * a), mat(outT, THREE.FrontSide), 0, H / 2);
    add(new THREE.CylinderGeometry(R, R, H, 48, 1, true, Math.PI + a, 2 * Math.PI - 2 * a), mat(inT, THREE.BackSide), 0, H / 2);
    add(new THREE.CylinderGeometry(R + 0.03, R + 0.03, H - DOOR_H, 6, 1, true, Math.PI - a, 2 * a), col(0xbfb2a2), 0, DOOR_H + (H - DOOR_H) / 2);
    const dome = add(new THREE.SphereGeometry(R + 0.06, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), col(0xd9d0c4, THREE.FrontSide), 0, H); dome.scale.y = 0.42;
    const ceil = add(new THREE.SphereGeometry(R, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), col(0xc9d0d6, THREE.BackSide), 0, H); ceil.scale.y = 0.4;
    add(new THREE.CircleGeometry(R * 0.35, 32).rotateX(Math.PI / 2), col(0xfff6e0), 0, H + R * 0.4 * 0.93);                         // ceiling light
    const floorT = tex(512, 512, (c, w, h) => { c.fillStyle = '#4a4f55'; c.fillRect(0, 0, w, h); c.strokeStyle = '#30343a'; c.lineWidth = 4; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } });
    add(new THREE.CircleGeometry(R, 48).rotateX(-Math.PI / 2), mat(floorT), 0, 0.005);
    add(new THREE.CylinderGeometry(R + 0.25, R + 0.4, 1.6, 48, 1, true), col(0x6b5a4c), 0, -0.8);
    // airlock tunnel (towards local -z), ramp down to the ground
    const z0 = -R + 0.25, z1 = -R - TUN, zm = (z0 + z1) / 2, L = z0 - z1, grey = col(0xcfd4d8), dark = col(0x555b62), shell = col(0xc8bcae);
    add(new THREE.PlaneGeometry(L, DOOR_H).rotateY(Math.PI / 2), grey, -DOOR_W / 2, DOOR_H / 2, zm); add(new THREE.PlaneGeometry(L, DOOR_H).rotateY(Math.PI / 2), grey, DOOR_W / 2, DOOR_H / 2, zm);
    add(new THREE.PlaneGeometry(DOOR_W, L).rotateX(Math.PI / 2), grey, 0, DOOR_H, zm); add(new THREE.PlaneGeometry(DOOR_W, L).rotateX(-Math.PI / 2), dark, 0, 0.004, zm);
    for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(L, DOOR_H + 0.15).rotateY(Math.PI / 2), shell, sx * (DOOR_W / 2 + 0.12), DOOR_H / 2 + 0.07, zm); add(new THREE.PlaneGeometry(DOOR_W + 0.24, L).rotateX(Math.PI / 2), shell, 0, DOOR_H + 0.15, zm);
    const endY = (app.ground(...this.world(0, z1 - RAMP)) ?? this.floorY) - this.floorY; this.rampEnd = endY;
    const ramp = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W + 0.3, Math.hypot(RAMP, endY)), col(0x666c73)); ramp.position.set(0, endY / 2, z1 - RAMP / 2); ramp.rotation.x = -Math.PI / 2 - Math.atan2(endY, RAMP); g.add(ramp);
    this.door = add(new THREE.PlaneGeometry(DOOR_W, DOOR_H), mat(tex(256, 360, (c, w, h) => { c.fillStyle = '#8f979f'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb300'; for (let i = -4; i < 8; i++) { c.beginPath(); c.moveTo(i * 60, h); c.lineTo(i * 60 + 30, h); c.lineTo(i * 60 + 90, h - 60); c.lineTo(i * 60 + 60, h - 60); c.fill(); } c.fillStyle = '#20252b'; c.font = '700 40px system-ui'; c.textAlign = 'center'; c.fillText('AIRLOCK', w / 2, 90); c.fillRect(w / 2 - 50, 130, 100, 70); })), 0, DOOR_H / 2, z1 + 0.02); this.door.rotation.y = Math.PI; this.door.material.side = THREE.FrontSide; { const d2 = new THREE.Mesh(this.door.geometry, this.door.material); d2.rotation.y = Math.PI; this.door.add(d2); }
    // interior: two wall screens and a workbench
    const screen = (colr, ang) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const m = add(new THREE.PlaneGeometry(1.5, 0.94), mat(t, THREE.FrontSide), Math.sin(ang) * (R - 0.08), 1.55, Math.cos(ang) * (R - 0.08)); m.rotation.y = ang + Math.PI;
      return lines => { const c = cv.getContext('2d'), w = 512, h = 320; c.fillStyle = '#0c1418'; c.fillRect(0, 0, w, h); c.strokeStyle = colr; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12); lines.forEach((s, i) => { c.fillStyle = i ? '#e8f4ff' : colr; c.font = `${i ? 500 : 700} ${i ? 34 : 40}px system-ui`; c.fillText(s, 30, 70 + i * 54); }); t.needsUpdate = true; }; };
    const scr = [screen('#5be08a', 0.9), screen('#7fe0ff', -0.9)], ms = app.site.mission, km = app.site.legs.reduce((a, l) => a + l.length, 0) / 1000;
    this.redraw = () => { scr[0](['JEZERO BASE', T('Cabina 101 kPa · 21 °C'), 'O₂ 21% · CO₂ ' + num(0.04, 2) + '%', T('Tuta: pronta'), T(app.started ? 'Airlock: libero' : 'Airlock: chiuso')]);
      scr[1](['EVA-1', T`${app.site.legs.length - 1} tappe · ${num(km, 1)} km`, T('Rientro prima del tramonto'), T`Riserva O₂ ${Math.round(ms.oxygen.reserveFraction * 100)}%`, T('Segui la linea azzurra')]); }; this.redraw();
    add(new THREE.BoxGeometry(2.2, 0.9, 0.7), col(0x7d858d), 0, 0.45, R - 0.75); add(new THREE.BoxGeometry(2.2, 0.06, 0.8), col(0xdfe4e8), 0, 0.93, R - 0.75);
    const sign = tex(512, 128, (c, w, h) => { c.fillStyle = '#1b1714'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffb37a'; c.font = '700 64px system-ui'; c.textAlign = 'center'; c.fillText('JEZERO BASE', w / 2, 86); });
    add(new THREE.PlaneGeometry(1.5, 0.38), mat(sign), 0, DOOR_H + 0.45, z1 - 0.02).rotation.y = Math.PI;
    app.world.add(g);
  }
  world(lx, lz) { return [this.cx + lx * this.cos + lz * this.sin, this.cz - lx * this.sin + lz * this.cos]; }
  local(x, z) { const dx = x - this.cx, dz = z - this.cz; return [dx * this.cos - dz * this.sin, dx * this.sin + dz * this.cos]; }
  inside(x, z) { const [lx, lz] = this.local(x, z); return Math.hypot(lx, lz) < R - 0.2; }
  startPos() { return this.world(0, 1.0); }
  groundY(x, z) { const [lx, lz] = this.local(x, z), r = Math.hypot(lx, lz), z1 = -R - TUN;
    if (r < R + 0.05) return this.floorY; if (Math.abs(lx) < DOOR_W / 2 + 0.15) { if (lz <= 0 && lz >= z1) return this.floorY; if (lz < z1 && lz > z1 - RAMP) return this.floorY + this.rampEnd * (z1 - lz) / RAMP; } return null; }
  canPass(x, z) { const [lx, lz] = this.local(x, z), r = Math.hypot(lx, lz), inDoor = Math.abs(lx) < DOOR_W / 2 - 0.2 && lz < 0;
    if (Math.abs(r - R) < 0.4 && !inDoor) return false; if (lz < -R + 0.2 && lz > -R - TUN - 0.2 && Math.abs(lx) >= DOOR_W / 2 - 0.2 && Math.abs(lx) < DOOR_W / 2 + 0.5) return false; return true; }
  update(dt, pos) { const [lx, lz] = this.local(pos.x, pos.z), near = this.app.started && Math.abs(lx) < 2.5 && lz < -R + 2.5 && lz > -R - TUN - 3.5, y = this.door.position.y, ty = near ? DOOR_H * 1.5 - 0.05 : DOOR_H / 2; this.door.position.y += (ty - y) * Math.min(1, dt * 4); }
}
