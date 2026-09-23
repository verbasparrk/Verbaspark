import {test,expect} from '@playwright/test';
test('unfinished typing is recovered after reload and backups can be restored',async({page})=>{
 await page.goto('/editor/');await page.locator('#card-title').fill('Typed without blurring');
 await expect(page.locator('#save-status')).toContainText('Saved on device');
 await page.reload();await expect(page.locator('[data-id="project"] h2')).toHaveText('Typed without blurring');
 await page.locator('#save-status').click();const pending=page.waitForEvent('download');await page.locator('#backup-download').click();const download=await pending;const stream=await download.createReadStream();let json='';for await(const chunk of stream)json+=chunk;
 expect(JSON.parse(json).document.cards.find(c=>c.id==='project').title).toBe('Typed without blurring');
 await page.locator('.recovery-dialog .account-close').click();await page.locator('#card-title').fill('Newer version');await page.locator('#card-title').press('Tab');
 await page.locator('#save-status').click();await page.locator('#backup-import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(json)});
 await expect(page.locator('#recovery-message')).toContainText('Backup restored');
 await page.locator('.recovery-dialog .account-close').click();await expect(page.locator('.card.project h2')).toHaveText('Typed without blurring');
});
test('when browser storage fails, edits stay visible and a backup remains downloadable',async({page})=>{
 await page.goto('/editor/');await expect(page.locator('#save-status')).toContainText('Saved on device');
 await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError')};Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}});
 await page.locator('#card-title').fill('Do not lose this');await page.locator('#card-title').press('Tab');
 await expect(page.locator('#save-notice')).toBeVisible();await expect(page.locator('#save-status')).toContainText('Device save failed');
 await expect(page.locator('[data-id="project"] h2')).toHaveText('Do not lose this');
 await page.locator('#open-recovery').click();const pending=page.waitForEvent('download');await page.locator('#backup-download').click();const file=await pending;expect(file.suggestedFilename()).toBe('verbaspark-backup.json');
});
test('a damaged newest checkpoint falls back to a valid recovery version',async({page})=>{
 await page.goto('/editor/');await page.locator('#card-title').fill('Recoverable title');await page.locator('#card-title').press('Tab');await expect(page.locator('#save-status')).toContainText('Saved on device');
 await page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('verbaspark-recovery',1);req.onsuccess=()=>{const db=req.result;const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put({id:'corrupt-record',time:Date.now()+10000,document:{cards:[null]}});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}}));
 await page.reload();await expect(page.locator('[data-id="project"] h2')).toHaveText('Recoverable title');
});

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1'))});
