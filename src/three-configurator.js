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

const canvas = document.getElementById("cfgCanvas");
if (canvas) {
  const boxes = [...document.querySelectorAll(".calc-in[data-zone]")];

  /* zone membership = the exact meshes from the Blender collections */
  const normName = s => (s || "").replace(/\s/g, "_").replace(/[\[\]\.:\/]/g, "");
  const ZONE_BY_NAME = {};
  [["seat.001","Seats"],["seat.002","Seats"],["floor","Floor"],["roof.002","Roof"],
   ["Dashboard","Dashboard"],["CenterConsole","Console"],["Door Panels","Doors"],
   ["Trunk_Lid","Trunk"],["Car_Body_015.001","Trunk"]
  ].forEach(([k,v]) => { ZONE_BY_NAME[normName(k)] = v; });
  function meshZone(o){ let p=o; while(p){ const z=ZONE_BY_NAME[normName(p.name)]; if(z) return z; p=p.parent; } return "Body"; }
  const zones = { Body:[], Seats:[], Floor:[], Dashboard:[], Console:[], Doors:[], Roof:[], Trunk:[] };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setClearColor(0x000000, 0);                 // transparent -> light stage shows through
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
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.54;
  controls.enableZoom = false; controls.enablePan = false;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const outline = new OutlinePass(new THREE.Vector2(1,1), scene, camera);
  outline.edgeStrength = 4.0; outline.edgeGlow = 0.7; outline.edgeThickness = 1.6; outline.pulsePeriod = 0;
  outline.visibleEdgeColor.set("#FFD400"); outline.hiddenEdgeColor.set("#c79e00");
  composer.addPass(outline);
  composer.addPass(new OutputPass());

  // Whole-car x-ray with smooth blended transparency on the dark stage. FrontSide culls far walls;
  // the interior keeps depthWrite so overlapping interior parts don't stack/shimmer when rotating.
  const bodyMat  = new THREE.MeshPhysicalMaterial({ color:0x72747c, metalness:0.0, roughness:0.45, transparent:true, opacity:0.28, depthWrite:false, side:THREE.FrontSide });
  const glassMat = new THREE.MeshPhysicalMaterial({ color:0x9aa3ad, metalness:0.0, roughness:0.06, transparent:true, opacity:0.16, depthWrite:false, side:THREE.FrontSide });
  function xray(mat){ (Array.isArray(mat)?mat:[mat]).forEach(m => { if(m){ m.transparent = true; m.opacity = 0.55; m.depthWrite = true; m.side = THREE.FrontSide; m.needsUpdate = true; } }); }

  const draco = new DRACOLoader().setDecoderPath("/draco/");
  new GLTFLoader().setDRACOLoader(draco).load("assets/bmw-interior.glb", (gltf) => {
    const model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      zones[meshZone(o)].push(o);
      const mn = (o.material && o.material.name) || "";
      if (/glass|winsows|window/i.test(mn)) o.material = glassMat;
      else if (/kuzov/i.test(mn)) o.material = bodyMat;
      else xray(o.material);                            // interior etc. -> same x-ray dither
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center); model.position.y += size.y / 2;
    scene.add(model);
    const radius = Math.max(size.x, size.y, size.z);
    controls.target.set(0, size.y * 0.40, 0);
    camera.position.set(radius * 0.62, radius * 0.48, radius * 0.86);
    controls.update();
    document.getElementById("cfgLoader")?.classList.add("hide");
    refresh(); requestRender();
  }, undefined, () => { document.getElementById("cfgLoader")?.classList.add("hide"); });

  /* checkboxes <-> model highlight + total */
  const totalEl = document.getElementById("calcTotal");
  const fmt = n => n.toLocaleString("uk-UA").replace(/,/g, " ");
  let shown = 0;
  function animateTotal(to){
    const start = shown, t0 = performance.now(), dur = 380;
    (function step(){ const k=Math.min(1,(performance.now()-t0)/dur); shown=Math.round(start+(to-start)*(1-Math.pow(1-k,3)));
      if(totalEl) totalEl.textContent = fmt(shown); if(k<1) schedule(step); })();
  }
  function refresh(){
    let sel = [], sum = 0;
    boxes.forEach(b => { if(b.checked){ sel = sel.concat(zones[b.dataset.zone] || []); sum += +b.dataset.price; } });
    outline.selectedObjects = sel; requestRender(); animateTotal(sum);
  }
  boxes.forEach(b => b.addEventListener("change", refresh));

  /* click on the model toggles the matching checkbox */
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let downXY = null;
  canvas.addEventListener("pointerdown", e => { downXY = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", e => {
    if(!downXY) return; const moved = Math.hypot(e.clientX-downXY[0], e.clientY-downXY[1]); downXY = null;
    if(moved > 6) return;
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX-r.left)/r.width)*2-1; pointer.y = -((e.clientY-r.top)/r.height)*2+1;
    raycaster.setFromCamera(pointer, camera);
    const all = []; Object.values(zones).forEach(a => all.push(...a));
    const hits = raycaster.intersectObjects(all, false);
    for (const h of hits){ const z = meshZone(h.object); const b = boxes.find(x => x.dataset.zone === z);
      if (b){ b.checked = !b.checked; b.dispatchEvent(new Event("change")); break; } }
  });

  /* on-demand rendering (setTimeout fallback for hidden-tab preview) */
  let renderReq = false;
  function schedule(cb){ return document.hidden ? setTimeout(cb, 16) : requestAnimationFrame(cb); }
  function requestRender(){ if(!renderReq){ renderReq = true; schedule(frame); } }
  function frame(){ renderReq = false; const moving = controls.update(); composer.render(); if(moving) requestRender(); }
  controls.addEventListener("change", requestRender);
  function resize(){ const w=canvas.clientWidth, h=canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(w,h,false);
    composer.setSize(w,h); outline.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix(); requestRender(); }
  new ResizeObserver(resize).observe(canvas); resize();
}
