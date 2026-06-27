// 3D x-ray car configurator that drives the price calculator on the landing page.
// Bundled by Vite from the version-pinned `three` npm package (no CDN at runtime).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// =============================================================================
// ZONE LOOK — змінюйте тут прозорість, колір і блиск кожної зони моделі
// =============================================================================
//
// Ключі зони = data-zone у чекбоксах калькулятора (крім Body / Glass).
// Blender Scene Collection → ключ:
//   Seats          → Seats
//   Floor          → Floor
//   Roof           → Roof
//   Trunk          → Trunk
//   CenterConsole  → Console
//   Dashboard      → Dashboard
//   Door Panels    → Doors
//
// opacity     0…1   прозорість (0 = невидимо, 1 = суцільне)
// color       "#hex" або null — null = залишити колір із GLB
// metalness   0…1   або null
// roughness   0…1   або null
// depthWrite  true/false — false для зовнішнього кузова/скла (менше мерехтіння)
// side        "front" | "double" — "front" ріже далекі стінки кузова в x-ray
//
const ZONE_LOOK = {
  // —— зовнішність (не Blender-колекції, визначаються за іменем матеріалу) ——
  Body: {
    label: "Collection / кузов (kuzov)",
    opacity: 0.05,
    color: "#72747c",
    metalness: 0.0,
    roughness: 0.45,
    depthWrite: false,
    side: "front",
  },
  Glass: {
    label: "Скло (glass / window)",
    opacity: 0.01,
    color: "#9aa3ad",
    metalness: 0.0,
    roughness: 0.06,
    depthWrite: false,
    side: "front",
  },

  // —— Blender Scene Collection ——
  Seats: {
    label: "Seats — сидіння",
    opacity: 1.0,
    color: null,
    metalness: null,
    roughness: null,
    depthWrite: true,
    side: "front",
  },
  Floor: {
    label: "Floor — підлога",
    opacity: 1.0,
    color: null,
    metalness: null,
    roughness: null,
    depthWrite: true,
    side: "front",
  },
  Roof: {
    label: "Roof — стеля",
    opacity: 0.50,
    color: null,
    metalness: null,
    roughness: null,
    depthWrite: true,
    side: "front",
  },
  Trunk: {
    label: "Trunk — багажник",
    opacity: 1.0,
    color: null,
    metalness: null,
    roughness: null,
    depthWrite: true,
    side: "front",
  },
  Console: {
    label: "CenterConsole — центральна консоль",
    opacity: 1.0,
    color: null,
    metalness: null,
    roughness: null,
    depthWrite: true,
    side: "front",
  },
  Dashboard: {
    label: "Dashboard — передня панель",
    opacity: 1.0,
    color: null,
    metalness: null,
    roughness: null,
    depthWrite: true,
    side: "front",
  },
  Doors: {
    label: "Door Panels — дверні карти",
    opacity: 0.30,
    color: null,
    metalness: null,
    roughness: null,
    depthWrite: true,
    side: "front",
  },
};

// Підсвітка обраних зон (outline при кліку на чекбокс)
const OUTLINE_LOOK = {
  edgeStrength: 4.0,
  edgeGlow: 0.7,
  edgeThickness: 1.6,
  visibleColor: "#FFD400",
  hiddenColor: "#c79e00",
};

// =============================================================================
// Blender object/collection name → zone key (не змінюйте без правок у GLB)
// =============================================================================
const BLENDER_TO_ZONE = [
  ["seat.001",         "Seats"],
  ["seat.002",         "Seats"],
  ["floor",            "Floor"],
  ["roof.002",         "Roof"],
  ["Dashboard",        "Dashboard"],
  ["CenterConsole",    "Console"],
  ["Door Panels",      "Doors"],
  ["Trunk_Lid",        "Trunk"],
  ["Car_Body_015.001", "Trunk"],
];

// =============================================================================

const SIDE = { front: THREE.FrontSide, double: THREE.DoubleSide };

function sideOf(look) {
  return SIDE[look.side] ?? THREE.FrontSide;
}

function applyLook(material, look) {
  if (!material || !look) return material;
  material.transparent = look.opacity < 1;
  material.opacity = look.opacity;
  material.depthWrite = look.depthWrite;
  material.side = sideOf(look);
  if (look.color != null) material.color?.set(look.color);
  if (look.metalness != null) material.metalness = look.metalness;
  if (look.roughness != null) material.roughness = look.roughness;
  material.needsUpdate = true;
  return material;
}

function makeZoneMaterial(look) {
  return new THREE.MeshPhysicalMaterial({
    color: look.color ?? "#888888",
    metalness: look.metalness ?? 0,
    roughness: look.roughness ?? 0.5,
    transparent: look.opacity < 1,
    opacity: look.opacity,
    depthWrite: look.depthWrite,
    side: sideOf(look),
  });
}

