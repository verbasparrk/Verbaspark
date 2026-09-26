import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {renderProfile} from '../api/page.js';

test('public profile keeps its SEO fallback out of view until the chosen layout is ready',async({page,browser})=>{
 const shell=await readFile(new URL('../editor/index.html',import.meta.url),'utf8');
 const document={name:'Alex Morgan',layout:'classic',accent:'#448aff',cards:[
  {id:'intro',type:'intro',title:'Entertainment Technical Manager',body:'A profile introduction.'},
  {id:'link',type:'link',title:'Portfolio',url:'https://example.com'}
 ]};
 const response={status(){return this},send(html){this.html=html;return this}};
 await renderProfile({query:{},profileShell:shell},response,{slug:'owner',document},'http://127.0.0.1:5175/p/owner');
 await page.route('**/p/owner',route=>route.fulfill({contentType:'text/html',body:response.html}));
 await page.route('**/src/main.js',async route=>{await new Promise(resolve=>setTimeout(resolve,1200));await route.continue()});
 const navigation=page.goto('/p/owner',{waitUntil:'domcontentloaded'});
 await expect(page.locator('html')).toHaveClass(/profile-hydrating/);
 await expect(page.locator('.seo-profile')).toBeHidden();
 await navigation;
 await expect(page.locator('.classic-page')).toBeVisible();
 await expect(page.locator('.classic-page')).toContainText('Entertainment Technical Manager');
 await expect(page.locator('html')).not.toHaveClass(/profile-hydrating/);

 const noScript=await browser.newContext({javaScriptEnabled:false});
 try{
  const fallback=await noScript.newPage();
  await fallback.route('**/p/owner',route=>route.fulfill({contentType:'text/html',body:response.html}));
  await fallback.goto('/p/owner');
  await expect(fallback.locator('.seo-profile')).toBeVisible();
  await expect(fallback.locator('h1')).toHaveText('Alex Morgan');
 }finally{await noScript.close()}
});
