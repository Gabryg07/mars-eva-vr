// @ts-nocheck
// Perseverance follower. Uses the supplied GLB (metric, nose +Z, wheels on y=0).
// A small placeholder stays visible until that mesh finishes loading.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BODY = 0xd7d2c8, GOLD = 0xb08d57, DARK = 0x2a2420, LENS = 0x7ec8c3;
const MODEL_URL = `${import.meta.env.BASE_URL}models/perseverance.glb`;
// Real rover is ~4.1 m long; keep the nose clear of the suit.
const FOLLOW = 8.4;

function mat(color, rough = 0.7) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.25 });
}

function buildPlaceholder() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.42, 2.05), mat(BODY, 0.55));
  body.position.y = 0.92; g.add(body);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.15, 8), mat(0xeeeae4, 0.4));
  mast.position.set(0, 1.75, 0.35); g.add(mast);
  const wheels = [];
  const wgeo = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 10);
  const wmat = mat(DARK, 0.85);
  for (const [x, z] of [[-0.72, 0.7], [-0.72, -0.7], [0.72, 0.7], [0.72, -0.7]]) {
    const w = new THREE.Mesh(wgeo, wmat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.26, z); g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;
  return g;
}

export class Rover {
  constructor(app) {
    this.app = app;
    this.group = new THREE.Group();
    this.group.name = 'perseverance';
    this.placeholder = buildPlaceholder();
    this.group.add(this.placeholder);
    app.world.add(this.group);
    this.trail = [];
    this.spin = 0;
    this.model = null;
    this.loadModel();
  }
  loadModel() {
    const loader = new GLTFLoader();
    loader.load(MODEL_URL, (gltf) => {
      const model = gltf.scene;
      model.name = 'perseverance-mesh';
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = false;
        o.receiveShadow = false;
        o.frustumCulled = true;
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of list) {
          if (!m) continue;
          // Opaque panels stay double-sided (authored that way). Glass shouldn't write depth.
          if (m.transparent && m.opacity < 0.99) m.depthWrite = false;
        }
      });
      this.group.add(model);
      this.model = model;
      this.group.remove(this.placeholder);
      this.placeholder.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      this.placeholder = null;
    }, undefined, () => {
      // Placeholder stays if the mesh cannot be fetched.
    });
  }
  reset() { this.trail.length = 0; }
  update(dt, pos) {
    const show = this.app.settings?.rover !== false;
    this.group.visible = show;
    if (!show) return;
    const hab = this.app.habitat;
    const inside = hab?.inside(pos);
    if (!inside) {
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(pos.x - last.x, pos.z - last.z) > 0.5) this.trail.push({ x: pos.x, z: pos.z });
      if (this.trail.length > 2400) this.trail.splice(0, this.trail.length - 2400);
    }
    let tx, tz, dx, dz;
    if (inside && hab) {
      tx = hab.park.x; tz = hab.park.z;
      dx = hab.fx; dz = hab.fz;
    } else {
      const behind = this.pointBehind(FOLLOW);
      tx = behind.x; tz = behind.z;
      dx = behind.dx; dz = behind.dz;
    }
    const gy = this.app.ground(tx, tz);
    if (gy == null) return;
    const p = this.group.position;
    const k = 1 - Math.exp(-dt * 2.2);
    p.x += (tx - p.x) * k; p.z += (tz - p.z) * k; p.y += (gy - p.y) * Math.min(1, dt * 8);
    if (Math.hypot(dx, dz) > 0.001) {
      const yaw = Math.atan2(dx, dz);
      let d = yaw - this.group.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.group.rotation.y += d * Math.min(1, dt * 3.2);
    }
    const speed = Math.hypot((tx - p.x), (tz - p.z));
    this.spin += speed * 0.55;
    const wheels = this.placeholder?.userData.wheels;
    if (wheels) for (const w of wheels) w.rotation.x = this.spin;
  }
  pointBehind(dist) {
    const tr = this.trail;
    if (tr.length < 2) {
      const hab = this.app.habitat;
      return { x: hab.park.x, z: hab.park.z, dx: hab.fx, dz: hab.fz };
    }
    let remain = dist;
    let i = tr.length - 1;
    let ax = tr[i].x, az = tr[i].z;
    while (i > 0) {
      const b = tr[i - 1];
      const seg = Math.hypot(ax - b.x, az - b.z) || 1e-4;
      if (seg >= remain) {
        const t = remain / seg;
        return { x: ax + (b.x - ax) * t, z: az + (b.z - az) * t, dx: ax - b.x, dz: az - b.z };
      }
      remain -= seg; ax = b.x; az = b.z; i--;
    }
    const a = tr[1], b = tr[0];
    return { x: b.x, z: b.z, dx: a.x - b.x, dz: a.z - b.z };
  }
}
