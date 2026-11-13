import {test,expect} from '@playwright/test';
const state=(page:import('@playwright/test').Page)=>page.evaluate(()=>((window as any).__drive2forget).getState());
test('exterior windows, wheel LOD and live quality changes',async({page})=>{
 await page.setViewportSize({width:800,height:450});
 await page.addInitScript(()=>{localStorage.setItem('d2f-quality-v2','low');});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled({timeout:60000});
 const loaded=await state(page);expect(loaded.carRendering.glassOpaque).toBe(true);expect(loaded.carRendering.triangles).toBeLessThan(400000);
 await page.evaluate(()=>{document.querySelector<HTMLButtonElement>('#start')!.click();document.querySelector<HTMLButtonElement>('#skip')!.click();});
 await page.waitForFunction(()=>((window as any).__drive2forget).getState().mode==='driving');
 await page.keyboard.press('Escape');await expect(page.locator('#pause')).toBeVisible();
 const paused=await state(page);
 await page.locator('#quality').selectOption('auto');expect((await state(page)).quality).toBe('auto');
 await page.locator('#quality').selectOption('low');
 const light=await state(page);expect(light.position).toEqual(paused.position);expect(light.shadows).toBe(false);expect(light.carRendering.glassOpaque).toBe(true);expect(light.carRendering.triangles).toBeLessThan(400000);
});
