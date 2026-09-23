import {test,expect} from '@playwright/test';
test('page actions live in the menu and templates show real miniature profiles',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/editor/');
 await expect(page.locator('.sidebar #account')).toHaveCount(0);await expect(page.locator('.sidebar #templates')).toHaveCount(0);
 await page.screenshot({path:'test-results/refined-editor.png'});
 await page.locator('#page-menu-toggle').click();await expect(page.locator('#account')).toBeVisible();await page.locator('#templates').click();
 await expect(page.locator('.template-thumb-frame')).toHaveCount(9);
 await expect(page.frameLocator('iframe[title="Photographer thumbnail"]').locator('.intro h2')).toHaveText('Light. Places. Stories.');
 await expect(page.frameLocator('iframe[title="Developer thumbnail"]').locator('.intro h2')).toHaveText('Hello, I’m Nika.');
 await page.screenshot({path:'test-results/refined-templates.png'});
});
test('contact cards keep natural height next to galleries and compact height persists',async({page})=>{
 await page.goto('/editor/');await page.locator('#page-menu-toggle').click();await page.locator('#templates').click();await page.locator('[data-template="photographer"]').click();await page.locator('#keep-content').uncheck();await page.locator('#apply-template').click();
 await page.locator('.bento[data-measured]').waitFor();const contact=page.locator('.card.contact');const gallery=page.locator('.card.gallery');
 expect((await contact.boundingBox()).height).toBeLessThan((await gallery.boundingBox()).height*.7);
 await contact.click();await expect(page.locator('#compact-card')).toBeChecked();await page.locator('#compact-card').uncheck();
 await expect(contact).not.toHaveClass(/compact/);await page.reload();await expect(page.locator('.card.contact')).not.toHaveClass(/compact/);
});
test('link presentation choices keep accessible destinations and export their style',async({page})=>{
 await page.goto('/editor/');await page.locator('[data-id="github"]').click();await page.locator('[data-link-style="icon"]').click();
 await expect(page.locator('[data-id="github"]')).toHaveClass(/link-style-icon/);await expect(page.locator('[data-id="github"] .eyebrow svg')).toHaveCount(1);
 await page.locator('[data-link-style="wide"]').click();await expect(page.locator('[data-id="github"]')).toHaveClass(/wide/);
 await page.locator('#preview').click();await expect(page.getByRole('link',{name:'GitHub',exact:true})).toHaveAttribute('href','https://github.com');
 const pending=page.waitForEvent('download');await page.locator('#page-menu-toggle').click();await page.locator('#export').click();const file=await pending;const stream=await file.createReadStream();let html='';for await(const chunk of stream)html+=chunk;expect(html).toContain('link-style-wide');
});
test('first steps reflect actual edits and disappear after completion',async({page})=>{
 await page.goto('/editor/');await page.locator('[data-first-step="name"]').click();await page.locator('#card-title').fill('My own page');await page.locator('#card-title').press('Tab');
 await expect(page.locator('[data-first-step="name"]')).toBeDisabled();
 await page.locator('[data-first-step="photo"]').click();const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;c.getContext('2d').fillRect(0,0,20,20);return c.toDataURL('image/png').split(',')[1]}),'base64');
 await page.locator('#photo-upload').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:png});await expect(page.locator('[data-first-step="photo"]')).toBeDisabled();
 await page.locator('[data-first-step="link"]').click();await page.locator('[name="destination"]').fill('example.org/me');await page.getByRole('button',{name:'Add to my page'}).click();
 await expect(page.locator('[data-first-step="link"]')).toBeDisabled();await page.locator('[data-first-step="preview"]').click();await page.locator('#preview').click();
 await expect(page.locator('.first-steps')).toHaveCount(0);await page.reload();await expect(page.locator('.first-steps')).toHaveCount(0);
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1'))});
