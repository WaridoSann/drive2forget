import {test,expect} from '@playwright/test';

const state=(page:import('@playwright/test').Page)=>page.evaluate(()=>((window as any).__drive2forget).getState());
// SwiftShader can accumulate an expensive frame queue during screenshots. Stop
// issuing frames for the capture, then resume the same callback afterwards.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  const original=window.requestAnimationFrame.bind(window);let blocked=false;let pending:FrameRequestCallback|null=null;
  localStorage.setItem('d2f-quality','low');
  (window as any).__blockFrames=(value:boolean)=>{blocked=value;if(!value&&pending){const next=pending;pending=null;original(next);}};
  window.requestAnimationFrame=(callback:FrameRequestCallback)=>original(time=>{if(blocked)pending=callback;else callback(time);});
 });
});
async function capture(page:import('@playwright/test').Page,path:string){await page.evaluate(()=>(window as any).__blockFrames(true));await page.screenshot({path,timeout:90000});await page.evaluate(()=>(window as any).__blockFrames(false));}

test('black opening, cinematic, stationary start, driving, pause and reset',async({page})=>{
 const errors:string[]=[];const failed:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
 await page.goto('/');
 const start=page.getByRole('button',{name:/COMMENCER/});await expect(start).toBeEnabled({timeout:60000});
 await page.screenshot({path:'test-results/opening-1920.png'});
 expect((await state(page)).mode).toBe('ready');
 await start.click();await expect(page.locator('#skip')).toBeVisible();
 await page.waitForFunction(()=>((window as any).__drive2forget).getState().mode==='driving',null,{timeout:45000});
 const initial=await state(page);expect(initial.vehicleModel).toBe('bmw-m5');expect(initial.shadows).toBe(false);expect(Math.abs(initial.speedKmh)).toBeLessThan(.3);expect(initial.groundedWheels).toBe(4);
 await capture(page,'test-results/forest-1920.png');
 await page.setViewportSize({width:640,height:360});
 await page.keyboard.down('w');await page.waitForFunction(()=>((window as any).__drive2forget).getState().speedKmh>5,null,{timeout:90000});await page.keyboard.up('w');
 const driven=await state(page);expect(driven.speedKmh).toBeGreaterThan(4);expect(driven.globalZ).toBeGreaterThan(initial.globalZ+.2);
 await page.keyboard.press('Escape');await expect(page.locator('#pause')).toBeVisible();
 const paused=await state(page);await page.waitForTimeout(350);const still=await state(page);expect(still.position).toEqual(paused.position);
 await page.keyboard.press('Escape');await expect(page.locator('#pause')).toBeHidden();
 await page.keyboard.press('r');await page.waitForTimeout(1500);const reset=await state(page);expect(Math.abs(reset.speedKmh)).toBeLessThan(.5);
 await page.keyboard.press('F3');await expect(page.locator('#diagnostics')).toBeVisible();
 console.log('MEASUREMENT',JSON.stringify(await state(page)));
 expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('reduced lighting and skip at 1440p',async({page})=>{
 await page.setViewportSize({width:2560,height:1440});await page.goto('/');await expect(page.locator('#start')).toBeEnabled({timeout:60000});
 await page.locator('#opening-reduced').check();await page.evaluate(()=>{document.querySelector<HTMLButtonElement>('#start')!.click();document.querySelector<HTMLButtonElement>('#skip')!.click();});
 await page.waitForFunction(()=>((window as any).__drive2forget).getState().mode==='driving',null,{timeout:45000});
 await capture(page,'test-results/forest-2560.png');
 expect(Math.abs((await state(page)).speedKmh)).toBeLessThan(.3);
});
