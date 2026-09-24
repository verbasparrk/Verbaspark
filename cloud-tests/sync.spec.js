import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test('Showcase cover uploads, reuses online storage and renders on the public page',async({page})=>{
 const server=await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 await page.locator('[data-tab=design]').click();await page.locator('[data-layout-choice=showcase]').click();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=8;c.height=8;c.getContext('2d').fillRect(0,0,8,8);return c.toDataURL().split(',')[1]});
 await page.locator('#showcase-cover-upload').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect.poll(()=>server.draft?.document.showcaseCover?.imagePath).toMatch(/^aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\/[a-f0-9]{64}\.webp$/);
 expect(server.draft.document.showcaseCover.image).toBeUndefined();
 await page.reload();await page.locator('[data-tab=design]').click();await expect(page.locator('#showcase-cover-source')).toHaveValue('library');
 await page.locator('#showcase-cover-library').click();
 await expect(page.locator('.file-library-list .library-file')).not.toHaveCount(0);
 await expect(page.locator('.file-library-list .library-file').filter({hasText:'saved online'})).not.toHaveCount(0);
 await page.locator('.file-library-list .library-file').filter({hasText:'saved online'}).last().getByRole('button',{name:'Use as Showcase cover'}).click();
 await expect(page.locator('.showcase-page .intro .photo-viewport img')).toHaveAttribute('src',/token=mock/);
 await expect.poll(()=>server.draft?.document.showcaseCover?.source).toBe('library');
 const download=page.waitForEvent('download');await page.locator('#export').evaluate(el=>el.click());
 const html=await fs.readFile(await (await download).path(),'utf8');expect(html).toContain('class="personal-page showcase-page"');expect(html).toContain('data:image/png;base64,');
 server.publish(structuredClone(server.draft.document));await page.goto('/p/alice');
 await expect(page.locator('.showcase-page .intro .photo-viewport img')).toHaveAttribute('src',/token=mock/);
});
test('contact preserves answers on failure, blocks duplicate submissions and shows custom confirmation',async({page})=>{
 const server=await mockCloud(page);server.publish({name:'Alice',profile:{contactForm:true,contactSuccess:'Thank you! I reply within two working days.'},cards:[]});
 let requests=0,release;await page.route('**/api/contact',async route=>{requests++;if(requests===1){await new Promise(resolve=>release=resolve);return route.fulfill({status:503,json:{error:'Unavailable'}})}return route.fulfill({json:{ok:true}})});
 await page.goto('/p/alice');const form=page.locator('[data-contact-form]');
 await form.locator('[name=name]').fill('Guest');await form.locator('[name=email]').fill('guest@example.com');await form.locator('[name=message]').fill('My enquiry');
 await form.locator('button').click();await expect(form.locator('button')).toHaveText('Sending...');await expect(form).toHaveAttribute('aria-busy','true');
 await form.dispatchEvent('submit');expect(requests).toBe(1);release();
 await expect(form.locator('button')).toHaveText('Try again');await expect(form.locator('[name=message]')).toHaveValue('My enquiry');await expect(form.locator('[name=email]')).toHaveValue('guest@example.com');
 await form.locator('button').click();await expect(form.locator('[role=status]')).toHaveText('Thank you! I reply within two working days.');await expect(form.locator('[name=message]')).toHaveValue('');expect(requests).toBe(2);
});
test('inbox badge, status filters and reply survive reload on desktop and mobile',async({page})=>{
 await mockCloud(page);await page.goto('/editor/');
 await expect(page.locator('.primary-navigation .inbox-badge')).toHaveText('1');
 await page.locator('[data-main-section="inbox"]').click();
 await expect(page.locator('.inbox-reply')).toHaveAttribute('href',/^mailto:visitor%40example\.com\?subject=Re%3A/);
 await page.locator('#inbox-filter').selectOption('new');
 await page.locator('.inbox-actions select').selectOption('read');
 await expect(page.locator('.inbox-message')).toHaveCount(0);
 await expect(page.locator('.primary-navigation .inbox-badge')).toHaveCount(0);
 await page.locator('#inbox-filter').selectOption('read');
 await expect(page.locator('.inbox-message')).toHaveCount(1);
 await page.locator('.inbox-actions select').selectOption('closed');
 await page.locator('#inbox-filter').selectOption('closed');
 await expect(page.locator('.inbox-actions select')).toHaveValue('closed');
 await page.reload();await page.setViewportSize({width:390,height:844});
 await page.locator('[data-mobile-tool="inbox"]').click();
 await expect(page.locator('.inbox-actions select')).toHaveValue('closed');
 await page.locator('.inbox-actions select').selectOption('new');
 await expect(page.locator('.mobile-tools .inbox-badge')).toHaveText('1');
 expect(await page.locator('.profile-tool').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});
test('public visitor switches language, sends an enquiry and generates only public activity',async({page})=>{
 const server=await mockCloud(page);server.publish({name:'Alice',profile:{contactForm:true,analytics:true,defaultLanguage:'en',languages:['sl'],names:{sl:'Alica'},vcard:{enabled:true,name:'Alice'}},cards:[{id:'intro',type:'intro',title:'Hello',body:'My page',url:'https://example.com',translations:{sl:{title:'Pozdrav'}}}]});
 const events=[],messages=[];await page.route('**/api/event',route=>{events.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}})});await page.route('**/api/contact',route=>{messages.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}})});
 await page.goto('/p/alice');await expect(page.locator('.intro h2')).toHaveText('Hello');await expect.poll(()=>events.length).toBe(1);
 await page.locator('[data-profile-language]').selectOption('sl');await expect(page.locator('.intro h2')).toHaveText('Pozdrav');expect(events.length).toBe(1);await expect(page).toHaveURL(/lang=sl/);
 const form=page.locator('[data-contact-form]');await form.locator('[name="name"]').fill('Guest');await form.locator('[name="email"]').fill('guest@example.com');await form.locator('[name="message"]').fill('Please contact me');await form.locator('button').click();await expect(form.locator('[role=status]')).toContainText('poslano');expect(messages[0].slug).toBe('alice');expect(messages[0].message).toBe('Please contact me');
 await page.locator('.intro a').evaluate(el=>el.addEventListener('click',event=>event.preventDefault()));await page.locator('.intro a').click();await expect.poll(()=>events.filter(e=>e.event==='click').length).toBe(1);expect(events.at(-1).card).toBe('intro');
 await page.reload();await expect(page.locator('.intro h2')).toHaveText('Pozdrav');
});
test('owner can read private inbox and aggregate link performance',async({page})=>{
 const server=await mockCloud(page);server.publish({name:'Alice',profile:{analytics:true},cards:[{id:'intro',type:'intro',title:'My website',url:'https://example.com'}]});await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 await page.locator('#page-menu-toggle').click();await page.locator('#inbox').click();await expect(page.locator('.inbox-message')).toContainText('A private enquiry');await expect(page.locator('.inbox-message a')).toHaveAttribute('href',/^mailto:visitor%40example\.com\?subject=Re%3A/);await page.locator('.profile-tool .account-close').click();
 await page.locator('#page-menu-toggle').click();await page.locator('#analytics').click();await expect(page.locator('.analytics-totals')).toHaveText('3 visits · 2 clicks');await expect(page.locator('.profile-tool table').first()).toContainText('My website');await page.setViewportSize({width:390,height:844});expect(await page.locator('.profile-tool').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});
test('dashboard tracks publication, sharing and unpublished edits on desktop and mobile',async({page})=>{
 const server=await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 const open=async()=>{await page.locator('#page-menu-toggle').click();await page.locator('#dashboard').click()};
 await open();await expect(page.locator('#publication-status')).toHaveText('Not published');await expect(page.locator('#dashboard-sharing')).toBeHidden();await expect(page.locator('#dashboard-sync-detail')).toContainText('alice@example.com');await expect(page.locator('#dashboard-load')).toBeVisible();await page.locator('#dashboard-edit').click();
 await page.locator('#page-menu-toggle').click();await page.locator('#account').click();await page.locator('#publish-slug').fill('alice');await page.locator('#cloud-publish').click();await page.locator('#review-continue').click();await expect.poll(()=>server.published?.slug).toBe('alice');await page.locator('.account-close').click();
 await open();await expect(page.locator('#publication-status')).toHaveText('Published · up to date');await expect(page.locator('#dashboard-open')).toHaveAttribute('href',/\/p\/alice$/);
 await page.locator('.dashboard-qr summary').click();await expect(page.locator('#dashboard-qr')).toHaveAttribute('src',/^data:image\/png;base64,/);
 const download=page.waitForEvent('download');await page.locator('#dashboard-download').click();expect((await download).suggestedFilename()).toBe('verbaspark-qr.png');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedLink=text}}}));await page.locator('#dashboard-copy').click();await expect(page.locator('#dashboard-message')).toHaveText('Link copied.');expect(await page.evaluate(()=>window.copiedLink)).toMatch(/\/p\/alice$/);
 await page.locator('#dashboard-edit').click();await page.locator('#card-title').fill('A new title');await page.locator('#card-title').press('Tab');await open();await expect(page.locator('#publication-status')).toHaveText('Unpublished changes');
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.page-dashboard')).toBeVisible();expect(await page.locator('.page-dashboard').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'test-results/dashboard-mobile.png'});
 await page.locator('#dashboard-account').click();await page.locator('#cloud-unpublish').click();await expect(page.locator('.account-dialog [role=status]')).toContainText('unpublished');await page.locator('.account-close').click();
 await page.setViewportSize({width:1280,height:800});await open();await expect(page.locator('#publication-status')).toHaveText('Not published');await expect(page.locator('#dashboard-sharing')).toBeHidden();
});
test('dashboard loads the online draft after another device changes it',async({page})=>{
 const server=await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 const remote=structuredClone(server.draft.document);remote.name='Updated on another device';server.overwrite(remote);
 await page.locator('#page-menu-toggle').click();await page.locator('#dashboard').click();
 await expect(page.locator('#dashboard-load')).toBeVisible();await page.locator('#dashboard-load').click();
 await expect(page.locator('.page-dashboard')).toHaveCount(0);
 await expect(page.locator('.page-nav strong')).toContainText('Updated on another device');
 await expect(page.locator('#save-status')).toContainText('Saved online');
});
test('restricted owners see the reason and cannot publish from the editor',async({page})=>{
 const server=await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 server.restrict('Policy review needed');
 await page.locator('#page-menu-toggle').click();await page.locator('#dashboard').click();
 await expect(page.locator('#publication-status')).toHaveText('Restricted');
 await expect(page.locator('#publication-detail')).toContainText('Policy review needed');
 await expect(page.locator('#dashboard-publish')).toBeHidden();
 await page.locator('#dashboard-account').click();
 await expect(page.locator('.account-restriction')).toContainText('Policy review needed');
 await expect(page.locator('#cloud-publish')).toBeDisabled();
});
const user={id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',email:'alice@example.com',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};

test('account data offers a page backup and requires exact deletion confirmation',async({page})=>{
 await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 await page.locator('#page-menu-toggle').click();await page.locator('#account').click();
 await page.locator('#cloud-account-data').click();
 await expect(page.locator('.account-data-dialog')).toBeVisible();
 const downloaded=page.waitForEvent('download');await page.locator('#account-backup').click();
 const backup=JSON.parse(await fs.readFile(await (await downloaded).path(),'utf8'));
 expect(backup.format).toBe('verbaspark-backup');expect(backup.document.cards.length).toBeGreaterThan(0);
 await page.locator('.account-delete summary').click();
 await page.locator('#delete-email').fill('alice@example.com');
 await page.locator('#delete-phrase').fill('delete');
 await expect(page.locator('#delete-account')).toBeDisabled();
 await page.locator('#delete-phrase').fill('DELETE');
 await expect(page.locator('#delete-account')).toBeEnabled();
 let requestBody;
 await page.route('**/api/account',route=>{requestBody=route.request().postDataJSON();expect(route.request().headers().authorization).toMatch(/^Bearer /);return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Account deletion is not ready yet.'})})});
 await page.locator('#delete-account').click();
 await expect(page.locator('#account-data-message')).toContainText('not ready yet');
 expect(requestBody).toEqual({action:'delete',confirmEmail:'alice@example.com',confirmPhrase:'DELETE'});
});

test('publishing converts a display name with accents into a valid public address',async({page})=>{
 const server=await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 await page.locator('#page-menu-toggle').click();await page.locator('#account').click();
 const slug=page.locator('#publish-slug');await slug.fill('Marko Cipurić');
 await page.locator('#cloud-publish').click();
 await expect(slug).toHaveValue('marko-cipuric');
 await page.locator('#review-continue').click();
 await expect.poll(()=>server.published?.slug).toBe('marko-cipuric');
 await expect(page.locator('#public-link a')).toHaveAttribute('href',/\/p\/marko-cipuric$/);
});

test('successful account deletion clears this device and returns home',async({page})=>{
 await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 await page.route('**/api/account',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await page.locator('#page-menu-toggle').click();await page.locator('#account').click();await page.locator('#cloud-account-data').click();
 await page.locator('.account-delete summary').click();
 await page.locator('#delete-email').fill('alice@example.com');await page.locator('#delete-phrase').fill('DELETE');
 await page.locator('#delete-account').click();
 await expect(page).toHaveURL('/');
 expect(await page.evaluate(()=>localStorage.getItem('sb-127-auth-token'))).toBeNull();
 expect(await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('verbaspark-recovery',1);request.onsuccess=()=>{const tx=request.result.transaction('snapshots','readonly'),count=tx.objectStore('snapshots').count();count.onsuccess=()=>resolve(count.result);count.onerror=()=>reject(count.error)}}))).toBe(0);
});
async function mockCloud(page){let draft=null,published=null,restriction=null,fail=false,saves=0;const files=new Set();let inbox=[{id:'message1',name:'Visitor',email:'visitor@example.com',message:'A private enquiry',status:'new',created_at:new Date().toISOString()}];const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'mock-signature'].join('.');
 await page.addInitScript(({user,token})=>{if(!sessionStorage.getItem('mock-cloud-seeded')){localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:token,refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));sessionStorage.setItem('mock-cloud-seeded','1')}},{user,token});
 await page.route('http://127.0.0.1:59999/**',async route=>{const path=new URL(route.request().url()).pathname;const reply=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/auth/v1/user')return reply(user);
  if(path==='/auth/v1/logout')return reply({});
  if(/^\/storage\/v1\/object\/(page-files|page-images)\//.test(path)&&route.request().method()==='POST'){files.add(path.replace('/storage/v1/object/',''));return reply({Key:path})}
  if(path==='/storage/v1/object/list/page-images'&&route.request().method()==='POST')return reply([...files].filter(file=>file.startsWith('page-images/'+user.id+'/')).map(file=>({id:file,name:file.split('/').at(-1),metadata:{size:100,mimetype:'image/webp'}})));
  if(path==='/storage/v1/object/list/page-files'&&route.request().method()==='POST')return reply([]);
  if(path.startsWith('/storage/v1/object/sign/page-files/')&&route.request().method()==='POST')return reply({signedURL:path.replace('/storage/v1','')+'?token=mock'});
  if(path.startsWith('/storage/v1/object/sign/page-images/')&&route.request().method()==='POST')return reply({signedURL:path.replace('/storage/v1','')+'?token=mock'});
  if(path.startsWith('/storage/v1/object/sign/page-files/'))return route.fulfill({contentType:'application/pdf',body:'%PDF-1.4\nMock attachment\n%%EOF'});
  if(path.startsWith('/storage/v1/object/sign/page-images/'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64')});
  if(path==='/rest/v1/contact_messages'){
   const params=new URL(route.request().url()).searchParams,method=route.request().method();
   let rows=inbox.filter(row=>!params.has('status')||params.get('status')==='eq.'+row.status);
   if(method==='HEAD')return route.fulfill({status:200,headers:{'content-range':'0-0/'+rows.length,'access-control-expose-headers':'content-range'},body:''});
   if(method==='PATCH'){const row=inbox.find(row=>params.get('id')==='eq.'+row.id);Object.assign(row,route.request().postDataJSON());return reply({id:row.id})}
   if(method==='DELETE'){inbox=inbox.filter(row=>params.get('id')!=='eq.'+row.id);return reply(null)}
   return reply(rows);
  }
  if(path==='/rest/v1/profile_metrics')return reply([{day:new Date().toISOString().slice(0,10),event:'view',card:'',total:3},{day:new Date().toISOString().slice(0,10),event:'click',card:'intro',total:2}]);
  if(path==='/rest/v1/platform_restrictions')return reply(restriction?[{reason:restriction}]:[]);
  if(path==='/rest/v1/drafts')return reply(draft?[draft]:[]);
  if(path==='/rest/v1/published_pages'){if(route.request().method()==='DELETE')published=null;return reply(published?[published]:[]);}
  if(path==='/rest/v1/rpc/save_draft'){if(fail)return route.abort('failed');const body=route.request().postDataJSON();if(draft&&body.expected_revision!==draft.revision)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'VS409',message:'DRAFT_CONFLICT'})});draft={document:body.draft_document,revision:(draft?.revision||0)+1,last_save_id:body.request_id};saves++;return reply(draft.revision)}
  if(path==='/rest/v1/rpc/publish_page'){const body=route.request().postDataJSON();published={slug:body.requested_slug,document:structuredClone(draft.document)};return reply(published.slug)}
  return route.fulfill({status:404,body:'Unknown mock endpoint '+path});
 });return {publish:document=>{published={slug:'alice',document}},files,get draft(){return draft},get published(){return published},get saves(){return saves},fail:value=>{fail=value},restrict:reason=>{restriction=reason},overwrite:document=>{draft={document,revision:draft.revision+1,last_save_id:'remote'}}};
}
test('real client autosaves, retries offline edits and keeps publication separate',async({page})=>{
 const server=await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 await page.locator('#card-title').fill('Auto saved project');await page.locator('#card-title').press('Tab');
 await expect.poll(()=>server.draft.document.cards.find(c=>c.id==='project').title).toBe('Auto saved project');
 await page.locator('#page-menu-toggle').click();await page.locator('#account').click();await page.locator('#publish-slug').fill('alice');await page.locator('#cloud-publish').click();await page.locator('#review-continue').click();await expect.poll(()=>server.published?.slug).toBe('alice');await page.locator('.account-close').click();
 server.fail(true);await page.locator('#card-title').fill('Offline change');await page.locator('#card-title').press('Tab');await expect(page.locator('#save-status')).toContainText('Sync needs attention');
 await expect(page.locator('#save-notice')).toBeVisible();expect(server.published.document.cards.find(c=>c.id==='project').title).toBe('Auto saved project');
 server.fail(false);await page.locator('#save-status').click();await page.locator('#retry-save').click();await expect.poll(()=>server.draft.document.cards.find(c=>c.id==='project').title).toBe('Offline change');
 await page.locator('.recovery-dialog .account-close').click();await page.reload();await expect(page.locator('#save-status')).toContainText('Saved online');await expect(page.locator('[data-id="project"] h2')).toHaveText('Offline change');
});
test('a second-device edit pauses autosave until the user resolves the conflict',async({page})=>{
 const server=await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');const remote=structuredClone(server.draft.document);remote.name='Other device';server.overwrite(remote);const saved=server.saves;
 await page.locator('#card-title').fill('My local version');await page.locator('#card-title').press('Tab');await expect(page.locator('#save-status')).toContainText('Choose draft');expect(server.saves).toBe(saved);expect(server.draft.document.name).toBe('Other device');
 await page.locator('#save-status').click();await page.locator('#choose-local').click();await expect(page.locator('#recovery-message')).toContainText('now saved online');expect(server.draft.document.cards.find(c=>c.id==='project').title).toBe('My local version');
});

