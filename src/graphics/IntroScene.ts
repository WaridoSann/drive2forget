import {Scene,PerspectiveCamera,WebGLRenderer,CanvasTexture,SpriteMaterial,Sprite,Color,Mesh,CylinderGeometry,MeshBasicMaterial,AdditiveBlending,SpotLight,Vector3} from 'three';
// A single gradual headlight swell. No flashing or repeated exposure pulses.
export class IntroScene {
  readonly scene=new Scene();readonly camera=new PerspectiveCamera(42,1,.05,70);readonly lamps:Sprite[]=[];readonly beams:Mesh[]=[];readonly lights:SpotLight[]=[];readonly texture:CanvasTexture;
  constructor(){
    this.scene.background=new Color(0x000000);this.camera.position.set(0,.5,7);this.camera.lookAt(0,.4,0);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!;const gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.08,'rgba(238,247,255,1)');gradient.addColorStop(.27,'rgba(171,206,255,.35)');gradient.addColorStop(1,'rgba(171,206,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);this.texture=new CanvasTexture(canvas);
    for(const x of [-.82,.82]){
      const sprite=new Sprite(new SpriteMaterial({map:this.texture,color:0xe8f3ff,transparent:true,blending:AdditiveBlending,depthWrite:false}));sprite.position.set(x,.4,0);this.scene.add(sprite);this.lamps.push(sprite);
      const beam=new Mesh(new CylinderGeometry(1.25,.025,6.4,32,1,true),new MeshBasicMaterial({color:0x9dbfe5,transparent:true,opacity:0,blending:AdditiveBlending,depthWrite:false,side:2}));beam.position.set(x,.4,3.2);beam.rotation.x=Math.PI/2;this.scene.add(beam);this.beams.push(beam);
      const light=new SpotLight(0xeaf2ff,0,30,.24,.7,1);light.position.set(x,.4,0);light.target.position.set(x,.3,7);this.scene.add(light,light.target);this.lights.push(light);
    }
  }
  render(renderer:WebGLRenderer,t:number,reduced:boolean){
    const power=Math.max(0,Math.min(1,(t-.4)/2.9));this.camera.aspect=window.innerWidth/window.innerHeight;this.camera.updateProjectionMatrix();
    for(const lamp of this.lamps){lamp.scale.setScalar(.12+power*power*(reduced?1.2:9));(lamp.material as SpriteMaterial).opacity=power;}
    for(const beam of this.beams)(beam.material as MeshBasicMaterial).opacity=power*(reduced?.015:.07);
    for(const light of this.lights)light.intensity=power*20;
    renderer.toneMappingExposure=1+power*power*(reduced?.5:5);renderer.render(this.scene,this.camera);
  }
  dispose(){this.texture.dispose();this.lamps.forEach(l=>(l.material as SpriteMaterial).dispose());this.beams.forEach(b=>{b.geometry.dispose();(b.material as MeshBasicMaterial).dispose();});this.lights.forEach(l=>l.dispose());}
}
