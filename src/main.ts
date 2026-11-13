import './style.css';
import {ACESFilmicToneMapping,PCFSoftShadowMap,PerspectiveCamera,Scene,SRGBColorSpace,WebGLRenderer,Vector3,Quaternion} from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {AssetManager} from './graphics/AssetManager';
import {EnvironmentManager} from './graphics/EnvironmentManager';
import {IntroScene} from './graphics/IntroScene';
import {WorldManager} from './world/WorldManager';
import {VehiclePhysics} from './vehicle/VehiclePhysics';
import {VehicleVisual} from './vehicle/VehicleVisual';
import {VehicleCamera} from './vehicle/VehicleCamera';
import {AudioManager} from './audio/AudioManager';
import {InputManager} from './input/InputManager';
import {FixedStep} from './core/FixedStep';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
type Mode='loading'|'ready'|'intro'|'reveal'|'driving'|'paused';

async function boot(){
  let mode:Mode='loading';let originZ=0;let quality=localStorage.getItem('d2f-quality')??'high';let reduced=localStorage.getItem('d2f-reduced')==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas=el<HTMLCanvasElement>('game');
  const renderer=new WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.type=PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  const resize=()=>{renderer.setPixelRatio(quality==='low'?Math.min(devicePixelRatio,1):Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};
  const camera=new PerspectiveCamera(54,innerWidth/innerHeight,.1,900);resize();window.addEventListener('resize',resize);
  const assets=new AssetManager();assets.onProgress=p=>{el('load-progress').textContent=p+'%';};
  await RAPIER.init();
  const loaded=await assets.load();
  const scene=new Scene();const physics=new RAPIER.World({x:0,y:-9.81,z:0});physics.timestep=1/120;
  const world=new WorldManager(scene,physics,loaded,1242,quality);
  const environment=new EnvironmentManager(scene,renderer,loaded.hdr);
  const sample=world.road.sample(8);const spawn=new Vector3(sample.x+4.5,world.road.surfaceHeight(sample.x+4.5,8)+.9,8);
  const vehicle=new VehiclePhysics(physics,spawn);const visual=new VehicleVisual(scene);el('load-progress').textContent='BMW M5';
  await visual.loadLicensedModel(assets.base+'cars/model.json');
  const follow=new VehicleCamera(camera,physics,vehicle.body);
  const zero={throttle:0,brake:0,steer:0,handbrake:false};
  for(let i=0;i<300;i++){vehicle.step(1/120,zero);physics.step();vehicle.afterStep();}
  follow.reset(vehicle.interpolated(1).position,vehicle.interpolated(1).quaternion);
  const input=new InputManager();const audio=new AudioManager();audio.setVolume(.3);const fixed=new FixedStep();const intro=new IntroScene();
  const shadowPosition=new Vector3(Infinity,Infinity,Infinity);const shadowRotation=new Quaternion();let shadowChunks=0;
  let introStart=0;let revealStart=0;let revealWithoutWhite=false;let frameLast=performance.now();let physicsMs=0;let elapsedDriving=0;let diagnostics=false;let pausedFrom:'driving'|'reveal'='driving';let frameEma=16.67;let lastInfo=0;let frames=0;let travelDirection=1;
  el<HTMLInputElement>('reduced').checked=reduced;el<HTMLInputElement>('opening-reduced').checked=reduced;el<HTMLSelectElement>('quality').value=quality;
  const pause=(value:boolean)=>{
    if(value&&(mode==='driving'||mode==='reveal')){pausedFrom=mode;mode='paused';input.setEnabled(false);audio.setPaused(true);el('pause').hidden=false;el<HTMLButtonElement>('resume').focus();}
    else if(!value&&mode==='paused'){mode=pausedFrom;el('pause').hidden=true;input.setEnabled(mode==='driving');audio.setPaused(false);fixed.reset();(document.activeElement as HTMLElement)?.blur();}
  };
  const reset=()=>{const s=vehicle.body.translation().z+originZ;const p=world.road.sample(s);const yaw=Math.atan2(p.tangent.x,p.tangent.z);vehicle.reset({x:p.x+4.5,y:world.road.surfaceHeight(p.x+4.5,s)+1,z:s-originZ},yaw);fixed.reset();follow.reset(vehicle.interpolated(1).position,vehicle.interpolated(1).quaternion);};
  input.onAction=action=>{if(action==='pause')pause(mode!=='paused');if(action==='reset')reset();if(action==='camera')follow.cycle();if(action==='debug'){diagnostics=!diagnostics;el('diagnostics').hidden=!diagnostics;}};
  const reveal=(skip=false)=>{if(mode!=='intro')return;mode='reveal';revealWithoutWhite=skip;revealStart=performance.now();renderer.toneMappingExposure=1.05;el('opening').hidden=true;el('skip').hidden=true;el('hud').hidden=false;intro.dispose();};
  el('start').addEventListener('click',()=>{if(mode!=='ready')return;void audio.start().catch(()=>{});(document.activeElement as HTMLElement)?.blur();mode='intro';introStart=performance.now();el('opening').classList.add('leaving');el('loading').hidden=true;el('skip').hidden=false;});
  el('skip').addEventListener('click',()=>{reveal(true);el('white-transition').style.opacity='0';});
  el('pause-button').addEventListener('click',()=>pause(true));el('resume').addEventListener('click',()=>pause(false));el('reset').addEventListener('click',reset);
  el<HTMLInputElement>('volume').addEventListener('input',e=>audio.setVolume(Number((e.target as HTMLInputElement).value)));
  el<HTMLInputElement>('reduced').addEventListener('change',e=>{reduced=(e.target as HTMLInputElement).checked;localStorage.setItem('d2f-reduced',String(reduced));});
  el<HTMLInputElement>('opening-reduced').addEventListener('change',e=>{reduced=(e.target as HTMLInputElement).checked;el<HTMLInputElement>('reduced').checked=reduced;localStorage.setItem('d2f-reduced',String(reduced));});
  el<HTMLSelectElement>('quality').addEventListener('change',e=>{quality=(e.target as HTMLSelectElement).value;localStorage.setItem('d2f-quality',quality);resize();renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.needsUpdate=true;});
  // The opening also respects this saved accessibility preference before any light swell.
  if(reduced)el('opening').setAttribute('data-reduced-effects','true');
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
  let dragging=false;let px=0;let py=0;canvas.addEventListener('pointerdown',e=>{if(mode==='driving'&&Math.abs(vehicle.speedKmh)<1){dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);}});canvas.addEventListener('pointermove',e=>{if(dragging){follow.orbit(e.clientX-px,e.clientY-py);px=e.clientX;py=e.clientY;}});canvas.addEventListener('pointerup',()=>{dragging=false;});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause(true);el('error-message').textContent='Le contexte graphique a été interrompu. Rechargez la page pour reprendre la route.';el('error').hidden=false;});

  const gl=renderer.getContext();const gpuInfo=gl.getExtension('WEBGL_debug_renderer_info');
  const getState=()=>({mode,vehicleModel:visual.hasLicensedModel?'bmw-m5':'development',quality,shadows:renderer.shadowMap.enabled,speedKmh:vehicle.speedKmh,rpm:vehicle.rpm,gear:vehicle.gear,position:{...vehicle.body.translation()},globalZ:vehicle.body.translation().z+originZ,originZ,groundedWheels:vehicle.groundedWheels,chunks:world.chunkCount,colliders:physics.colliders.len(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,frameMs:frameEma,physicsMs,renderer:gl.getParameter(gpuInfo?gpuInfo.UNMASKED_RENDERER_WEBGL:gl.RENDERER)});
  if(import.meta.env.DEV||(import.meta.env.MODE==='test'))(window as unknown as {__drive2forget:unknown}).__drive2forget={getState,vehicle,world,physics,reset,skipIntro:reveal};
  mode='ready';el<HTMLButtonElement>('start').disabled=false;el('load-progress').textContent='PRÊT';el('loading').style.opacity='.55';
  function frame(now:number){
    requestAnimationFrame(frame);const realElapsed=(now-frameLast)/1000;const elapsed=Math.min(realElapsed,.1);frameLast=now;frameEma+=(realElapsed*1000-frameEma)*.05;frames++;
    input.pollActions();
    if(mode==='intro'){
      const t=(now-introStart)/1000;intro.render(renderer,t,reduced);el('white-transition').style.opacity=reduced?'0':String(smooth((t-2.45)/1.05));if(t>3.7)reveal();return;
    }
    if(mode==='ready'||mode==='loading')return;
    if(mode==='reveal'){
      const t=(now-revealStart)/1000;el('white-transition').style.opacity=String((reduced||revealWithoutWhite?0:1)*(1-smooth(t/1.5)));if(t>1.6){mode='driving';input.setEnabled(true);el('help').style.opacity='1';}
    }
    let alpha=1;
    if(mode==='driving'){
      elapsedDriving+=elapsed;input.update(elapsed);const before=performance.now();
      alpha=fixed.advance(elapsed,dt=>{
        vehicle.step(dt,input.state);
        // Rapier refreshes ray-query acceleration structures on step. Rebase after
        // the old-frame wheel rays and before step so the next query sees the new frame.
        if(Math.abs(vehicle.body.translation().z)>1536){const delta=Math.trunc(vehicle.body.translation().z/768)*768;originZ+=delta;world.rebase(delta);vehicle.rebase(delta);follow.rebase(delta);}
        physics.step();vehicle.afterStep();
      });physicsMs=performance.now()-before;
      const longitudinalVelocity=vehicle.body.linvel().z;if(Math.abs(longitudinalVelocity)>.2)travelDirection=Math.sign(longitudinalVelocity);
      world.update(vehicle.body.translation().z+originZ,travelDirection,originZ);
      if(vehicle.body.translation().y<world.road.sample(vehicle.body.translation().z+originZ).y-12)reset();
    }
    const pose=vehicle.interpolated(alpha);visual.update(pose,vehicle.wheels,vehicle.brakeLight);if(mode!=='paused')follow.update(elapsed,pose.position,pose.quaternion,vehicle.speedKmh,input.state.steer);environment.update(pose.position);
    if(pose.position.distanceToSquared(shadowPosition)>.001||pose.quaternion.angleTo(shadowRotation)>.01||world.chunkCount!==shadowChunks){renderer.shadowMap.needsUpdate=true;shadowPosition.copy(pose.position);shadowRotation.copy(pose.quaternion);shadowChunks=world.chunkCount;}
    renderer.render(scene,camera);audio.update(vehicle.rpm,Math.abs(vehicle.speedKmh),input.state.throttle,elapsed);
    el('speed').textContent=String(Math.round(Math.abs(vehicle.speedKmh)));el('gear').textContent=String(vehicle.gear);el('revs').style.width=(vehicle.rpm/7000*100)+'%';
    el('help').style.opacity=String(Math.max(.25,1-elapsedDriving/50));const caption=document.querySelector<HTMLElement>('.drive-caption')!;caption.style.opacity=elapsedDriving>12?'0':'1';
    if(diagnostics&&now-lastInfo>350){const s=getState();el('diagnostics').textContent=`DRIVE2FORGET · DIAGNOSTIC\n${(1000/frameEma).toFixed(1)} FPS · ${frameEma.toFixed(2)} ms/frame\nPhysique : ${physicsMs.toFixed(2)} ms · 120 Hz\nChunks : ${s.chunks} · colliders : ${s.colliders}\nDraw calls : ${s.drawCalls} · triangles : ${s.triangles.toLocaleString()}\nGPU objets : ${s.geometries} géométries · ${s.textures} textures\nRoues au sol : ${s.groundedWheels}/4\nDistance z : ${s.globalZ.toFixed(1)} m · origine : ${originZ}\nFrames mesurées : ${frames}`;lastInfo=now;}
  }
  requestAnimationFrame(frame);
  window.addEventListener('pagehide',()=>{input.dispose();audio.dispose();world.dispose();visual.dispose();environment.dispose();assets.dispose();physics.free();renderer.dispose();},{once:true});
}
boot().catch((error:unknown)=>{console.error(error);el('loading').hidden=true;el('error-message').textContent=error instanceof Error?error.message:String(error);el('error').hidden=false;});
