import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {wheelLOD,exteriorGlass} from './VehicleRendering';

/** Original development sedan. This mesh is deliberately not identified as a BMW. */
export class VehicleVisual {
  readonly group = new THREE.Group();
  private readonly shell = new THREE.Group();
  private readonly wheelPivots: THREE.Group[] = [];
  private readonly wheelSpins: THREE.Group[] = [];
  private readonly brakeMaterial = new THREE.MeshStandardMaterial({color:0x610a04,emissive:0xff160b,emissiveIntensity:1.8,roughness:.28});
  private readonly brakeLights: THREE.PointLight[] = [];
  private licensedModel: THREE.Group | null = null;
  private readonly licensedBrakeMaterials:THREE.MeshStandardMaterial[]=[];
  private readonly licensedWheelPivots:THREE.Group[]=[];
  private readonly licensedWheelSpins:THREE.Group[]=[];
  private readonly wheelVariants=new Map<THREE.Mesh,{original:THREE.BufferGeometry;compact:THREE.BufferGeometry}>();
  private quality='auto';
  private contactShadow:THREE.Mesh|null=null;
  get renderingStats(){let triangles=0;let glassOpaque=true;this.licensedModel?.traverse(o=>{if(o instanceof THREE.Mesh){triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='TEX_017'||m.name==='TEX_014')glassOpaque&&=!m.transparent&&m.opacity===1;}});return {triangles,glassOpaque};}
  setQuality(quality:string){this.quality=quality;for(const [mesh,g] of this.wheelVariants)mesh.geometry=quality==='high'?g.original:g.compact;}
  get hasLicensedModel():boolean {return this.licensedModel!==null;}
  private readonly paint = new THREE.MeshPhysicalMaterial({color:0x151e26,metalness:.85,roughness:.24,clearcoat:1,clearcoatRoughness:.16});
  private readonly glass = new THREE.MeshPhysicalMaterial({color:0x17242a,metalness:.27,roughness:.12,clearcoat:1,transparent:true,opacity:.89,side:THREE.DoubleSide});
  private readonly trim = new THREE.MeshStandardMaterial({color:0x090c0e,metalness:.45,roughness:.38});
  private readonly chrome = new THREE.MeshStandardMaterial({color:0x8e999e,metalness:.92,roughness:.24});
  private readonly lamp = new THREE.MeshStandardMaterial({color:0xdff4ff,emissive:0xd9edff,emissiveIntensity:3.5,roughness:.17});

  constructor(scene: THREE.Scene) {
    this.group.name='Development sedan — original provisional asset';
    this.group.add(this.shell);
    this.buildBody();
    this.buildCabin();
    this.buildDetails();
    for (let i=0;i<4;i++) this.buildWheel(i);
    this.mergeStaticMeshes(this.shell);
    for(const spin of this.wheelSpins)this.mergeStaticMeshes(spin);
    scene.add(this.group);
  }

  private mesh(geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D=this.shell):THREE.Mesh {
    const m=new THREE.Mesh(geometry,material);m.castShadow=material!==this.glass;m.receiveShadow=material!==this.glass;parent.add(m);return m;
  }
  /** Merge unanimated detail by material; lamps and each wheel retain separate pivots. */
  private mergeStaticMeshes(parent:THREE.Group):void {
    const batches=new Map<THREE.Material,THREE.Mesh[]>();
    for(const child of [...parent.children])if(child instanceof THREE.Mesh&&!Array.isArray(child.material)) {
      const entries=batches.get(child.material)??[];entries.push(child);batches.set(child.material,entries);
    }
    for(const [material,meshes] of batches) {
      if(meshes.length<2)continue;
      const transformed=meshes.map(mesh=>{
        mesh.updateMatrix();const geometry=(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone());
        geometry.applyMatrix4(mesh.matrix);for(const name of Object.keys(geometry.attributes))if(name!=='position'&&name!=='normal')geometry.deleteAttribute(name);
        return geometry;
      });
      const merged=mergeGeometries(transformed,false);
      transformed.forEach(g=>g.dispose());
      if(!merged)continue;
      for(const mesh of meshes){mesh.removeFromParent();mesh.geometry.dispose();}
      this.mesh(merged,material,parent);
    }
  }
  private line(points:THREE.Vector3[],radius:number,material:THREE.Material,parent:THREE.Object3D=this.shell):THREE.Mesh {
    return this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(4,points.length*4),radius,5,false),material,parent);
  }
  private patch(points:number[][],material:THREE.Material,parent:THREE.Object3D=this.shell):THREE.Mesh {
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    const idx:number[]=[];for(let i=1;i<points.length-1;i++)idx.push(0,i,i+1);
    g.setIndex(idx);g.computeVertexNormals();
    const m=this.mesh(g,material,parent);m.material=material;return m;
  }
  private buildBody():void {
    const verts:number[]=[],indices:number[]=[];const sections=100;const ringSize=14;
    for(let i=0;i<=sections;i++) {
      const z=-2.43+i/sections*4.9;
      const endFactor=1-.18*Math.pow(Math.abs(z)/2.48,7);
      const width=.965*endFactor;
      const top=.255-.075*Math.pow(Math.abs(z)/2.48,4)+.018*Math.cos(z*2);
      let arch=-.405;
      for(const wz of [-1.48,1.48]) {
        const dz=Math.abs(z-wz);if(dz<.425)arch=Math.max(arch,-.40+Math.sqrt(.425*.425-dz*dz));
      }
      const shape=[
        [0,top],[.62,top+.008],[.84,top-.02],[.975,top-.10],[1,-.10],
        [.998,arch],[.74,-.43],[0,-.45],[-.74,-.43],[-.998,arch],
        [-1,-.10],[-.975,top-.10],[-.84,top-.02],[-.62,top+.008],
      ];
      for(const [x,y] of shape)verts.push(x*width,y,z);
    }
    for(let i=0;i<sections;i++)for(let j=0;j<ringSize;j++) {
      const a=i*ringSize+j,b=i*ringSize+(j+1)%ringSize,c=a+ringSize,d=b+ringSize;
      indices.push(a,c,b,b,c,d);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();
    // Sections run longitudinally; double-sided protects the open underside at wheel cut-outs.
    this.paint.side=THREE.DoubleSide;this.mesh(g,this.paint);
    for(const z of [-2.43,2.47]) {
      const sign=z>0?1:-1;
      this.patch([[-.77,-.36,z],[.77,-.36,z],[.82,.16,z],[0,.22,z],[-.82,.16,z]],this.paint);
      this.line([new THREE.Vector3(-.82,-.32,z+sign*.008),new THREE.Vector3(0,-.39,z+sign*.04),new THREE.Vector3(.82,-.32,z+sign*.008)],.025,this.trim);
    }
    for(const side of [-1,1]) {
      this.line([new THREE.Vector3(side*.94,-.33,-1.02),new THREE.Vector3(side*.985,-.36,0),new THREE.Vector3(side*.94,-.33,1.03)],.035,this.trim);
      // Shoulder crease and door gaps catch low-angle light without a flat cartoon outline.
      this.line([new THREE.Vector3(side*.89,.19,-2.0),new THREE.Vector3(side*.965,.20,-.5),new THREE.Vector3(side*.96,.21,1.2),new THREE.Vector3(side*.86,.16,2.10)],.005,this.chrome);
      for(const z of [-1.06,.38]) {
        this.line([new THREE.Vector3(side*.959,.15,z),new THREE.Vector3(side*.969,-.08,z+.02),new THREE.Vector3(side*.94,-.31,z+.06)],.0035,this.trim);
      }
      for(const z of [-.67,.75]) {
        const handle=this.mesh(new THREE.CapsuleGeometry(.018,.15,3,8),this.chrome);handle.rotation.z=Math.PI/2;handle.position.set(side*.965,.16,z);
      }
    }
    // Four curved arch lips, following the same profile as the shell.
    for(const side of [-1,1])for(const z of [-1.48,1.48]) {
      const pts:THREE.Vector3[]=[];for(let j=0;j<=20;j++){const a=j/20*Math.PI;pts.push(new THREE.Vector3(side*.973,-.40+Math.sin(a)*.425,z+Math.cos(a)*.425));}
      this.line(pts,.014,this.paint);
    }
  }
  private buildCabin():void {
    const roofPoints=[[-.68,.79,-.94],[.68,.79,-.94],[.68,.82,.25],[-.68,.82,.25]];
    this.patch(roofPoints,this.paint);
    // Curved windshield and rear glazing, framed by painted A/C pillars.
    this.patch([[-.795,.29,1.02],[.795,.29,1.02],[.665,.795,.25],[-.665,.795,.25]],this.glass);
    this.patch([[-.675,.77,-.95],[.675,.77,-.95],[.815,.29,-1.53],[-.815,.29,-1.53]],this.glass);
    for(const side of [-1,1]) {
      const s=side;
      this.patch([[s*.805,.31,-1.38],[s*.69,.75,-.91],[s*.687,.785,-.39],[s*.823,.31,-.39]],this.glass);
      this.patch([[s*.823,.31,-.34],[s*.687,.785,-.34],[s*.687,.795,.23],[s*.792,.31,.92]],this.glass);
      for(const pts of [
        [[s*.81,.29,-1.53],[s*.70,.77,-.94],[s*.68,.81,-.80]],
        [[s*.80,.29,1.02],[s*.69,.79,.25],[s*.68,.82,.12]],
        [[s*.82,.30,-.365],[s*.69,.79,-.365]],
      ])this.line(pts.map(p=>new THREE.Vector3(...p as [number,number,number])),.027,this.paint);
      this.line([new THREE.Vector3(s*.81,.292,-1.48),new THREE.Vector3(s*.84,.292,-.2),new THREE.Vector3(s*.80,.292,1.02)],.013,this.chrome);
      // Teardrop mirrors are smooth, separate aerodynamic forms.
      const arm=this.mesh(new THREE.CapsuleGeometry(.025,.13,3,7),this.trim);arm.rotation.z=Math.PI/2;arm.position.set(s*.91,.29,.72);
      const mirror=this.mesh(new THREE.SphereGeometry(1,16,10),this.paint);mirror.scale.set(.145,.075,.19);mirror.position.set(s*1.045,.34,.68);
      const mirrorGlass=this.mesh(new THREE.SphereGeometry(1,12,8),this.chrome);mirrorGlass.scale.set(.125,.055,.012);mirrorGlass.position.set(s*1.047,.34,.51);
    }
    const darkInterior=new THREE.MeshStandardMaterial({color:0x101314,roughness:.85});
    const dash=this.mesh(new THREE.CapsuleGeometry(.14,1.18,4,12),darkInterior);dash.rotation.z=Math.PI/2;dash.position.set(0,.27,.60);
    for(const x of [-.37,.37])for(const z of [-.67,.20]) {
      const seat=this.mesh(new THREE.SphereGeometry(1,10,8),darkInterior);seat.scale.set(.22,.30,.16);seat.position.set(x,.35,z);
    }
  }
  private buildDetails():void {
    // Lamp strips follow the swept shape of the real geometry; no licensed brand marks.
    for(const s of [-1,1]) {
      this.line([new THREE.Vector3(s*.38,.14,2.445),new THREE.Vector3(s*.54,.155,2.46),new THREE.Vector3(s*.75,.13,2.385)],.035,this.trim);
      for(const off of [0,.07])this.line([new THREE.Vector3(s*(.41+off),.15,2.46),new THREE.Vector3(s*(.44+off),.115,2.474),new THREE.Vector3(s*(.52+off),.115,2.45)],.009,this.lamp);
      this.line([new THREE.Vector3(s*.39,.15,-2.425),new THREE.Vector3(s*.64,.16,-2.425),new THREE.Vector3(s*.84,.10,-2.32)],.025,this.brakeMaterial);
      this.line([new THREE.Vector3(s*.45,.095,-2.435),new THREE.Vector3(s*.76,.095,-2.38)],.011,this.brakeMaterial);
      const glow=new THREE.PointLight(0xff2810,.2,1.8,2);glow.position.set(s*.6,.12,-2.50);this.group.add(glow);this.brakeLights.push(glow);
      for(const offset of [0,.16]) {
        const tip=this.mesh(new THREE.CylinderGeometry(.065,.065,.19,16,1,true),this.chrome);tip.rotation.x=Math.PI/2;tip.position.set(s*(.55+offset),-.31,-2.45);
        const black=this.mesh(new THREE.CircleGeometry(.052,16),this.trim);black.rotation.y=Math.PI;black.position.set(s*(.55+offset),-.31,-2.55);
      }
      // Two rounded central grille inlets with narrow vertical fins.
      const inlet=this.mesh(new THREE.SphereGeometry(1,18,12),this.trim);inlet.scale.set(.225,.135,.035);inlet.position.set(s*.235,.005,2.475);
      for(let j=0;j<6;j++) {
        const z=2.505-Math.pow((j-2.5)/6,2)*.03;
        this.line([new THREE.Vector3(s*(.07+j*.055),-.065,z),new THREE.Vector3(s*(.07+j*.055),.09,z)],.006,this.chrome);
      }
      const headlight=new THREE.SpotLight(0xd9ecff,5,28,.33,.55,1.6);headlight.position.set(s*.61,.10,2.42);headlight.target.position.set(s*.55,-.45,23);this.group.add(headlight,headlight.target);
    }
    const plateMaterial=new THREE.MeshStandardMaterial({color:0xc2c8bf,metalness:.2,roughness:.6});
    const plate=this.mesh(new THREE.PlaneGeometry(.43,.10),plateMaterial);plate.position.set(0,-.08,-2.45);plate.rotation.y=Math.PI;
    // A restrained lip spoiler and front splitter complete the silhouette.
    this.line([new THREE.Vector3(-.80,.23,-2.23),new THREE.Vector3(0,.26,-2.36),new THREE.Vector3(.80,.23,-2.23)],.022,this.paint);
    this.line([new THREE.Vector3(-.77,-.34,2.33),new THREE.Vector3(0,-.39,2.52),new THREE.Vector3(.77,-.34,2.33)],.022,this.trim);
  }
  private buildWheel(index:number):void {
    const side=index%2===0?-1:1;
    const pivot=new THREE.Group(),spin=new THREE.Group();pivot.add(spin);this.group.add(pivot);this.wheelPivots.push(pivot);this.wheelSpins.push(spin);
    const rubber=new THREE.MeshStandardMaterial({color:0x171a1b,roughness:.91,metalness:.02});
    const tire=this.mesh(new THREE.TorusGeometry(.278,.072,12,40),rubber,spin);tire.rotation.y=Math.PI/2;
    const barrel=this.mesh(new THREE.CylinderGeometry(.264,.264,.215,32,1,true),this.trim,spin);barrel.rotation.z=Math.PI/2;
    const rim=this.mesh(new THREE.TorusGeometry(.248,.014,6,40),this.chrome,spin);rim.rotation.y=Math.PI/2;rim.position.x=side*.11;
    const discMat=new THREE.MeshStandardMaterial({color:0x5b6264,metalness:.82,roughness:.40});
    const disc=this.mesh(new THREE.CylinderGeometry(.216,.216,.012,32),discMat,spin);disc.rotation.z=Math.PI/2;disc.position.x=side*.07;
    for(let j=0;j<10;j++) {
      const a=j/10*Math.PI*2;
      this.line([new THREE.Vector3(side*.119,Math.cos(a)*.055,Math.sin(a)*.055),new THREE.Vector3(side*.123,Math.cos(a+.12)*.15,Math.sin(a+.12)*.15),new THREE.Vector3(side*.118,Math.cos(a+.16)*.242,Math.sin(a+.16)*.242)],.012,this.chrome,spin);
      for(const radius of [.152,.182]) {
        const hole=this.mesh(new THREE.CircleGeometry(.006,5),this.trim,spin);hole.rotation.y=side*Math.PI/2;hole.position.set(side*.079,Math.cos(a+.24)*radius,Math.sin(a+.24)*radius);
      }
    }
    const hub=this.mesh(new THREE.CylinderGeometry(.052,.052,.025,16),this.chrome,spin);hub.rotation.z=Math.PI/2;hub.position.x=side*.12;
    const caliperMat=new THREE.MeshStandardMaterial({color:0x77382a,metalness:.6,roughness:.4});
    const caliper=this.mesh(new THREE.CapsuleGeometry(.032,.095,3,8),caliperMat,pivot);caliper.position.set(side*.095,.10,-.14);caliper.rotation.x=-.5;
    // Sparse tread grooves provide genuine silhouette detail rather than a smooth rubber ring.
    for(let j=0;j<36;j++) {
      const a=j/36*Math.PI*2;
      this.line([new THREE.Vector3(-.045,Math.cos(a)*.350,Math.sin(a)*.350),new THREE.Vector3(.045,Math.cos(a+.025)*.350,Math.sin(a+.025)*.350)],.0018,this.trim,spin);
    }
  }

  update(pose:{position:THREE.Vector3;quaternion:THREE.Quaternion},wheels:Array<{compression:number;rotation:number;steering:number;localPosition:THREE.Vector3;suspensionLength?:number}>,brake:boolean):void {
    this.group.position.copy(pose.position);this.group.quaternion.copy(pose.quaternion);
    wheels.forEach((wheel,i)=>{
      const pivots=this.licensedModel?this.licensedWheelPivots:this.wheelPivots;
      const spins=this.licensedModel?this.licensedWheelSpins:this.wheelSpins;
      const pivot=pivots[i];if(!pivot)return;
      pivot.position.copy(wheel.localPosition);pivot.position.y-=wheel.suspensionLength??(.43-wheel.compression);
      pivot.rotation.y=wheel.steering;spins[i].rotation.x=wheel.rotation;
    });
    if(this.contactShadow&&wheels.length)this.contactShadow.position.y=wheels.reduce((sum,w)=>sum+w.localPosition.y-(w.suspensionLength??(.43-w.compression))-.33,0)/wheels.length;
    this.brakeMaterial.emissiveIntensity=brake?5:1.2;
    for(const material of this.licensedBrakeMaterials)material.emissiveIntensity=brake?3:1;
    for(const light of this.brakeLights)light.intensity=brake?1.4:.12;
  }

  /**
   * Loads the user's Echoo model converted without mesh/material edits. The GLB
   * retains original mesh nodes; only scene transforms animate its existing
   * separate wheels. Public distribution remains noncommercial under CC BY-NC-ND.
   */
  async loadLicensedModel(url:string):Promise<void> {
    if(this.licensedModel)return;
    const response=await fetch(url);
    if(!response.ok)throw new Error(`Modèle BMW indisponible (${response.status})`);
    let bytes:ArrayBuffer;
    if(url.endsWith('.json')) {
      const manifest=await response.json() as {format:string;parts:string[];bytes:number;sha256:string};
      if(manifest.format!=='drive2forget-gzip-parts-v1'||!Array.isArray(manifest.parts)||manifest.parts.some(p=>!/^[a-zA-Z0-9._-]+$/.test(p)))throw new Error('Manifeste BMW invalide.');
      const base=new URL(url,window.location.href);
      const parts=await Promise.all(manifest.parts.map(async path=>{const part=await fetch(new URL(path,base));if(!part.ok)throw new Error(`Partie du modèle BMW indisponible (${part.status})`);return new Uint8Array(await part.arrayBuffer());}));
      const length=parts.reduce((sum,part)=>sum+part.byteLength,0);if(length!==manifest.bytes)throw new Error('Le modèle BMW est incomplet.');
      const combined=new Uint8Array(length);let offset=0;for(const part of parts){combined.set(part,offset);offset+=part.byteLength;}
      bytes=combined.buffer;
      if(crypto.subtle){const digest=await crypto.subtle.digest('SHA-256',bytes);const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');if(hash!==manifest.sha256)throw new Error('Le modèle BMW est corrompu.');}
    } else bytes=await response.arrayBuffer();
    const magic=new Uint8Array(bytes,0,Math.min(2,bytes.byteLength));
    if(magic[0]===0x1f&&magic[1]===0x8b) {
      if(typeof DecompressionStream==='undefined')throw new Error('Ce navigateur ne prend pas en charge la décompression du modèle.');
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes=await new Response(stream).arrayBuffer();
    }
    const gltf=await new GLTFLoader().parseAsync(bytes,'');
    const container=new THREE.Group();container.name='BMW M5 Competition — Echoo — CC BY-NC-ND 4.0';
    container.add(gltf.scene);
    // Source is centimetres with +Z forward. The conversion's unit node already
    // expresses metres. Runtime alignment matches the simulated chassis origin.
    gltf.scene.position.set(0,-.80,-.0712);
    container.updateMatrixWorld(true);
    const mapping=[
      {tyre:'Object_53',rotating:['Object_53','Object_54','Object_55'],calipers:['Object_3','Object_4']},
      {tyre:'Object_44',rotating:['Object_44','Object_45','Object_46'],calipers:['Object_9','Object_10']},
      {tyre:'Object_50',rotating:['Object_50','Object_51','Object_52'],calipers:['Object_7','Object_8']},
      {tyre:'Object_47',rotating:['Object_47','Object_48','Object_49'],calipers:['Object_5','Object_6']},
    ];
    // Validate all names before hiding the development car. A missing/corrupt
    // asset leaves the explicitly labelled playable fallback available.
    for(const wheel of mapping)for(const name of [...wheel.rotating,...wheel.calipers]) {
      if(!container.getObjectByName(name))throw new Error(`Nœud de roue BMW manquant : ${name}`);
    }
    for(const [index,wheel] of mapping.entries()) {
      const tyre=container.getObjectByName(wheel.tyre)!;
      const center=new THREE.Box3().setFromObject(tyre).getCenter(new THREE.Vector3());
      const pivot=new THREE.Group(),spin=new THREE.Group();pivot.name=`Physics_wheel_${index}`;spin.name=`Physics_spin_${index}`;
      pivot.position.copy(center);container.add(pivot);pivot.add(spin);container.updateMatrixWorld(true);
      for(const name of wheel.rotating)spin.attach(container.getObjectByName(name)!);
      for(const name of wheel.calipers)pivot.attach(container.getObjectByName(name)!);
      this.licensedWheelPivots.push(pivot);this.licensedWheelSpins.push(spin);
    }
    container.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      object.castShadow=true;object.receiveShadow=true;
      for(const material of Array.isArray(object.material)?object.material:[object.material]) {
        if(material instanceof THREE.MeshStandardMaterial) {
          if(material.transparent)object.receiveShadow=false;
          if(material.name==='TEX_010'&&!this.licensedBrakeMaterials.includes(material))this.licensedBrakeMaterials.push(material);
        }
      }
    });
    // The model's window material was almost transparent, exposing an incomplete
    // cabin. Use opaque reflective exterior glazing at render time only.
    const glasses=new Map<THREE.Material,THREE.Material>();
    container.traverse(o=>{if(o instanceof THREE.Mesh){
      const fix=(m:THREE.Material)=>{if(m instanceof THREE.MeshStandardMaterial&&(m.name==='TEX_017'||m.name==='TEX_014')){if(!glasses.has(m))glasses.set(m,exteriorGlass(m));return glasses.get(m)!;}return m;};
      o.material=Array.isArray(o.material)?o.material.map(fix):fix(o.material);
    }});
    const cache=new Map<THREE.BufferGeometry,THREE.BufferGeometry>();
    for(const wheel of mapping)for(const name of wheel.rotating){
      const mesh=container.getObjectByName(name) as THREE.Mesh;
      const original=mesh.geometry;
      if(!cache.has(original))cache.set(original,await wheelLOD(original,.15));
      this.wheelVariants.set(mesh,{original,compact:cache.get(original)!});
      mesh.castShadow=false;
    }
    // Daytime driving doesn't need the four lights left by the development car.
    this.group.traverse(o=>{if(o instanceof THREE.Light){o.visible=false;}});
    this.licensedModel=container;this.setQuality(this.quality);this.shell.visible=false;
    for(const pivot of this.wheelPivots)pivot.visible=false;
    this.group.name='BMW M5 Competition — Echoo (CC BY-NC-ND 4.0)';
    this.group.add(container);
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=192;
    const ctx=canvas.getContext('2d')!;ctx.scale(1,2);const gradient=ctx.createRadialGradient(48,48,4,48,48,48);
    gradient.addColorStop(0,'rgba(0,0,0,.38)');gradient.addColorStop(.5,'rgba(0,0,0,.25)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
    const texture=new THREE.CanvasTexture(canvas);
    this.contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,5.2),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    this.contactShadow.rotation.x=-Math.PI/2;this.contactShadow.position.y=-.75;this.group.add(this.contactShadow);
  }

  dispose():void {
    this.group.removeFromParent();
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    this.group.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
    const textures=new Set<THREE.Texture>();
    for(const material of materials)for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
    for(const g of this.wheelVariants.values()){geometries.add(g.original);geometries.add(g.compact);}
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
}
