import * as THREE from 'three';
import { mountMars } from './boot.js';
import { copy } from './strings.ts';

const STORE = 'marswalk-settings';
const $ = (id) => document.getElementById(id);

function loadSettings() {
  const base = { lang: 'it', sens: 1, rover: true, globeScale: 1 };
  try {
    const p = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!p) return base;
    return {
      lang: p.lang === 'en' ? 'en' : 'it',
      sens: typeof p.sens === 'number' ? p.sens : 1,
      rover: p.rover !== false,
      globeScale: typeof p.globeScale === 'number' ? p.globeScale : 1,
    };
  } catch {
    return base;
  }
}

const settings = loadSettings();
const save = () => localStorage.setItem(STORE, JSON.stringify(settings));

function paint() {
  const t = copy[settings.lang];
  document.documentElement.lang = settings.lang;
  $('kicker').textContent = t.kicker;
  $('title').textContent = t.title;
  $('lead').textContent = t.lead;
  $('langLabel').textContent = t.lang;
  $('sensLabel').firstChild.textContent = t.sens + ' ';
  $('btnRover').textContent = `${t.rover}: ${settings.rover ? t.roverOn : t.roverOff}`;
  $('start').textContent = t.start;
  $('questTitle').textContent = t.questTitle;
  $('questBody').textContent = t.questBody;
  $('pcTitle').textContent = t.pcTitle;
  $('pcBody').textContent = t.pcBody;
  $('globeTitle').textContent = t.globe;
  $('globeHelp').textContent = t.globeHelp;
  $('scaleLabel').firstChild.textContent = t.scale + ' ';
  $('btnIt').classList.toggle('on', settings.lang === 'it');
  $('btnEn').classList.toggle('on', settings.lang === 'en');
  $('sens').value = String(settings.sens);
  $('scale').value = String(settings.globeScale);
  $('scaleRead').textContent = settings.globeScale.toFixed(1) + '×';
}

$('btnIt').onclick = () => { settings.lang = 'it'; save(); paint(); };
$('btnEn').onclick = () => { settings.lang = 'en'; save(); paint(); };
$('sens').oninput = (e) => { settings.sens = Number(e.target.value); save(); };
$('btnRover').onclick = () => { settings.rover = !settings.rover; save(); paint(); };
$('scale').oninput = (e) => { settings.globeScale = Number(e.target.value); save(); paint(); };

const host = $('globe');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
camera.position.set(0, 0.15, 5.2);
scene.add(new THREE.AmbientLight(0xffc9a4, 0.55));
const key = new THREE.DirectionalLight(0xfff1e4, 2.2);
key.position.set(3, 2, 4);
scene.add(key);
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ color: 0xc46a3a, roughness: 0.9 }));
scene.add(globe);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.08, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffb080, transparent: true, opacity: 0.18, side: THREE.BackSide }));
scene.add(atmo);
new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/mars.jpg`, (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  globe.material.map = tex;
  globe.material.needsUpdate = true;
});
const fit = () => {
  const w = host.clientWidth, h = Math.max(1, host.clientHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
};
fit();
addEventListener('resize', fit);
let held = false, px = 0, py = 0;
host.addEventListener('pointerdown', (ev) => { held = true; px = ev.clientX; py = ev.clientY; host.setPointerCapture(ev.pointerId); });
host.addEventListener('pointermove', (ev) => {
  if (!held) return;
  globe.rotation.y += (ev.clientX - px) * 0.01;
  globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x + (ev.clientY - py) * 0.006, -0.8, 0.8);
  px = ev.clientX; py = ev.clientY;
});
host.addEventListener('pointerup', () => { held = false; });
host.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  settings.globeScale = THREE.MathUtils.clamp(settings.globeScale * Math.exp(-ev.deltaY * 0.001), 0.35, 4);
  save(); paint();
}, { passive: false });
let frame = 0;
let menuLive = true;
function loop() {
  frame = requestAnimationFrame(loop);
  if (!menuLive) return;
  const s = settings.globeScale;
  globe.scale.setScalar(globe.scale.x + (s - globe.scale.x) * 0.2);
  atmo.scale.copy(globe.scale);
  if (!held) globe.rotation.y += 0.003;
  renderer.render(scene, camera);
}
loop();
paint();

$('start').onclick = async () => {
  menuLive = false;
  cancelAnimationFrame(frame);
  renderer.dispose();
  $('menu').style.display = 'none';
  const stage = $('stage');
  stage.style.display = 'block';
  try {
    await mountMars(stage, {
      settings,
      onProgress: (p) => { $('load').textContent = `${p.message || ''} ${p.pct || 0}%`; },
      onReady: () => { $('load').remove(); },
    });
  } catch (e) {
    console.error(e);
    $('load').textContent = String(e.message || e);
  }
};
