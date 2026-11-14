import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Terrain } from './terrain.js';
import { makeSky, HORIZON } from './sky.js';
import { Player } from './player.js';

const Q = new URLSearchParams(location.search);
const SITE = Q.get('site') || 'jezero-delta';
const base = `${import.meta.env.BASE_URL}sites/${SITE}/`;
const $ = id => document.getElementById(id);
const bar = $('bar').firstElementChild, msg = $('msg');
let done = 0, total = 1; const tick = (t) => { done++; bar.style.width = (100 * done / total).toFixed(0) + '%'; if (t) msg.textContent = t; };

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor'); renderer.xr.setFoveation(1);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = HORIZON.clone();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.25, 60000);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
async function bitmap(url) { return createImageBitmap(await (await fetch(url)).blob(), { colorSpaceConversion: 'none' }); }
function grayTex(w, h, mips) {   // single-channel texture: a quarter of the memory of RGBA, which matters on a headset
  // allocated through a render target so three.js reserves storage (and mip levels) without needing pixel data up front
  const rt = new THREE.WebGLRenderTarget(w, h, { format: THREE.RedFormat, type: THREE.UnsignedByteType, depthBuffer: false, generateMipmaps: mips,
    minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter, magFilter: THREE.LinearFilter, anisotropy: mips ? maxAniso : 1, colorSpace: THREE.NoColorSpace });
  renderer.initRenderTarget(rt); return rt.texture;
}
// Loads T x T image tiles straight into one GPU texture (never holds the whole mosaic decoded in memory).
async function grayMosaic(urls, T, mips = true) {
  const gl = renderer.getContext(); let tex = null, px = 0;
  await Promise.all(urls.map(async (url, i) => {
    const bmp = await bitmap(url); if (!tex) { px = bmp.width; tex = grayTex(px * T, bmp.height * T, mips); }
    gl.bindTexture(gl.TEXTURE_2D, renderer.properties.get(tex).__webglTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, (i % T) * px, Math.floor(i / T) * bmp.height, gl.RED, gl.UNSIGNED_BYTE, bmp); bmp.close?.(); renderer.resetState(); tick();
  }));
  if (mips) { gl.bindTexture(gl.TEXTURE_2D, renderer.properties.get(tex).__webglTexture); gl.generateMipmap(gl.TEXTURE_2D); renderer.resetState(); }
  return tex;
}
async function heights(ring) {
  const u = new Uint16Array(await (await fetch(base + ring.name + '_h.bin')).arrayBuffer()); const f = new Float32Array(u.length);
  for (let i = 0; i < u.length; i++) f[i] = ring.hmin + u[i] * ring.hscale; tick(); return f;
}

const app = window.app = { renderer, scene, camera, layer: 0, rings: [], stats: {} };
const shared = { uCam: { value: new THREE.Vector3() }, uFog: { value: HORIZON.clone() }, uFogDist: { value: 26000 }, uLayer: { value: 0 }, uOpacity: { value: 1 },
  uSlopeLimits: { value: new THREE.Vector3(10, 20, 30) }, uElevRange: { value: new THREE.Vector2(0, 1) },
  uOverlay: { value: null }, uOverlayOn: { value: 0 }, uOverlayHalf: { value: 1 }, uRouteOn: { value: 0 } };
app.shared = shared;
const world = app.world = new THREE.Group(); scene.add(world);
const sky = makeSky(); scene.add(sky);

async function boot() {
  const site = app.site = await (await fetch(base + 'site.json')).json();
  total = site.rings.reduce((a, r) => a + 2 + r.orthoTiles * r.orthoTiles, 0);
  const loaded = await Promise.all(site.rings.map(async ring => {
    const T = ring.orthoTiles, urls = []; for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) urls.push(`${base}${ring.name}_ortho_${x}_${y}.jpg`);
    const [h, slope, ortho] = await Promise.all([heights(ring), grayMosaic([`${base}${ring.name}_slope.png`], 1, false), grayMosaic(urls, T)]); return { ring, heights: h, slope, ortho };
  }));
  msg.textContent = 'Costruzione del terreno…';
  const inner = loaded[0]; const n = inner.ring.n; const h0 = app.h0 = inner.heights[(n >> 1) * n + (n >> 1)];
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < inner.heights.length; i += 7) { const v = inner.heights[i]; if (v < lo) lo = v; if (v > hi) hi = v; } shared.uElevRange.value.set(lo, hi);
  const terrain = app.terrain = new Terrain(loaded, h0, shared, { N: +(Q.get('n') ?? 64), levels: +(Q.get('levels') ?? 9) }); world.add(terrain.group); app.rings = terrain.fields.map((field, i) => ({ field, ring: loaded[i].ring }));
  // world y of the surface at (x,z): finest ring that covers the point
  app.ground = (x, z) => { for (const r of app.rings) if (r.field.contains(x, z)) return r.field.height(x, z) - h0; return null; };
  app.slope = (x, z) => { for (const r of app.rings) if (r.field.contains(x, z, r.ring.res * 2)) return r.field.slopeDeg(x, z, r.ring.res); return 0; };
  const player = app.player = new Player(renderer, camera, scene, app.ground, renderer.domElement);
  const lim = site.rings[1].half - 30; player.canStandAt = (x, z) => Math.abs(x) < lim && Math.abs(z) < lim;
  const start = site.start || { x: 150, z: 165, yaw: 0.33 };
  player.placeAt(+(Q.get('x') ?? start.x), +(Q.get('z') ?? start.z), +(Q.get('yaw') ?? start.yaw)); player.pitch = +(Q.get('pitch') ?? 0);
  app.setLayer(+(Q.get('layer') ?? 0));
  const vr = VRButton.createButton(renderer, { optionalFeatures: ['local-floor', 'bounded-floor'] }); document.body.appendChild(vr);
  addEventListener('keydown', e => { const m = /^Digit([1-5])$/.exec(e.code); if (m) app.setLayer(+m[1] - 1); });
  $('help').innerHTML = '<b>PC</b>: clic per catturare il mouse · <b>WASD</b> cammina · <b>Shift</b> veloce · <b>1–3</b> livelli dati<br><b>Quest</b>: stick sinistro cammina · stick destro avanti = teletrasporto, lati = gira';
  $('boot').style.opacity = 0; setTimeout(() => $('boot').remove(), 700);
  const clock = new THREE.Clock(), dir = new THREE.Vector3(), cam = new THREE.Vector3(); let fpsT = 0, fpsN = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    player.update(dt);
    camera.updateMatrixWorld(); camera.getWorldPosition(cam); shared.uCam.value.copy(cam); sky.position.copy(cam);
    camera.getWorldDirection(dir);
    const tris = terrain.update(cam, dir, renderer.xr.isPresenting ? 0.2 : 0.35, app.baseRes || 1);
    renderer.render(scene, camera);
    fpsN++; fpsT += dt; if (fpsT > 1) { app.stats = { fps: Math.round(fpsN / fpsT), tris, calls: renderer.info.render.calls }; fpsN = 0; fpsT = 0; }
    app.frame = (app.frame || 0) + 1;
  });
}
app.LAYERS = ['Immagine HiRISE', 'Pendenza e pericoli', 'Quota'];
app.setLayer = i => { app.layer = i; shared.uLayer.value = i; };
boot().catch(e => { console.error(e); msg.textContent = 'Errore: ' + e.message; });
