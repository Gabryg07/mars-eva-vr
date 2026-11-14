// Helmet visor: a dark rim around the field of view with a soft inner edge and a thin highlight, as seen from inside an EVA helmet.
// Built as a ring with a hole (not a full-screen quad) so the centre of the view costs nothing to draw on a headset.
import * as THREE from 'three';
export class Helmet {
  constructor(app) {
    this.app = app; const g = new THREE.Group(); this.group = g; g.position.z = -0.3; g.renderOrder = 300; app.camera.add(g);
    const ring = (r0, r1, a0, a1, col) => { const N = 96, pos = [], colr = [], idx = [], c = new THREE.Color(col);
      for (let i = 0; i <= N; i++) { const t = i / N * Math.PI * 2, x = Math.cos(t), y = Math.sin(t); pos.push(x * r0, y * r0, 0, x * r1, y * r1, 0); colr.push(c.r, c.g, c.b, a0, c.r, c.g, c.b, a1); }
      for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 4)); geo.setIndex(idx);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); m.frustumCulled = false; m.renderOrder = 300; g.add(m); return m; };
    ring(0.80, 0.93, 0, 0.55, 0x0a0706);      // soft shadow cast by the rim onto the visor
    ring(0.93, 1.0, 0.55, 1, 0x14100e);       // padding
    ring(1.0, 6.0, 1, 1, 0x1b1714);           // helmet shell
    ring(0.925, 0.94, 0.0, 0.5, 0xffc9a0);    // seal highlight catching the Martian light
    ring(0.94, 0.955, 0.5, 0.0, 0xffc9a0);
  }
  update() {   // fit the opening to what the display can actually show
    const xr = this.app.renderer.xr.isPresenting, cam = this.app.camera, d = 0.3;
    if (xr) this.group.scale.set(0.335, 0.305, 1);
    else { const hh = Math.tan(cam.fov * Math.PI / 360) * d, hw = hh * cam.aspect; this.group.scale.set(hw * 1.06, hh * 1.1, 1); }
  }
}
