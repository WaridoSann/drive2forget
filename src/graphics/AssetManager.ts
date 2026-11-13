import {TextureLoader, LoadingManager, Texture, RepeatWrapping, SRGBColorSpace, NoColorSpace} from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';

export interface SurfaceAssets {map:Texture;normalMap:Texture;roughnessMap:Texture}
export class AssetManager {
  readonly manager=new LoadingManager();
  readonly loader=new TextureLoader(this.manager);
  readonly textures:Texture[]=[];
  readonly base=import.meta.env.BASE_URL+'assets/';
  onProgress:(percentage:number)=>void=()=>{};
  constructor(){this.manager.onProgress=(_url,loaded,total)=>this.onProgress(Math.round(loaded/total*100));}
  async surface(name:string,size='2k'):Promise<SurfaceAssets>{
    const maps=await Promise.all(['diff','nor_gl','rough'].map(suffix=>this.loader.loadAsync(this.base+`textures/${name}_${suffix}_${size}.jpg`)));
    maps.forEach((texture,i)=>{texture.wrapS=texture.wrapT=RepeatWrapping;texture.colorSpace=i===0?SRGBColorSpace:NoColorSpace;texture.anisotropy=8;this.textures.push(texture);});
    return {map:maps[0],normalMap:maps[1],roughnessMap:maps[2]};
  }
  async load(){
    const [asphalt,ground,bark,hdr]=await Promise.all([this.surface('asphalt_02'),this.surface('forest_ground_04'),this.surface('bark_brown_02','1k'),new RGBELoader(this.manager).loadAsync(this.base+'environments/forest_slope_1k.hdr')]);
    this.textures.push(hdr);return {asphalt,ground,bark:bark.map,hdr};
  }
  dispose(){this.textures.forEach(t=>t.dispose());}
}
