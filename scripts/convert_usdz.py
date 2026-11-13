"""Technical-only USDZ to glTF 2.0 conversion. No decimation, recoloring or retopology.
The source geometry, normals, UVs, node transforms and PBR values are preserved.
Identical byte buffers may be shared. Scalar metallic/roughness images are packed
into glTF's required G/B channel representation without resizing source detail.
"""
from pxr import Usd,UsdGeom,UsdShade
from PIL import Image
from pathlib import Path
from zipfile import ZipFile
import argparse,json,struct,hashlib,io,gzip
import numpy as np
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path,help='Original Echoo BMW M5 Competition USDZ file')
parser.add_argument('output_dir',type=Path,help='Directory for model.json, gzip parts and conversion manifest')
parser.add_argument('--raw-dir',type=Path,help='Optional private working directory for complete GLB and gzip files')
args=parser.parse_args()
SOURCE=args.source.expanduser().resolve()
OUT=args.output_dir.expanduser().resolve()
if not SOURCE.is_file():parser.error(f'USDZ source does not exist: {SOURCE}')
OUT.mkdir(parents=True,exist_ok=True)
stage=Usd.Stage.Open(str(SOURCE))
if stage is None:parser.error('OpenUSD could not open the source file')
if UsdGeom.GetStageUpAxis(stage)!='Y' or UsdGeom.GetStageMetersPerUnit(stage)!=.01:
 parser.error('This content-preserving converter expects the source Y-up centimetre coordinate system')
archive=ZipFile(SOURCE)
g={'asset':{'version':'2.0','generator':'drive2forget technical OpenUSD converter','copyright':'Echoo (echoo.), additional source credit @thelightning; CC BY-NC-ND 4.0','extras':dict(stage.GetRootLayer().customLayerData)},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'USD_centimetres_to_metres','scale':[.01,.01,.01],'children':[]}],'meshes':[],'materials':[],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}],'images':[],'textures':[],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]}
binary=bytearray();views={};accessors={};tex_cache={};mat_ids={};mesh_report=[]
def view(data,target=None):
 key=(hashlib.sha256(data).hexdigest(),target)
 if key in views:return views[key]
 while len(binary)%4:binary.append(0)
 obj={'buffer':0,'byteOffset':len(binary),'byteLength':len(data)}
 if target:obj['target']=target
 binary.extend(data);idx=len(g['bufferViews']);g['bufferViews'].append(obj);views[key]=idx;return idx

def accessor(a,kind,component=5126,target=34962):
 a=np.ascontiguousarray(a,dtype='<f4' if component==5126 else '<u2' if component==5123 else '<u4')
 key=(hashlib.sha256(a.tobytes()).hexdigest(),kind,component,target)
 if key in accessors:return accessors[key]
 obj={'bufferView':view(a.tobytes(),target),'componentType':component,'count':len(a),'type':kind}
 if kind=='VEC3':obj['min']=a.min(axis=0).tolist();obj['max']=a.max(axis=0).tolist()
 idx=len(g['accessors']);g['accessors'].append(obj);accessors[key]=idx;return idx

def texture_bytes(data,name,mime):
 key=hashlib.sha256(data).hexdigest()
 if key in tex_cache:return tex_cache[key]
 image=len(g['images']);g['images'].append({'name':name,'bufferView':view(data),'mimeType':mime});idx=len(g['textures']);g['textures'].append({'source':image,'sampler':0});tex_cache[key]=idx;return idx

def texture_path(input):
 src=input.GetConnectedSource()
 if not src:return None
 shader=UsdShade.Shader(src[0].GetPrim());file=shader.GetInput('file').Get()
 return file.path if file else None

def texture(input):
 p=texture_path(input)
 if not p:return None
 return texture_bytes(archive.read(p),p,'image/jpeg' if p.lower().endswith(('.jpg','.jpeg')) else 'image/png')

for prim in stage.Traverse():
 if not prim.IsA(UsdShade.Material):continue
 surf=UsdShade.Material(prim).ComputeSurfaceSource()[0]
 def val(name,default):
  value=surf.GetInput(name).Get();return value if value is not None else default
 color=list(val('diffuseColor',(1,1,1)));opacity=float(val('opacity',1))
 pbr={'baseColorFactor':color+[opacity],'metallicFactor':float(val('metallic',1)),'roughnessFactor':float(val('roughness',1))}
 base=texture(surf.GetInput('diffuseColor'))
 if base is not None:pbr['baseColorTexture']={'index':base}
 rough_path=texture_path(surf.GetInput('roughness'));metal_path=texture_path(surf.GetInput('metallic'))
 if rough_path or metal_path:
  imgs=[Image.open(io.BytesIO(archive.read(p))).convert('RGB') for p in [rough_path,metal_path] if p];w=max(i.width for i in imgs);h=max(i.height for i in imgs)
  def channel(path,constant):
   if not path:return Image.new('L',(w,h),round(constant*255))
   image=Image.open(io.BytesIO(archive.read(path))).convert('RGB').getchannel('R')
   assert image.size==(w,h) or image.size==(1,1),(path,image.size,(w,h))
   return image if image.size==(w,h) else Image.new('L',(w,h),image.getpixel((0,0)))
  packed=Image.merge('RGB',(Image.new('L',(w,h),255),channel(rough_path,pbr['roughnessFactor']),channel(metal_path,pbr['metallicFactor'])))
  buf=io.BytesIO();packed.save(buf,format='PNG',compress_level=9)
  pbr['metallicRoughnessTexture']={'index':texture_bytes(buf.getvalue(),prim.GetName()+'_gltf_roughness_metallic','image/png')}
  if rough_path:pbr['roughnessFactor']=1
  if metal_path:pbr['metallicFactor']=1
 material={'name':prim.GetName(),'pbrMetallicRoughness':pbr,'emissiveFactor':list(val('emissiveColor',(0,0,0)))}
 normal=texture(surf.GetInput('normal'))
 if normal is not None:material['normalTexture']={'index':normal}
 if opacity<1:material['alphaMode']='BLEND'
 mat_ids[str(prim.GetPath())]=len(g['materials']);g['materials'].append(material)

