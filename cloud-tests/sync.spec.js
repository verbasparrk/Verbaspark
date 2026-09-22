import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const user={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',email:'alice@example.com',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
async function mockCloud(page){let draft=null,published=null,fail=false,saves=0;const files=new Set();const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'mock-signature'].join('.');
 await page.addInitScript(({user,token})=>{if(!localStorage.getItem('sb-127-auth-token'))localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:token,refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}))},{user,token});
 await page.route('http://127.0.0.1:59999/**',async route=>{const path=new URL(route.request().url()).pathname;const reply=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/v1/user')return reply(user);
  if(path.startsWith('/storage/v1/object/page-files/')&&route.request().method()==='POST'){files.add(path.split('/page-files/')[1]);return reply({Key:path})}
  if(path.startsWith('/storage/v1/object/sign/page-files/')&&route.request().method()==='POST')return reply({signedURL:path.replace('/storage/v1','')+'?token=mock'});
  if(path.startsWith('/storage/v1/object/sign/page-files/'))return route.fulfill({contentType:'application/pdf',body:'%PDF-1.4\nMock attachment\n%%EOF'});
  if(path==='/rest/v1/drafts')return reply(draft?[draft]:[]);
  if(path==='/rest/v1/published_pages')return reply(published?[published]:[]);
  if(path==='/rest/v1/rpc/save_draft'){if(fail)return route.abort('failed');const body=route.request().postDataJSON();if(draft&&body.expected_revision!==draft.revision)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'VS409',message:'DRAFT_CONFLICT'})});draft={document:body.draft_document,revision:(draft?.revision||0)+1,last_save_id:body.request_id};saves++;return reply(draft.revision)}
  if(path==='/rest/v1/rpc/publish_page'){const body=route.request().postDataJSON();published={slug:body.requested_slug,document:structuredClone(draft.document)};return reply(published.slug)}
  return route.fulfill({status:404,body:'Unknown mock endpoint '+path});
 });return {files,get draft(){return draft},get published(){return published},get saves(){return saves},fail:value=>{fail=value},overwrite:document=>{draft={document,revision:draft.revision+1,last_save_id:'remote'}}};
}
test('real client autosaves, retries offline edits and keeps publication separate',async({page})=>{
 const server=await mockCloud(page);await page.goto('/');await expect(page.locator('#save-status')).toContainText('Saved online');
 await page.locator('#card-title').fill('Auto saved project');await page.locator('#card-title').press('Tab');
 await expect.poll(()=>server.draft.document.cards.find(c=>c.id==='project').title).toBe('Auto saved project');
 await page.locator('#page-menu-toggle').click();await page.locator('#account').click();await page.locator('#publish-slug').fill('alice');await page.locator('#cloud-publish').click();await page.locator('#review-continue').click();await expect.poll(()=>server.published?.slug).toBe('alice');await page.locator('.account-close').click();
 server.fail(true);await page.locator('#card-title').fill('Offline change');await page.locator('#card-title').press('Tab');await expect(page.locator('#save-status')).toContainText('Sync needs attention');
 await expect(page.locator('#save-notice')).toBeVisible();expect(server.published.document.cards.find(c=>c.id==='project').title).toBe('Auto saved project');
 server.fail(false);await page.locator('#save-status').click();await page.locator('#retry-save').click();await expect.poll(()=>server.draft.document.cards.find(c=>c.id==='project').title).toBe('Offline change');
 await page.locator('.recovery-dialog .account-close').click();await page.reload();await expect(page.locator('#save-status')).toContainText('Saved online');await expect(page.locator('[data-id="project"] h2')).toHaveText('Offline change');
});
test('a second-device edit pauses autosave until the user resolves the conflict',async({page})=>{
 const server=await mockCloud(page);await page.goto('/');await expect(page.locator('#save-status')).toContainText('Saved online');const remote=structuredClone(server.draft.document);remote.name='Other device';server.overwrite(remote);const saved=server.saves;
 await page.locator('#card-title').fill('My local version');await page.locator('#card-title').press('Tab');await expect(page.locator('#save-status')).toContainText('Choose draft');expect(server.saves).toBe(saved);expect(server.draft.document.name).toBe('Other device');
 await page.locator('#save-status').click();await page.locator('#choose-local').click();await expect(page.locator('#recovery-message')).toContainText('now saved online');expect(server.draft.document.cards.find(c=>c.id==='project').title).toBe('My local version');
});

test('attachments upload privately, load signed URLs and embed in HTML exports',async({page})=>{
 const server=await mockCloud(page);await page.goto('/');await expect(page.locator('#save-status')).toContainText('Saved online');
 await page.locator('[data-tab="blocks"]').click();await page.locator('[data-add="document"]').click();await page.locator('#file-upload').setInputFiles({name:'cv.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nMock attachment\n%%EOF')});
 await expect.poll(()=>server.draft?.document.cards.find(c=>c.type==='document')?.file?.path).toMatch(/^aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\/[a-f0-9]{64}\.pdf$/);
 const file=server.draft.document.cards.find(c=>c.type==='document').file;expect(file.src).toBeUndefined();expect(server.files.size).toBe(1);expect(server.published).toBeNull();
 await page.locator('#page-menu-toggle').click();await page.locator('#account').click();await page.locator('#cloud-load').click();await expect(page.locator('.account-dialog [role=status]')).toContainText('Online draft loaded');await page.locator('.account-close').click();
 await expect(page.locator('.document [data-file-download]')).toHaveAttribute('href',/\/storage\/v1\/object\/sign\/page-files\//);
 await page.locator('#page-menu-toggle').click();const exported=page.waitForEvent('download');await page.locator('#export').click();const html=await fs.readFile(await (await exported).path(),'utf8');expect(html).toContain('data:application/pdf;base64,');expect(html).not.toContain('token=mock');
});