test('attachments upload privately, load signed URLs and embed in HTML exports',async({page})=>{
 const server=await mockCloud(page);await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved online');
 await page.locator('[data-tab="blocks"]').click();await page.locator('[data-add="document"]').click();await page.locator('#file-upload').setInputFiles({name:'cv.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nMock attachment\n%%EOF')});
 await expect.poll(()=>server.draft?.document.cards.find(c=>c.type==='document')?.file?.path).toMatch(/^aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\/[a-f0-9]{64}\.pdf$/);
 const file=server.draft.document.cards.find(c=>c.type==='document').file;expect(file.src).toBeUndefined();expect(server.files.size).toBe(1);expect(server.published).toBeNull();
 await page.locator('#page-menu-toggle').click();await page.locator('#account').click();await page.locator('#cloud-load').click();await expect(page.locator('.account-dialog [role=status]')).toContainText('Online draft loaded');await page.locator('.account-close').click();
 await expect(page.locator('.document [data-file-download]')).toHaveAttribute('href',/\/storage\/v1\/object\/sign\/page-files\//);
 await page.locator('#page-menu-toggle').click();const exported=page.waitForEvent('download');await page.locator('#export').click();const html=await fs.readFile(await (await exported).path(),'utf8');expect(html).toContain('data:application/pdf;base64,');expect(html).not.toContain('token=mock');
});
