// @ts-nocheck
import * as THREE from 'three';
import { Terrain } from './terrain.js';
import { makeSky, HORIZON } from './sky.js';
import { Player } from './player.js';
import { Mission } from './mission.js';
import { Hud } from './hud.js';
import { Pois } from './pois.js';
import { Wrist, Credits, Debrief } from './info.js';
import { Helmet } from './helmet.js';
import { ArmDisplay } from './arm.js';
import { Habitat } from './habitat.js';
import { MarsGlobe } from './globe.js';
import { Rover } from './rover.js';

const base = `${import.meta.env.BASE_URL}sites/jezero-delta/`;

export async function mountMars(container, opts) {
  const settings = opts.settings;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.xr.setFoveation(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const help = document.createElement('div'); help.id = 'help';
  const legend = document.createElement('div'); legend.id = 'legend';
  container.appendChild(help); container.appendChild(legend);

  const scene = new THREE.Scene(); scene.background = HORIZON.clone();
  const camera = new THREE.PerspectiveCamera(70, container.clientWidth / Math.max(1, container.clientHeight), 0.08, 60000);
  const sun = new THREE.DirectionalLight(0xffd8be, 2.4); sun.position.set(30, 80, -20); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xd7b08a, 0x3a2218, 0.55));
  scene.add(new THREE.AmbientLight(0x8a6550, 0.28));

  const onResize = () => {
    const w = container.clientWidth, h = Math.max(1, container.clientHeight);
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  };
  const ro = new ResizeObserver(onResize); ro.observe(container);

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  async function bitmap(url) { return createImageBitmap(await (await fetch(url)).blob(), { colorSpaceConversion: 'none' }); }
  function grayTex(w, h, mips) {
    const rt = new THREE.WebGLRenderTarget(w, h, { format: THREE.RedFormat, type: THREE.UnsignedByteType, depthBuffer: false, generateMipmaps: mips,
      minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter, magFilter: THREE.LinearFilter, anisotropy: mips ? maxAniso : 1, colorSpace: THREE.NoColorSpace });
    renderer.initRenderTarget(rt); return rt.texture;
  }
  async function grayMosaic(urls, T, mips = true) {
    const gl = renderer.getContext(); let tex = null, px = 0;
    await Promise.all(urls.map(async (url, i) => {
      const bmp = await bitmap(url); if (!tex) { px = bmp.width; tex = grayTex(px * T, bmp.height * T, mips); }
      gl.bindTexture(gl.TEXTURE_2D, renderer.properties.get(tex).__webglTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, (i % T) * px, Math.floor(i / T) * bmp.height, gl.RED, gl.UNSIGNED_BYTE, bmp); bmp.close?.(); renderer.resetState(); tick();
    }));
    if (mips && tex) { gl.bindTexture(gl.TEXTURE_2D, renderer.properties.get(tex).__webglTexture); gl.generateMipmap(gl.TEXTURE_2D); renderer.resetState(); }
    return tex;
  }
  async function colorTex(url) { const t = new THREE.Texture(await bitmap(url)); t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; tick(); return t; }
  async function heights(ring) {
    const u = new Uint16Array(await (await fetch(base + ring.name + '_h.bin')).arrayBuffer()); const f = new Float32Array(u.length);
    for (let i = 0; i < u.length; i++) f[i] = ring.hmin + u[i] * ring.hscale; tick(); return f;
  }

  let done = 0, total = 1;
  const tick = (t) => { done++; const pct = Math.min(99, Math.round(100 * done / total)); opts.onProgress?.({ pct, message: t || '' }); };

  const app = { renderer, scene, camera, layer: 0, rings: [], stats: {}, settings, lang: settings.lang || 'it', interactables: [] };
  app.L = (it, en) => (app.lang === 'en' ? en : it);
  const shared = app.shared = { uCam: { value: new THREE.Vector3() }, uFog: { value: HORIZON.clone() }, uFogDist: { value: 26000 }, uLayer: { value: 0 }, uOpacity: { value: 1 },
    uSlopeLimits: { value: new THREE.Vector3(10, 20, 30) }, uElevRange: { value: new THREE.Vector2(0, 1) }, uTime: { value: 0 },
    uOverlay: { value: null }, uOverlayOn: { value: 0 }, uOverlayHalf: { value: 1 }, uNav: { value: null }, uRouteOn: { value: 1 }, uTrackOn: { value: 0 } };
  const world = app.world = new THREE.Group(); scene.add(world);
  const sky = makeSky(); scene.add(sky);

  function layerDefs() {
    const en = app.lang === 'en';
    return [
      { name: en ? 'Satellite image' : 'Immagine satellitare', src: 'MRO HiRISE, 25 cm/pixel', legend: [] },
      { name: en ? 'Slopes and hazards' : 'Pendenze e ostacoli', src: en ? 'From the 1 m HiRISE model' : 'Derivata dal modello HiRISE a 1 m', legend: [['#1abf59', en ? 'under 10°: easy' : 'sotto 10°: agevole'], ['#fad926', en ? '10–20°: hard' : '10–20°: impegnativa'], ['#ff800d', en ? '20–30°: severe' : '20–30°: critica'], ['#f2141a', en ? 'over 30°: no-go' : 'oltre 30°: vietata']] },
      { name: en ? 'Topography' : 'Topografia', src: en ? 'HiRISE model tied to MOLA' : 'Modello HiRISE agganciato a MOLA', legend: [['#30123b', en ? 'lower' : 'più basso'], ['#28bbec', ''], ['#a2fc3c', ''], ['#fb8022', ''], ['#7a0403', en ? 'higher' : 'più alto']] },
    ];
  }
  app.LAYERS = layerDefs();
  app.setLayer = i => {
    app.layer = (i + app.LAYERS.length) % app.LAYERS.length; shared.uLayer.value = app.layer; const o = app.LAYERS[app.layer].overlay;
    shared.uOverlayOn.value = o ? 1 : 0; if (o) { shared.uOverlay.value = o.tex; shared.uOverlayHalf.value = o.half; } app.onLayer?.();
  };
  async function overlayTex(url) {
    const bmp = await createImageBitmap(await (await fetch(url)).blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const t = new THREE.Texture(bmp); t.flipY = false; t.premultiplyAlpha = false; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
  }
  app.toggleTrack = () => { shared.uTrackOn.value = shared.uTrackOn.value ? 0 : 1; app.onLayer?.(); };

  const site = app.site = await (await fetch(base + 'site.json')).json();
  try { app.gallery = await (await fetch(base + 'gallery.json')).json(); } catch { app.gallery = { stops: {} }; }
  total = site.rings.reduce((a, r) => a + 2 + r.orthoTiles * r.orthoTiles, 0) + 1;
  opts.onProgress?.({ pct: 2, message: app.L('Dati orbitali…', 'Orbital data…') });
  const [nav, ...loaded] = await Promise.all([colorTex(base + 'inner_nav.png'), ...site.rings.map(async ring => {
    const T = ring.orthoTiles, urls = []; for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) urls.push(`${base}${ring.name}_ortho_${x}_${y}.jpg`);
    const [h, slope, ortho] = await Promise.all([heights(ring), grayMosaic([`${base}${ring.name}_slope.png`], 1, false), grayMosaic(urls, T)]);
    return { ring, heights: h, slope, ortho };
  })]);
  const ov = site.overlays || {};
  if (ov.minerals) app.LAYERS.push({ name: app.lang === 'en' ? 'Geology: minerals' : 'Geologia: minerali', src: 'MRO CRISM, 18 m/pixel', overlay: { tex: await overlayTex(base + 'minerals.png'), half: ov.minerals.half || 3600 },
    legend: (ov.minerals.channels || []).map(c => [Array.isArray(c.color) ? `rgb(${c.color.join(',')})` : c.color, c.label]) });
  if (ov.thermal) app.LAYERS.push({ name: app.lang === 'en' ? 'Night temperature' : 'Temperatura: infrarosso', src: 'Mars Odyssey THEMIS, 100 m/pixel', overlay: { tex: await overlayTex(base + 'thermal.png'), half: ov.thermal.half || 14400 },
    legend: [['#fffabe', app.lang === 'en' ? 'warm at night: rock' : 'caldo di notte: roccia'], ['#e1503c', ''], ['#2a0f55', app.lang === 'en' ? 'cold at night: sand' : 'freddo di notte: sabbia']] });

  opts.onProgress?.({ pct: 96, message: app.L('Costruzione del terreno…', 'Building the terrain…') });
  shared.uNav.value = nav;
  const inner = loaded[0]; const n = inner.ring.n; const h0 = app.h0 = inner.heights[(n >> 1) * n + (n >> 1)];
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < inner.heights.length; i += 7) { const v = inner.heights[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  shared.uElevRange.value.set(lo, hi);
  if (site.mission) shared.uSlopeLimits.value.fromArray(site.mission.slopeLimitsDeg);
  const terrain = app.terrain = new Terrain(loaded, h0, shared, { N: 48, levels: 8 });
  world.add(terrain.group);
  app.rings = terrain.fields.map((field, i) => ({ field, ring: loaded[i].ring }));
  app.ground = (x, z) => { for (const r of app.rings) if (r.field.contains(x, z)) return r.field.height(x, z) - h0; return null; };
  app.slope = (x, z) => { for (const r of app.rings) if (r.field.contains(x, z, r.ring.res * 2)) return r.field.slopeDeg(x, z, r.ring.res); return 0; };

  const player = app.player = new Player(renderer, camera, scene, app.ground, renderer.domElement);
  player.sens = settings.sens || 1;
  player.slopeAt = (x, z) => app.slope(x, z);
  const lim = site.rings[1].half - 30;
  const mission = app.mission = new Mission(site, app.ground);
  const habitat = app.habitat = new Habitat(app, mission.base, mission.pois.threeforks || mission.target);
  const globe = app.globe = new MarsGlobe(app, habitat.ped);
  if (settings.globeScale) globe.setFactor(settings.globeScale);
  const rover = app.rover = new Rover(app);
  player.canStandAt = (x, z) => Math.abs(x) < lim && Math.abs(z) < lim && habitat.canStand(x, z);
  mission.insideGate = (pos) => habitat.inside(pos);
  player.placeAt(habitat.spawn.x, habitat.spawn.z, habitat.spawn.yaw);
  player.onMove = (a, c) => mission.move(a, c);
  const pois = app.pois = new Pois(app, base); world.add(pois.group);
  const hud = app.hud = new Hud(app);
  const wrist = app.wrist = new Wrist(app);
  const credits = app.credits = new Credits(app);
  const debrief = app.debrief = new Debrief(app);
  const helmet = app.helmet = new Helmet(app);
  const arm = app.arm = new ArmDisplay(app, base);
  app.onLayer = () => { wrist.draw(); arm.acc = 1; };
  app.setLayer(0);

  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3(), dir = new THREE.Vector3();
  function pointerDir(obj, out) {
    if (obj.isCamera) return obj.getWorldDirection(out);
    obj.updateWorldMatrix(true, false);
    return out.set(0, 0, -1).transformDirection(obj.matrixWorld);
  }
  function targets() { return [...(globe.objects?.() || []), ...(habitat.interactives?.() || [])]; }
  function castFrom(obj, ndc) {
    if (ndc) raycaster.setFromCamera(ndc, camera);
    else {
      obj.getWorldPosition(origin);
      pointerDir(obj, dir);
      raycaster.set(origin, dir);
    }
    raycaster.far = 14;
    const hits = raycaster.intersectObjects(targets(), false);
    return hits[0] || null;
  }
  function useHit(hit, controller) {
    if (!hit) return false;
    const o = hit.object;
    if (o.userData.globe || o.parent?.userData?.globe) { globe.toggle(controller || camera); return true; }
    let n = o;
    while (n && !n.userData.onSelect) n = n.parent;
    if (n?.userData.onSelect) { n.userData.onSelect(); globe.pulse?.(controller); return true; }
    return false;
  }

  player.onButton = (hand, i) => {
    const c = player.hands[hand];
    if (i === 0 && c) {
      if (globe.heldBy === c) { globe.drop(); return; }
      const hit = castFrom(c);
      if (useHit(hit, c)) return;
      if (globe.nearController(c, 0.35)) { globe.grab(c); return; }
      return;
    }
    if (i === 1 && c && globe.nearController(c)) { globe.toggle(c); return; }
    if (hand === 'right' && i === 3) player.toggleOverview();
    else if (hand === 'right' && i === 1) arm.toggle();
    else if (hand === 'right' && i === 4) app.setLayer(app.layer + 1);
    else if (hand === 'right' && i === 5) app.toggleTrack();
    else if (hand === 'left' && i === 5) app.reset();
    else if (hand === 'left' && i === 4) credits.toggle();
  };

  player.onPlainClick = (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const locked = document.pointerLockElement === renderer.domElement;
    const ndc = new THREE.Vector2(
      locked ? 0 : ((e.clientX - rect.left) / rect.width) * 2 - 1,
      locked ? 0 : -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const hit = castFrom(camera, ndc);
    return useHit(hit, camera);
  };

  const onKey = (e) => {
    if (e.code === 'Escape') { app.paused = !app.paused; player.paused = app.paused; opts.onStatus?.(snapshot()); return; }
    if (app.paused) return;
    const m = /^Digit([1-9])$/.exec(e.code); if (m && +m[1] <= app.LAYERS.length) app.setLayer(+m[1] - 1);
    if (e.code === 'KeyL') app.setLayer(app.layer + 1);
    if (e.code === 'KeyT') app.toggleTrack();
    if (e.code === 'KeyR') app.reset();
    if (e.code === 'KeyC') credits.toggle();
    if (e.code === 'KeyM') player.toggleOverview();
    if (e.code === 'KeyI') arm.toggle();
    if (e.code === 'KeyV') helmet.off = !helmet.off;
    if (e.code === 'KeyG') globe.toggle(camera);
    if (e.code === 'Equal' || e.code === 'NumpadAdd') globe.scaleBy(1.12);
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') globe.scaleBy(0.88);
  };
  const onWheel = (e) => {
    if (!globe.heldBy && document.pointerLockElement !== renderer.domElement) return;
    if (!globe.heldBy && document.pointerLockElement === renderer.domElement) return;
    globe.scaleBy(Math.exp(-e.deltaY * 0.0011));
    e.preventDefault();
  };
  addEventListener('keydown', onKey);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  function helpText() {
    const L = app.L;
    help.innerHTML = `<b>${L('Quest 2', 'Quest 2')}</b> — ${L('stick sx cammina · stick dx di lato gira · stick dx avanti teletrasporto · grilletto sul globo lo prende · stick di quella mano scala', 'left stick walks · right stick sideways turns · right stick forward teleports · trigger on the globe grabs it · that stick scales')}<br><b>PC</b> — ${L('clic per il mouse · WASD · Shift veloce · G globo · rotella scala · L livello · M vista · Esc pausa', 'click to look · WASD · Shift faster · G globe · wheel scales · L layer · M overhead · Esc pause')}`;
  }
  app.setLang = (lang) => {
    app.lang = lang; settings.lang = lang;
    const en = lang === 'en';
    const names = en
      ? ['Satellite image', 'Slopes and hazards', 'Topography', 'Geology: minerals', 'Night temperature']
      : ['Immagine satellitare', 'Pendenze e ostacoli', 'Topografia', 'Geologia: minerali', 'Temperatura: infrarosso'];
    app.LAYERS.forEach((l, i) => { if (names[i]) l.name = names[i]; });
    if (app.LAYERS[1]) app.LAYERS[1].legend = [['#1abf59', en ? 'under 10°: easy' : 'sotto 10°: agevole'], ['#fad926', en ? '10–20°: hard' : '10–20°: impegnativa'], ['#ff800d', en ? '20–30°: severe' : '20–30°: critica'], ['#f2141a', en ? 'over 30°: no-go' : 'oltre 30°: vietata']];
    habitat.redrawPanel(); pois.redraw(); hud.acc = 1; wrist.draw(); helpText();
    opts.onStatus?.(snapshot());
  };
  app.reset = () => {
    if (player.lift) player.toggleOverview();
    mission.reset(); habitat.departed = false; habitat._wasInside = true; rover.reset();
    if (globe.heldBy) globe.drop();
    player.placeAt(habitat.spawn.x, habitat.spawn.z, habitat.spawn.yaw);
  };
  helpText();
  let xrSupport = !!navigator.xr;
  navigator.xr?.isSessionSupported?.('immersive-vr').then(ok => { xrSupport = !!ok; opts.onStatus?.(snapshot()); }).catch(() => {});
  renderer.xr.addEventListener('sessionstart', () => {
    app.paused = false; player.paused = false;
    renderer.xr.setFoveation(1);
    renderer.xr.setFramebufferScaleFactor(1);
    opts.onStatus?.(snapshot());
  });
  renderer.xr.addEventListener('sessionend', () => { player.floorOffset = 0; opts.onStatus?.(snapshot()); });
  async function enterVR() {
    if (!navigator.xr) throw new Error(app.L('Questo browser non ha WebXR. Sul Quest 2 usa il browser del visore.', 'This browser has no WebXR. On Quest 2, use the headset browser.'));
    let session;
    try {
      session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor'],
      });
      renderer.xr.setReferenceSpaceType('local-floor');
      player.floorOffset = 0;
    } catch (err) {
      try {
        session = await navigator.xr.requestSession('immersive-vr');
        renderer.xr.setReferenceSpaceType('local');
        player.floorOffset = 1.65;
      } catch {
        throw err;
      }
    }
    await renderer.xr.setSession(session);
    return session;
  }

  function snapshot() {
    const pos = player.head();
    const inside = habitat.inside(pos);
    const tgt = mission.target;
    const near = pois.near;
    return {
      inside, departed: habitat.departed, done: mission.done,
      target: tgt ? { id: tgt.id, name: tgt.name } : null,
      slope: player.slopeDeg || 0, pace: player.slopeMul || 1,
      paused: !!app.paused, held: !!globe.heldBy, radius: globe.radius,
      near: near ? { id: near.id, title: near.title, text: near.text, photos: near.photos } : null,
      vr: renderer.xr.isPresenting, xrSupport, lang: app.lang,
    };
  }

  const api = {
    dispose() {
      app.dead = true;
      renderer.setAnimationLoop(null);
      removeEventListener('keydown', onKey);
      ro.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
      help.remove(); legend.remove();
      if (window.__mars === api) delete window.__mars;
      if (window.__controlsTest) delete window.__controlsTest;
    },
    enterVR,
    grabGlobe() { globe.toggle(camera); },
    scaleGlobe(f) { globe.scaleBy(f); },
    setLang(l) { app.setLang(l); },
    setPaused(v) { app.paused = v; player.paused = v; },
    reset: () => app.reset(),
    setSens(v) { player.sens = v; settings.sens = v; },
    setTouch(partial) {
      if (!player.touch) player.touch = { mx: 0, mz: 0, lookX: 0, lookY: 0, fast: false };
      if (partial.lookX) player.touch.lookX += partial.lookX;
      if (partial.lookY) player.touch.lookY += partial.lookY;
      if ('mx' in partial) player.touch.mx = partial.mx;
      if ('mz' in partial) player.touch.mz = partial.mz;
      if ('fast' in partial) player.touch.fast = partial.fast;
    },
    snapshot,
  };
  window.__mars = api;
  window.__controlsTest = {
    getYaw: () => player.yaw,
    getSpeed: () => player._speed || 0,
    setYaw: (y) => { player.yaw = y; },
    setKeys: (codes) => { const k = {}; for (const c of codes || []) k[c] = true; player.keys = k; },
    setPos: (x, z) => { player.placeAt(x, z); },
    getPos: () => { const p = player.head(); return { x: p.x, z: p.z }; },
    roverState: () => {
      let meshes = 0;
      rover.model?.traverse((o) => { if (o.isMesh) meshes++; });
      const g = rover.group.position;
      return { ready: !!rover.model, meshes, x: g.x, y: g.y, z: g.z, yaw: rover.group.rotation.y };
    },
  };

  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb37a, depthTest: false, transparent: true, opacity: 0.95 }));
  dot.visible = false; dot.renderOrder = 80; dot.frustumCulled = false; scene.add(dot);
  function paintLasers() {
    if (!renderer.xr.isPresenting) { dot.visible = false; return; }
    let best = null;
    for (const hand of ['left', 'right']) {
      const c = player.hands[hand];
      if (!c) continue;
      const hit = castFrom(c);
      const line = c.getObjectByName('ray');
      if (line?.material?.color) line.material.color.setHex(hit ? 0xffb37a : 0x9ee7e2);
      if (hit && (!best || hit.distance < best.distance)) best = hit;
    }
    dot.visible = !!best;
    if (best) dot.position.copy(best.point);
  }
  const clock = new THREE.Clock();
  const cam = new THREE.Vector3(), look = new THREE.Vector3();
  let acc = 0;
  renderer.setAnimationLoop(() => {
    if (app.dead) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!app.paused) {
      globe.preUpdate(dt);
      player.sens = settings.sens || 1;
      player.update(dt);
      mission.idle(dt);
      const head = player.head();
      habitat.update(head);
      mission.check(head);
      rover.update(dt, head);
      pois.update(head);
      hud.update(dt); debrief.update(); helmet.update(); arm.update(dt);
    }
    camera.updateMatrixWorld(); camera.getWorldPosition(cam); shared.uCam.value.copy(cam); sky.position.copy(cam); camera.getWorldDirection(look);
    shared.uTime.value += dt;
    terrain.update(cam, look, renderer.xr.isPresenting ? -0.05 : 0.32, renderer.xr.isPresenting ? 1.35 : 1);
    paintLasers();
    renderer.render(scene, camera);
    acc += dt;
    if (acc > 0.35) { acc = 0; opts.onStatus?.(snapshot()); }
  });

  opts.onProgress?.({ pct: 100, message: '' });
  opts.onReady?.(api);
  opts.onStatus?.(snapshot());
  return api;
}
