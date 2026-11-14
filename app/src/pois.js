// @ts-nocheck
// Points of interest: beacon, name tag, and a card with four real rover frames.
import * as THREE from 'three';
import { Panel, rrect, text, wrap, fmtDist } from './ui.js';
import { poiEn } from './strings.ts';
const COL = { base: 0xffd166, science: 0x58d6ff, done: 0x5be08a };

function cover(c, img, x, y, w, h) {
  const ir = img.width / img.height, r = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ir > r) { sw = img.height * r; sx = (img.width - sw) / 2; } else { sh = img.width / r; sy = (img.height - sh) / 2; }
  c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export class Pois {
  constructor(app, base) {
    this.app = app; this.group = new THREE.Group(); this.items = [];
    const beaconGeo = new THREE.CylinderGeometry(0.22, 0.22, 80, 8, 1, true).translate(0, 40, 0);
    const legs = Object.fromEntries((app.site.legs || []).map(l => [l.frm, l]));
    const gallery = app.gallery?.stops || {};
    for (const p of app.site.pois) {
      const g = new THREE.Group(); g.position.set(p.x, app.ground(p.x, -p.y), -p.y);
      const beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: COL[p.kind] || COL.science, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
      if (p.kind === 'base') beacon.position.y = 3.6;
      g.add(beacon);
      const tag = new Panel(4, 1, 128, { depthTest: true });
      tag.draw((c, W, H) => { rrect(c, 2, 2, W - 4, H - 4, 30); c.fillStyle = 'rgba(14,9,6,0.72)'; c.fill(); text(c, p.name, W / 2, H * 0.68, 64, '#fff', 700, 'center'); });
      tag.mesh.position.y = 7; tag.mesh.rotation.order = 'YXZ'; g.add(tag.mesh);
      const wide = p.kind !== 'base';
      const card = new Panel(wide ? 2.7 : 2.2, wide ? 1.85 : 1.35, wide ? 420 : 460, { depthTest: true });
      card.mesh.visible = false; g.add(card.mesh);
      const photos = (gallery[p.id] || []).slice(0, 4);
      const it = { p, g, beacon, tag, card, leg: legs[p.id], photos, imgs: photos.map(() => null) };
      this.items.push(it); this.group.add(g); this.drawCard(it);
      photos.forEach((ph, i) => {
        const im = new Image(); im.crossOrigin = 'anonymous';
        im.onload = () => { it.imgs[i] = im; this.drawCard(it); };
        im.src = base + ph.file;
      });
    }
  }
  copyOf(p) {
    if (this.app.lang === 'en' && poiEn[p.id]) return { title: poiEn[p.id].title, text: poiEn[p.id].text };
    return { title: p.title, text: p.text };
  }
  drawCard(it) {
    const { p, leg, photos, imgs } = it;
    const copy = this.copyOf(p);
    const L = (a, b) => this.app.L(a, b);
    it.card.draw((c, W, H) => {
      rrect(c, 4, 4, W - 8, H - 8, 28); c.fillStyle = 'rgba(16,10,7,0.92)'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#ffb37a'; c.stroke();
      text(c, copy.title, 28, 48, 32, '#fff', 700);
      if (!photos.length) {
        wrap(c, copy.text, 28, 96, W - 56, 26, 34, '#fff', 400);
        return;
      }
      const gap = 14, top = 68, cols = 2, pw = (W - 56 - gap) / cols, ph = 250;
      photos.forEach((ph, i) => {
        const x = 28 + (i % cols) * (pw + gap), y = top + Math.floor(i / cols) * (ph + 36);
        c.fillStyle = '#2a1a12'; c.fillRect(x, y, pw, ph);
        if (imgs[i]) cover(c, imgs[i], x, y, pw, ph);
        text(c, `${ph.camera} · sol ${ph.sol}`, x, y + ph + 24, 18, '#ffb37a', 600);
      });
      const y = top + 2 * (ph + 36) + 8;
      wrap(c, copy.text, 28, y, W - 56, 22, 28, '#f4e6d8', 400);
      text(c, L('Fonte: raw Mars 2020, NASA/JPL-Caltech', 'Source: Mars 2020 raw feed, NASA/JPL-Caltech'), 28, H - 28, 18, '#7ec8c3', 500);
      if (leg) text(c, `${L('Poi', 'Then')} ${this.app.mission.pois[leg.to].name} · ${fmtDist(leg.length)} · max ${Math.round(leg.maxSlope)}°`, W - 28, H - 28, 18, '#d9c4b2', 500, 'right');
    });
  }
  redraw() { for (const it of this.items) this.drawCard(it); }
  update(cam) {
    const m = this.app.mission, tgt = m.target;
    let near = null;
    for (const it of this.items) {
      const dx = it.g.position.x - cam.x, dz = it.g.position.z - cam.z, d = Math.hypot(dx, dz), face = Math.atan2(-dx, -dz);
      const d3 = Math.hypot(d, cam.y - it.g.position.y), s = Math.max(1, d3 / 120); it.beacon.scale.set(s, 1, s);
      const col = it.p.kind === 'base' ? COL.base : m.visited.has(it.p.id) ? COL.done : COL.science;
      it.beacon.material.color.setHex(col); it.beacon.material.opacity = tgt && tgt.id === it.p.id ? 0.85 : 0.4;
      const ts = Math.max(1, d3 / 28); it.tag.mesh.scale.setScalar(ts); it.tag.mesh.position.y = (it.p.kind === 'base' ? 8 : 5) + 2.2 * ts;
      it.tag.mesh.rotation.set(0, face, 0); it.tag.mesh.visible = d3 > 14;
      if (this.app.player.lift) this.app.camera.getWorldQuaternion(it.tag.mesh.quaternion);
      const insideBase = it.p.kind === 'base' && this.app.habitat?.inside(cam);
      if (insideBase) it.anchored = false;
      else if (d < 12 && !it.anchored && it.p.title && !this.app.player.lift) {
        const a = this.app.player.headYaw() - 0.55, ux = -Math.sin(a), uz = -Math.cos(a), r = 2.6;
        it.card.mesh.position.set(cam.x + ux * r - it.g.position.x, cam.y - it.g.position.y, cam.z + uz * r - it.g.position.z);
        it.card.mesh.rotation.y = Math.atan2(-ux, -uz); it.anchored = true;
      }
      if (d > 22 || insideBase) it.anchored = false;
      it.card.mesh.visible = !!it.anchored;
      if (it.p.kind !== 'base' && it.photos.length && d < 14 && (!near || d < near.d)) near = { id: it.p.id, d, photos: it.photos, title: this.copyOf(it.p).title, text: this.copyOf(it.p).text };
    }
    this.near = near;
  }
}
