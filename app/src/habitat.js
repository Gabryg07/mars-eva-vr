// @ts-nocheck
// Small surface habitat. The EVA starts inside and ends only when the astronaut steps back in.
import * as THREE from 'three';
import { Panel, rrect, text } from './ui.js';

const SHELL = 0xc9bfb2, TRIM = 0xe07a3d, GLASS = 0x17343a;

export class Habitat {
  constructor(app, basePoi, nextPoi) {
    this.app = app;
    const x = basePoi.x, z = -basePoi.y;
    const y = app.ground(x, z) || 0;
    this.cx = x; this.cz = z; this.cy = y;
    const fdx = nextPoi.x - x, fdz = -nextPoi.y - z;
    const fl = Math.hypot(fdx, fdz) || 1;
    this.fx = fdx / fl; this.fz = fdz / fl;
    this.rx = this.fz; this.rz = -this.fx;
    this.rIn = 2.45; this.rOut = 3.2; this.doorHalf = 0.62;
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    app.world.add(this.group);
    this._build();
    this.spawn = { x: x - this.fx * 0.55, z: z - this.fz * 0.55, yaw: Math.atan2(-this.fx, -this.fz) };
    this.park = { x: x + this.fx * (this.rOut + 5.8) + this.rx * 3.6, z: z + this.fz * (this.rOut + 5.8) + this.rz * 3.6 };
    this.ped = {
      x: x - this.rx * 1.65 + this.fx * 0.05,
      z: z - this.rz * 1.65 + this.fz * 0.05,
      y: y,
    };
    this.departed = false;
    this._wasInside = true;
    this.buttons = [];
    this._panel();
  }
  _mesh(geo, color, x, y, z, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.18 }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); this.group.add(m); return m;
  }
  _build() {
    const yaw = Math.atan2(this.fx, this.fz);
    this.group.rotation.y = yaw;
    // local +Z is door / outward after this yaw? 
    // We rotated the group so local +Z aligns with world forward (fx,fz) if rotation.y = atan2(fx, fz)
    // because local +Z maps to (sin yaw, cos yaw) = (fx, fz). Yes.
    this._mesh(new THREE.CylinderGeometry(3.05, 3.15, 0.12, 28), 0x4a3428, 0, 0.06, 0);
    const wallH = 2.15, thick = 0.18;
    const segs = 48;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const rel = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
      if (Math.abs(rel) < this.doorHalf + 0.06) continue;
      const r = 2.82;
      this._mesh(new THREE.BoxGeometry(0.46, wallH, thick), SHELL, Math.cos(a) * r, 1.15, Math.sin(a) * r, 0, -a + Math.PI / 2, 0);
    }
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.95, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: SHELL, roughness: 0.78, metalness: 0.12, side: THREE.DoubleSide }),
    );
    dome.position.y = 2.05; this.group.add(dome);
    // door frame in local space, opening toward +Z
    this._mesh(new THREE.BoxGeometry(0.14, 2.05, 0.22), TRIM, -1.55, 1.05, 2.9);
    this._mesh(new THREE.BoxGeometry(0.14, 2.05, 0.22), TRIM, 1.55, 1.05, 2.9);
    this._mesh(new THREE.BoxGeometry(3.3, 0.14, 0.22), TRIM, 0, 2.08, 2.9);
    this._mesh(new THREE.BoxGeometry(2.4, 0.08, 1.6), 0x6b5344, 0, 0.1, 3.7);
    // windows
    const glass = new THREE.MeshStandardMaterial({ color: GLASS, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 });
    for (const a of [Math.PI, Math.PI * 0.62, Math.PI * 1.38]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.06), glass);
      w.position.set(Math.cos(a) * 2.95, 1.45, Math.sin(a) * 2.95);
      w.lookAt(0, 1.45, 0); this.group.add(w);
    }
    // antenna + solar outside
    this._mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.4, 8), 0xeeeae4, -1.6, 3.3, 1.2);
    this._mesh(new THREE.BoxGeometry(1.4, 0.05, 0.7), 0x223246, -2.4, 1.3, 2.2, -0.6, 0.4, 0);
    this._mesh(new THREE.BoxGeometry(1.4, 0.05, 0.7), 0x223246, 2.3, 1.15, 2.0, -0.5, -0.3, 0);
    const crate = this._mesh(new THREE.BoxGeometry(0.7, 0.45, 0.45), 0x8a5a32, -1.3, 0.35, -0.4);
    crate.rotation.y = 0.4;
    const light = new THREE.PointLight(0xffc9a0, 2.4, 9, 2);
    light.position.set(0, 2.1, 0); this.group.add(light);
    const sign = new Panel(1.1, 0.32, 700, { depthTest: true });
    sign.draw((c, W, H) => {
      rrect(c, 2, 2, W - 4, H - 4, 18); c.fillStyle = '#1c120e'; c.fill(); c.strokeStyle = '#e07a3d'; c.lineWidth = 6; c.stroke();
      text(c, 'BASE  ·  AIRLOCK', W / 2, H * 0.68, 54, '#f4e6d8', 700, 'center');
    });
    sign.mesh.position.set(0, 2.45, 3.15); this.group.add(sign.mesh);
    // arrow on the floor toward the door
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 4), new THREE.MeshStandardMaterial({ color: TRIM, roughness: 0.4 }));
    arrow.rotation.x = Math.PI / 2; arrow.position.set(0, 0.16, 1.3); this.group.add(arrow);
  }
  _panel() {
    // settings wall, local -X side, facing inward
    this.panel = new Panel(1.15, 0.72, 640, { depthTest: true });
    this.panel.mesh.position.set(-2.15, 1.35, -0.2);
    this.panel.mesh.rotation.y = Math.PI / 2;
    this.group.add(this.panel.mesh);
    this.redrawPanel();
  }
  redrawPanel() {
    const L = (a, b) => this.app.L(a, b);
    const en = this.app.lang === 'en';
    this.panel.draw((c, W, H) => {
      rrect(c, 4, 4, W - 8, H - 8, 22); c.fillStyle = 'rgba(20,12,9,0.92)'; c.fill(); c.strokeStyle = '#e07a3d'; c.lineWidth = 8; c.stroke();
      text(c, L('IMPOSTAZIONI', 'SETTINGS'), 28, 54, 36, '#ffb37a', 700);
      text(c, L('Grilletto sul globo: prendilo. Stick di quella mano: scala.', 'Trigger on the globe: grab it. That hand\'s stick: scale.'), 28, 132, 22, '#f4e6d8');
      text(c, L('Esci dalla porta, poi rientra.', 'Leave through the door, then come back.'), 28, H - 36, 24, '#f4e6d8');
    });
    for (const b of this.buttons) { this.group.remove(b.mesh); b.mesh.geometry.dispose(); b.tex?.dispose?.(); }
    this.buttons.length = 0;
    const mk = (label, y, action) => {
      const b = new Panel(0.72, 0.28, 700, { depthTest: true });
      b.mesh.position.set(-1.92, y, 0.05);
      b.mesh.rotation.y = Math.PI / 2;
      b.draw((c, W, H) => {
        rrect(c, 3, 3, W - 6, H - 6, 22); c.fillStyle = '#3a2418'; c.fill(); c.strokeStyle = '#7ec8c3'; c.lineWidth = 8; c.stroke();
        text(c, label, W / 2, H * 0.66, 48, '#f4e6d8', 700, 'center');
      });
      b.mesh.userData.onSelect = action;
      this.group.add(b.mesh); this.buttons.push(b);
    };
    mk(en ? 'ENGLISH' : 'ITALIANO', 1.72, () => this.app.setLang(en ? 'it' : 'en'));
    mk(this.app.settings.rover === false ? L('ROVER OFF', 'ROVER OFF') : 'ROVER', 1.28, () => { this.app.settings.rover = this.app.settings.rover === false; this.redrawPanel(); });
    mk(L('RESET', 'RESET'), 0.84, () => this.app.reset());
    this._handCard();
  }
  _handCard() {
    if (!this.handCard) {
      this.handCard = new Panel(0.26, 0.18, 1200, { depthTest: false });
      this.handCard.mesh.position.set(0, 0.07, -0.16);
      this.handCard.mesh.rotation.x = -1.05;
      this.handCard.mesh.renderOrder = 220;
      this.handCard.mesh.visible = false;
    }
    const L = (a, b) => this.app.L(a, b);
    this.handCard.draw((c, W, H) => {
      rrect(c, 6, 6, W - 12, H - 12, 28); c.fillStyle = 'rgba(20,12,9,0.9)'; c.fill(); c.strokeStyle = '#e07a3d'; c.lineWidth = 8; c.stroke();
      text(c, L('SX  cammina', 'L   walk'), 22, 52, 36, '#f4e6d8', 700);
      text(c, L('DX  gira / teletrasporto', 'R   turn / teleport'), 22, 100, 32, '#7ec8c3', 700);
      text(c, L('Grilletto  globo e tasti', 'Trigger  globe and keys'), 22, 150, 30, '#ffb37a', 600);
      text(c, L('Stick in mano  scala', 'Held stick  scale'), 22, 196, 30, '#f4e6d8', 600);
    });
  }
  interactives() {
    return this.buttons.map(b => b.mesh);
  }
  _ang(x, z) {
    const dx = x - this.cx, dz = z - this.cz;
    const cross = this.fx * dz - this.fz * dx;
    const dot = this.fx * dx + this.fz * dz;
    return { r: Math.hypot(dx, dz), ang: Math.atan2(cross, dot) };
  }
  canStand(x, z) {
    const { r, ang } = this._ang(x, z);
    if (r >= this.rIn && r <= this.rOut && Math.abs(ang) >= this.doorHalf) return false;
    return true;
  }
  inside(pos) {
    return this._ang(pos.x, pos.z).r < this.rIn - 0.08;
  }
  update(pos) {
    const inn = this.inside(pos);
    if (this._wasInside && !inn) this.departed = true;
    this._wasInside = inn;
    const mesh = this.handCard?.mesh;
    if (!mesh) return;
    const xr = this.app.renderer.xr.isPresenting;
    const left = this.app.player?.hands?.left;
    if (xr && left) {
      if (mesh.parent !== left) left.add(mesh);
      mesh.visible = true;
    } else mesh.visible = false;
  }
}
