import {describe,it,expect} from 'vitest';
import {MeshStandardMaterial,TorusGeometry} from 'three';
import {exteriorGlass,wheelLOD} from '../src/vehicle/VehicleRendering';
import {initialQuality,QualityManager} from '../src/graphics/QualityManager';

describe('exterior car rendering',()=>{
 it('occludes the cabin and keeps depth without modifying the source material',()=>{
  const original=new MeshStandardMaterial({transparent:true,opacity:.25});const glass=exteriorGlass(original);
  expect(glass.opacity).toBe(1);expect(glass.transparent).toBe(false);expect(glass.depthWrite).toBe(true);
  expect(original.opacity).toBe(.25);expect(original.transparent).toBe(true);original.dispose();glass.dispose();
 });
 it('reduces wheel draw work while preserving original positions, normals and full detail indices',async()=>{
  const source=new TorusGeometry(.278,.072,48,192);const count=source.index!.count;
  const lod=await wheelLOD(source,.15);
  expect(lod.index!.count).toBeLessThan(count*.6);expect(source.index!.count).toBe(count);
  expect(lod.getAttribute('position')).toBe(source.getAttribute('position'));expect(lod.getAttribute('normal')).toBe(source.getAttribute('normal'));
  for(const index of lod.index!.array)expect(index).toBeLessThan(source.getAttribute('position').count);
  source.dispose();lod.dispose();
 });
});
describe('adaptive display budget',()=>{
 it('starts automatic for old high settings and retains an explicit economy choice',()=>{
  expect(initialQuality({getItem:()=>null})).toBe('auto');
  expect(initialQuality({getItem:k=>k==='d2f-quality'?'high':null})).toBe('auto');
  expect(initialQuality({getItem:k=>k==='d2f-quality'?'low':null})).toBe('low');
 });
 it('caps high DPI pixel work and adapts only to sustained slow frames',()=>{
  const q=new QualityManager('auto');const ratio=q.pixelRatio(2560,1440,2);expect(2560*1440*ratio*ratio).toBeLessThanOrEqual(1280001);
  for(let i=0;i<240;i++)q.observe(1/60);const initial=q.scale;
  q.observe(.25);expect(q.scale).toBe(initial);
  for(let i=0;i<240;i++)q.observe(1/25);expect(q.scale).toBeLessThan(initial);expect(q.scale).toBeGreaterThanOrEqual(.6);
  q.setQuality('low');for(let i=0;i<100;i++)q.observe(.1);expect(q.scale).toBe(1);
 });
});
