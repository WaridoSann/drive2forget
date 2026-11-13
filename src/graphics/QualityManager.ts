export type Quality='auto'|'low'|'high';
export const qualityProfile=(quality:Quality)=>quality==='high'?{pixels:2073600,dpr:1.25,shadows:true,distance:460}:quality==='low'?{pixels:720000,dpr:1,shadows:false,distance:230}:{pixels:1280000,dpr:1,shadows:false,distance:320};
export function initialQuality(storage:Pick<Storage,'getItem'>):Quality{
  const saved=storage.getItem('d2f-quality-v2');
  return saved==='low'||saved==='high'||saved==='auto'?saved:storage.getItem('d2f-quality')==='low'?'low':'auto';
}
export class QualityManager{
  scale=1;private seconds=0;private total=0;private samples=0;private warmup=3;private slowWindows=0;
  constructor(public quality:Quality){}
  pixelRatio(width:number,height:number,deviceRatio:number){const p=qualityProfile(this.quality);return Math.min(deviceRatio,p.dpr,Math.sqrt(p.pixels/Math.max(1,width*height)))*this.scale;}
  setQuality(quality:Quality){this.quality=quality;this.scale=1;this.warmup=3;this.seconds=this.total=this.samples=this.slowWindows=0;}
  observe(dt:number):boolean{
    if(this.quality!=='auto'||dt<=0)return false;
    if(this.warmup>0){this.warmup-=dt;return false;}
    this.seconds+=dt;this.total+=dt;this.samples++;
    if(this.seconds<1.5)return false;
    const frame=this.total/this.samples;this.seconds=this.total=this.samples=0;
    const previous=this.scale;
    if(frame>1/42){this.slowWindows++;if(this.slowWindows>=2){this.scale=Math.max(.6,this.scale-.12);this.slowWindows=0;}}
    else {this.slowWindows=0;if(frame<1/57)this.scale=Math.min(1,this.scale+.04);}
    return previous!==this.scale;
  }
}
