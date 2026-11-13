import {Scene,WebGLRenderer,PMREMGenerator,Texture,Color,Fog,DirectionalLight,HemisphereLight,Vector3,Mesh,SphereGeometry,MeshBasicMaterial,BackSide} from 'three';
export class EnvironmentManager {
  readonly sun=new DirectionalLight(0xffe3b7,3.3);
  readonly sky:Mesh;
  readonly environment;
  constructor(readonly scene:Scene,renderer:WebGLRenderer,hdr:Texture){
    const pmrem=new PMREMGenerator(renderer);this.environment=pmrem.fromEquirectangular(hdr);scene.environment=this.environment.texture;scene.environmentIntensity=.62;pmrem.dispose();
    scene.background=new Color('#c3cfc2');scene.fog=new Fog('#bfcaba',165,540);
    scene.add(new HemisphereLight(0xd7e1db,0x4e5c36,1.45));
    this.sun.position.set(-60,70,65);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);const c=this.sun.shadow.camera;c.left=-55;c.right=55;c.top=55;c.bottom=-55;c.near=1;c.far=210;this.sun.shadow.bias=-.00025;this.sun.shadow.normalBias=.025;this.sun.shadow.radius=3;
    scene.add(this.sun,this.sun.target);
    this.sky=new Mesh(new SphereGeometry(1800,24,12),new MeshBasicMaterial({color:0xc5d0c8,side:BackSide,depthWrite:false}));scene.add(this.sky);
  }
  setQuality(quality:string){const distance=quality==='high'?540:quality==='low'?270:370;this.scene.fog=new Fog('#bfcaba',quality==='low'?110:165,distance);}
  update(position:Vector3){this.sun.position.copy(position).add(new Vector3(-60,70,65));this.sun.target.position.copy(position);this.sun.target.updateMatrixWorld();this.sky.position.copy(position);}
  dispose(){this.environment.dispose();this.sun.dispose();this.sky.geometry.dispose();(this.sky.material as MeshBasicMaterial).dispose();}
}