cache=UsdGeom.XformCache();vertices=faces=0
for prim in stage.Traverse():
 if not prim.IsA(UsdGeom.Mesh):continue
 usd=UsdGeom.Mesh(prim);points=np.array(usd.GetPointsAttr().Get(),dtype=np.float32);normal=np.array(usd.GetNormalsAttr().Get(),dtype=np.float32);idx=np.array(usd.GetFaceVertexIndicesAttr().Get(),dtype=np.uint32)
 assert set(usd.GetFaceVertexCountsAttr().Get())=={3};assert usd.GetNormalsInterpolation()=='vertex' and len(points)==len(normal)
 attrs={'POSITION':accessor(points,'VEC3'),'NORMAL':accessor(normal,'VEC3')}
 uv=UsdGeom.PrimvarsAPI(prim).GetPrimvar('st0')
 if uv:
  assert uv.GetInterpolation()=='vertex' and not uv.GetIndices()
  values=np.array(uv.Get(),dtype=np.float32);values[:,1]=1-values[:,1] # USD and glTF texture V origins differ.
  attrs['TEXCOORD_0']=accessor(values,'VEC2')
 material=UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial()[0]
 mesh_idx=len(g['meshes']);g['meshes'].append({'name':prim.GetName(),'primitives':[{'attributes':attrs,'indices':accessor(idx,'SCALAR',5123 if int(idx.max())<65536 else 5125,34963),'material':mat_ids[str(material.GetPath())]}]})
 mat=cache.GetLocalToWorldTransform(prim);node={'name':prim.GetName(),'mesh':mesh_idx,'matrix':[float(mat[i][j]) for i in range(4) for j in range(4)],'extras':{'sourceUsdPath':str(prim.GetPath())}}
 g['nodes'][0]['children'].append(len(g['nodes']));g['nodes'].append(node)
 vertices+=len(points);faces+=len(idx)//3
 mesh_report.append({'node':prim.GetName(),'sourcePath':str(prim.GetPath()),'vertices':len(points),'triangles':len(idx)//3})
while len(binary)%4:binary.append(0)
g['buffers'][0]['byteLength']=len(binary);j=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode()
while len(j)%4:j+=b' '
glb=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
# Fixed timestamp and embedded filename reproduce the checked-in gzip byte-for-byte.
# Compression is lossless; the 7 MB parts only accommodate the source upload limit.
gzip_buffer=io.BytesIO()
with gzip.GzipFile(filename='m5-f90.glb',fileobj=gzip_buffer,mode='wb',mtime=0,compresslevel=9) as f:f.write(glb)
compressed=gzip_buffer.getvalue()
part_size=7_000_000
part_names=[]
part_report=[]
for offset in range(0,len(compressed),part_size):
 name=f'm5-f90.glb.gz.{len(part_names)+1:03d}'
 data=compressed[offset:offset+part_size]
 (OUT/name).write_bytes(data)
 part_names.append(name)
 part_report.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
package={'format':'drive2forget-gzip-parts-v1','parts':part_names,'bytes':len(compressed),'sha256':hashlib.sha256(compressed).hexdigest(),'decodedSha256':hashlib.sha256(glb).hexdigest()}
(OUT/'model.json').write_text(json.dumps(package,indent=2)+'\n',encoding='utf-8')
if args.raw_dir:
 raw_dir=args.raw_dir.expanduser().resolve()
 raw_dir.mkdir(parents=True,exist_ok=True)
 (raw_dir/'m5-f90.glb').write_bytes(glb)
 (raw_dir/'m5-f90.glb.gz').write_bytes(compressed)
report={'source':SOURCE.name,'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'glbSha256':hashlib.sha256(glb).hexdigest(),'glbBytes':len(glb),'gzipBytes':len(compressed),'vertices':vertices,'triangles':faces,'materials':len(g['materials']),'textures':len(g['textures']),'meshes':mesh_report,'metadata':dict(stage.GetRootLayer().customLayerData),'conversion':'Original geometry, normals, PBR values and mesh transforms preserved. Unit conversion node; texture UV origin conversion; metallic/roughness channel packing; exact-byte deduplication; no decimation, recoloring, wheel separation or creative material edits.','packaging':{'format':package['format'],'manifest':'model.json','partSize':part_size,'gzipSha256':package['sha256'],'parts':part_report}}
(OUT/'CONVERSION_MANIFEST.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
archive.close()
print(json.dumps({k:v for k,v in report.items() if k!='meshes'},indent=2))
