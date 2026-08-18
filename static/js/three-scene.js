import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

const api = window.IoTHiveAPI;
const auth = window.IoTHiveAuth;
const detail = document.querySelector('[data-project-detail]');
if (!detail || !api) throw new Error('IoT Hive project viewer requires the project page.');

function escapeHtml(value){return auth?.escapeHtml?auth.escapeHtml(value):String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function videoEmbed(url){
  try{const u=new URL(url);if(u.hostname.includes('youtube.com')){const id=u.searchParams.get('v');return id?`https://www.youtube.com/embed/${id}`:url}if(u.hostname==='youtu.be')return `https://www.youtube.com/embed${u.pathname}`;if(u.hostname.includes('vimeo.com')){const id=u.pathname.split('/').filter(Boolean).pop();return id?`https://player.vimeo.com/video/${id}`:url}return url}catch{return url}
}
function render(project){
  const images=project.images||[]; const first=images[0]?.image?api.resolveUrl(images[0].image):'';
  detail.innerHTML=`<div class="page-container"><div class="project-layout"><div class="project-gallery"><div class="gallery-main">${first?`<img data-gallery-main src="${first}" alt="${escapeHtml(project.title)}">`:'<div class="project-placeholder">NO PROJECT IMAGE</div>'}</div>${images.length>1?`<div class="gallery-strip">${images.slice(0,5).map(img=>`<button type="button" data-gallery-src="${api.resolveUrl(img.image)}"><img loading="lazy" src="${api.resolveUrl(img.image)}" alt="${escapeHtml(img.caption||project.title)}"></button>`).join('')}</div>`:''}</div><aside class="project-info"><p class="eyebrow"><span></span> ${escapeHtml(project.category_name||'IOT PROJECT')} ${project.featured?'• FEATURED':''}</p><h1>${escapeHtml(project.title)}</h1><p class="project-short">${escapeHtml(project.short_description||'')}</p><div class="project-stats"><div class="project-stat"><span>SELLER</span><strong>${escapeHtml(project.seller_name||project.seller_username||'—')}</strong></div><div class="project-stat"><span>VIEWS</span><strong>${Number(project.views||0)}</strong></div><div class="project-stat"><span>VALUE</span><strong>${project.is_free?'FREE':`$${Number(project.price||0).toFixed(2)}`}</strong></div></div><div class="project-actions"><button class="button button-primary" type="button" data-request-project>Request Project</button><button class="button button-ghost favorite-button" type="button" data-favorite-project aria-pressed="false">♡ Save</button></div><div class="project-description">${escapeHtml(project.description||'')}</div></aside></div>${project.video?.video_url?`<section class="media-section"><p class="eyebrow"><span></span> VIDEO</p><h2>${escapeHtml(project.video.title||'Project video')}</h2><div class="project-video"><iframe src="${escapeHtml(videoEmbed(project.video.video_url))}" title="${escapeHtml(project.video.title||project.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></section>`:''}${project.model_3d?.model_url?`<section class="media-section"><p class="eyebrow"><span></span> INTERACTIVE MODEL</p><h2>${escapeHtml(project.model_3d.title||'3D model')}</h2><div class="model-viewer" data-model-viewer data-model-url="${escapeHtml(project.model_3d.model_url)}"><canvas class="model-canvas"></canvas><span class="model-note">DRAG TO ORBIT · SCROLL TO ZOOM</span></div></section>`:''}</div>`;
  detail.querySelectorAll('[data-gallery-src]').forEach(btn=>btn.addEventListener('click',()=>{const main=detail.querySelector('[data-gallery-main]');if(main)main.src=btn.dataset.gallerySrc}));
  detail.querySelector('[data-request-project]')?.addEventListener('click',()=>openRequest(project));
  detail.querySelector('[data-favorite-project]')?.addEventListener('click',()=>toggleFavorite(project.id));
  if(project.model_3d?.model_url) initModel(project.model_3d.model_url);
  syncFavorite(project.id);
}

async function loadProject(){const id=new URLSearchParams(location.search).get('id');if(!id){detail.innerHTML='<div class="page-container"><div class="state-card">No project ID was provided.</div></div>';return}try{const project=await api.request(`projects/${encodeURIComponent(id)}/`);render(project)}catch(error){detail.innerHTML=`<div class="page-container"><div class="state-card">Project unavailable. ${escapeHtml(error.message)}</div></div>`}}

async function syncFavorite(projectId){const button=detail.querySelector('[data-favorite-project]');if(!button)return;try{const data=await api.request('favorites/');const favs=Array.isArray(data)?data:data.results||[];const favorite=favs.find(f=>Number(f.project)===Number(projectId));button.dataset.favoriteId=favorite?.id||'';button.classList.toggle('is-active',Boolean(favorite));button.setAttribute('aria-pressed',String(Boolean(favorite)));button.textContent=favorite?'♥ Saved':'♡ Save'}catch(error){if(error.status===401||error.status===403){button.textContent='♡ Save'}}}
async function toggleFavorite(projectId){const button=detail.querySelector('[data-favorite-project]');if(!button)return;try{const user=await api.getCurrentUser();if(!user){location.href=`/login/?next=${encodeURIComponent(location.pathname+location.search)}`;return}if(button.dataset.favoriteId){await api.request(`favorites/${button.dataset.favoriteId}/`,{method:'DELETE'});button.dataset.favoriteId='';button.classList.remove('is-active');button.textContent='♡ Save';button.setAttribute('aria-pressed','false')}else{const fav=await api.request('favorites/',{method:'POST',body:{project:projectId}});button.dataset.favoriteId=fav.id;button.classList.add('is-active');button.textContent='♥ Saved';button.setAttribute('aria-pressed','true')}}catch(error){alert(error.message)}}
function openRequest(project){const modal=document.querySelector('[data-request-modal]');const form=document.querySelector('[data-request-form]');if(!modal||!form)return;modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.querySelector('[data-request-project-name]').textContent=project.title;form.dataset.projectId=project.id;document.querySelector('[data-request-message]').textContent='';}
function closeRequest(){const modal=document.querySelector('[data-request-modal]');if(!modal)return;modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true')}
async function setupRequest(){document.querySelectorAll('[data-modal-close]').forEach(b=>b.addEventListener('click',closeRequest));const form=document.querySelector('[data-request-form]');if(!form)return;form.addEventListener('submit',async e=>{e.preventDefault();const message=document.querySelector('[data-request-message]');const button=form.querySelector('button[type="submit"]');auth?.setMessage(message,'');try{const user=await api.getCurrentUser();if(!user){location.href=`/login/?next=${encodeURIComponent(location.pathname+location.search)}`;return}auth?.setBusy(button,true);await api.request('requests/',{method:'POST',body:{project:Number(form.dataset.projectId),message:form.elements.message.value}});auth?.setMessage(message,'Request sent to the project owner.',true);form.reset();setTimeout(closeRequest,900)}catch(error){auth?.setMessage(message,error.message)}finally{auth?.setBusy(button,false)}})}
function initModel(url){
  const host=document.querySelector('[data-model-viewer]');
  if(!host) return;
  const canvas=host.querySelector('canvas');
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,host.clientWidth/host.clientHeight,.1,100);
  camera.position.set(2.4,1.8,3.2);

  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(host.clientWidth,host.clientHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;

  // Cyber Grid Workbench
  const grid = new THREE.GridHelper(8, 16, 0x00e5ff, 0x1b2838);
  grid.position.y = -0.8;
  scene.add(grid);

  // Lighting
  scene.add(new THREE.HemisphereLight(0x9eeeff,0x09090d,2.2));
  const key=new THREE.DirectionalLight(0xffffff,2.8);
  key.position.set(4,6,3);
  scene.add(key);

  const cyanPoint = new THREE.PointLight(0x00e5ff, 2.0, 10);
  cyanPoint.position.set(-3, 2, -2);
  scene.add(cyanPoint);

  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.minDistance=1;
  controls.maxDistance=8;

  canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; });

  const loader=new GLTFLoader();
  loader.load(url,gltf=>{
    const model=gltf.scene;
    const box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new THREE.Vector3());
    const center=box.getCenter(new THREE.Vector3());
    const scale=2.4/Math.max(size.x,size.y,size.z);
    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    scene.add(model);
  },undefined,()=>{
    host.insertAdjacentHTML('beforeend','<span class="model-note">3D MODEL COULD NOT BE LOADED</span>');
  });

  const resize=()=>{
    const w=host.clientWidth,h=host.clientHeight;
    if(w && h){
      camera.aspect=w/h;
      camera.updateProjectionMatrix();
      renderer.setSize(w,h,false);
    }
  };
  addEventListener('resize',resize);
  const tick=()=>{
    controls.update();
    renderer.render(scene,camera);
    requestAnimationFrame(tick);
  };
  tick();
}

document.addEventListener('DOMContentLoaded',()=>{loadProject();setupRequest()});
