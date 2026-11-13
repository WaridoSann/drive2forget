import {BufferAttribute,BufferGeometry,MeshStandardMaterial,DoubleSide} from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';

/** Display LOD only: the source GLB and its full-resolution geometry remain intact. */
export async function wheelLOD(source:BufferGeometry,ratio:number):Promise<BufferGeometry>{
  await MeshoptSimplifier.ready;
  const position=source.getAttribute('position'),normal=source.getAttribute('normal'),uv=source.getAttribute('uv');
  if(!source.index||!position||!normal)return source;
  const positions=new Float32Array(position.count*3),attributes=new Float32Array(position.count*5);
  for(let i=0;i<position.count;i++){
    positions.set([position.getX(i),position.getY(i),position.getZ(i)],i*3);
    attributes.set([normal.getX(i),normal.getY(i),normal.getZ(i),uv?.getX(i)??0,uv?.getY(i)??0],i*5);
  }
  const [indices]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(source.index.array),positions,3,attributes,5,[.05,.05,.05,.01,.01],null,Math.floor(source.index.count*ratio/3)*3,.004,['LockBorder']);
  const lod=new BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes))lod.setAttribute(name,attribute);
  lod.setIndex(new BufferAttribute(indices,1));lod.boundingBox=source.boundingBox?.clone()??null;lod.boundingSphere=source.boundingSphere?.clone()??null;
  return lod;
}

/** Exterior-view window rendering. No blended view into the incomplete cabin. */
export function exteriorGlass(source:MeshStandardMaterial):MeshStandardMaterial{
  const glass=source.clone();glass.color.setHex(0x111a20);glass.metalness=.08;glass.roughness=.12;
  glass.opacity=1;glass.transparent=false;glass.depthWrite=true;glass.side=DoubleSide;glass.envMapIntensity=1;
  glass.name=source.name;glass.needsUpdate=true;return glass;
}
