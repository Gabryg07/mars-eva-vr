// @ts-nocheck
// Mars globe: grip/trigger grabs it onto the Quest controller; the holding stick scales it.
import * as THREE from 'three';

const MIN_R = 0.06, MAX_R = 2.3;

export class MarsGlobe {
  constructor(app, home) {
    this.app = app;
    this.home = home;
    this.radius = 0.22 * (app.settings.globeScale || 1);
    this.heldBy = null;
    this.pivot = new THREE.Group();
    this.pivot.position.set(home.x, home.y + 0.95, home.z);
    app.world.add(this.pivot);
    const geo = new THREE.SphereGeometry(1, 48, 32);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc46a3a, roughness: 0.92, metalness: 0.02 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.pivot.add(this.mesh);
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.06, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffb080, transparent: true, opacity: 0.16, side: THREE.BackSide }));
    this.pivot.add(atmo);
    this.pivot.scale.setScalar(this.radius);
    this.mesh.userData.globe = true;
    new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/mars.jpg`, tex => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; mat.map = tex; mat.needsUpdate = true;
    });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.72, 16), new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.7 }));
    stand.position.set(home.x, home.y + 0.36, home.z);
    app.world.add(stand);
    this._v = new THREE.Vector3();
    this.makeButtons();
  }
  makeButtons() {
    // tiny +/- plates beside the pedestal, laser-selectable in VR and by click on PC
    const L = (a, b) => this.app.L(a, b);
    this.plates = [];
    const add = (label, ox, color, action) => {
      const geo = new THREE.BoxGeometry(0.3, 0.14, 0.3);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.45 }));
      m.position.set(this.home.x + ox, this.home.y + 0.52, this.home.z);
      m.userData.onSelect = action;
      this.app.world.add(m);
      this.plates.push(m);
      return m;
    };
    add('-', -0.46, 0x6b5344, () => this.scaleBy(0.82));
    add('+', 0.46, 0xe07a3d, () => this.scaleBy(1.22));
    this.label = L;
  }
  scaleBy(f) {
    this.radius = Math.min(MAX_R, Math.max(MIN_R, this.radius * f));
    this.pivot.scale.setScalar(this.radius);
    this.app.settings.globeScale = this.radius / 0.22;
  }
  setFactor(f) {
    this.radius = Math.min(MAX_R, Math.max(MIN_R, 0.22 * f));
    this.pivot.scale.setScalar(this.radius);
  }
  grab(controller) {
    if (this.heldBy === controller) return;
    if (this.heldBy) this.drop();
    this.heldBy = controller;
    controller.attach(this.pivot);
    this.pulse(controller);
  }
  drop() {
    if (!this.heldBy) return;
    this.app.world.attach(this.pivot);
    this.heldBy = null;
    const y = this.app.ground(this.pivot.position.x, this.pivot.position.z);
    if (y != null && this.pivot.position.y < y + this.radius) this.pivot.position.y = y + this.radius;
  }
  toggle(controller) {
    if (this.heldBy === controller) this.drop();
    else this.grab(controller);
  }
  pulse(c) {
    const gp = c?.userData?.src?.gamepad;
    const h = gp && (gp.hapticActuators?.[0] || gp.vibrationActuator);
    h?.pulse?.(0.55, 40);
  }
  nearController(c, extra = 0) {
    c.getWorldPosition(this._v);
    this.pivot.getWorldPosition(this._tmp || (this._tmp = new THREE.Vector3()));
    return this._v.distanceTo(this._tmp) < Math.max(0.5, this.radius + 0.28) + extra;
  }
  preUpdate(dt) {
    const player = this.app.player;
    player.suppressLeft = false; player.suppressRight = false;
    if (!this.heldBy) {
      this.mesh.rotation.y += dt * 0.18;
      return;
    }
    const hand = this.heldBy.userData.hand;
    if (hand === 'left') player.suppressLeft = true;
    if (hand === 'right') player.suppressRight = true;
    const pad = player._pad(hand);
    if (pad && Math.abs(pad.y) > 0.22) this.scaleBy(Math.exp(-pad.y * dt * 1.15));
  }
  objects() {
    return [this.mesh, ...this.plates];
  }
}