const canvas = document.getElementById("cfgCanvas");
if (canvas) {
  const boxes = [...document.querySelectorAll(".calc-in[data-zone]")];

  const normName = s => (s || "").replace(/\s/g, "_").replace(/[\[\]\.:\/]/g, "");
  const ZONE_BY_NAME = {};
  BLENDER_TO_ZONE.forEach(([k, v]) => { ZONE_BY_NAME[normName(k)] = v; });
  function meshZone(o) {
    let p = o;
    while (p) {
      const z = ZONE_BY_NAME[normName(p.name)];
      if (z) return z;
      p = p.parent;
    }
    return "Body";
  }

  const zones = { Body: [], Glass: [], Seats: [], Floor: [], Dashboard: [], Console: [], Doors: [], Roof: [], Trunk: [] };
  const zoneMaterials = {
    Body: makeZoneMaterial(ZONE_LOOK.Body),
    Glass: makeZoneMaterial(ZONE_LOOK.Glass),
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b8b8, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff2d8, 1.0); rim.position.set(-6, 4, -5); scene.add(rim);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.54;
  controls.enableZoom = false;
  controls.enablePan = false;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  outline.edgeStrength = OUTLINE_LOOK.edgeStrength;
  outline.edgeGlow = OUTLINE_LOOK.edgeGlow;
  outline.edgeThickness = OUTLINE_LOOK.edgeThickness;
  outline.pulsePeriod = 0;
  outline.visibleEdgeColor.set(OUTLINE_LOOK.visibleColor);
  outline.hiddenEdgeColor.set(OUTLINE_LOOK.hiddenColor);
  composer.addPass(outline);
  composer.addPass(new OutputPass());

  function assignMeshMaterial(mesh, zoneKey) {
    const look = ZONE_LOOK[zoneKey];
    const mn = (mesh.material && mesh.material.name) || "";
    if (/glass|winsows|window/i.test(mn)) {
      mesh.material = zoneMaterials.Glass;
      zones.Glass.push(mesh);
      return;
    }
    zones[zoneKey].push(mesh);
    // Kuzov — спільна x-ray оболонка (ZONE_LOOK.Body), зона лишається для outline
    if (/kuzov/i.test(mn)) {
      mesh.material = zoneMaterials.Body;
      return;
    }
    applyLook(mesh.material, look);
  }

  const draco = new DRACOLoader().setDecoderPath("/draco/");
  new GLTFLoader().setDRACOLoader(draco).load("assets/bmw-interior.glb", (gltf) => {
    const model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      assignMeshMaterial(o, meshZone(o));
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.position.y += size.y / 2;
    scene.add(model);
    const radius = Math.max(size.x, size.y, size.z);
    controls.target.set(0, size.y * 0.40, 0);
    camera.position.set(radius * 0.62, radius * 0.48, radius * 0.86);
    controls.update();
    document.getElementById("cfgLoader")?.classList.add("hide");
    refresh();
    requestRender();
  }, undefined, () => { document.getElementById("cfgLoader")?.classList.add("hide"); });

  const totalEl = document.getElementById("calcTotal");
  const fmt = n => n.toLocaleString("uk-UA").replace(/,/g, " ");
  let shown = 0;
  function animateTotal(to) {
    const start = shown, t0 = performance.now(), dur = 380;
    (function step() {
      const k = Math.min(1, (performance.now() - t0) / dur);
      shown = Math.round(start + (to - start) * (1 - Math.pow(1 - k, 3)));
      if (totalEl) totalEl.textContent = fmt(shown);
      if (k < 1) schedule(step);
    })();
  }
  function refresh() {
    let sel = [], sum = 0;
    boxes.forEach(b => { if (b.checked) { sel = sel.concat(zones[b.dataset.zone] || []); sum += +b.dataset.price; } });
    outline.selectedObjects = sel;
    requestRender();
    animateTotal(sum);
  }
  boxes.forEach(b => b.addEventListener("change", refresh));

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let downXY = null;
  canvas.addEventListener("pointerdown", e => { downXY = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => {
    if (!downXY) return;
    const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
    downXY = null;
    if (moved > 6) return;
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const all = [];
    Object.values(zones).forEach(a => all.push(...a));
    const hits = raycaster.intersectObjects(all, false);
    for (const h of hits) {
      const z = meshZone(h.object);
      const b = boxes.find(x => x.dataset.zone === z);
      if (b) { b.checked = !b.checked; b.dispatchEvent(new Event("change")); break; }
    }
  });

  let renderReq = false;
  function schedule(cb) { return document.hidden ? setTimeout(cb, 16) : requestAnimationFrame(cb); }
  function requestRender() { if (!renderReq) { renderReq = true; schedule(frame); } }
  function frame() { renderReq = false; const moving = controls.update(); composer.render(); if (moving) requestRender(); }
  controls.addEventListener("change", requestRender);
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    outline.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
}
