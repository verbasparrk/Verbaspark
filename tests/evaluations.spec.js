import {test,expect} from '@playwright/test';

const pdf=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const file=name=>({name,mimeType:'application/pdf',buffer:pdf});

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('verbaspark-welcome-dismissed','1'))});

test('several evaluation PDFs create one section, survive reload, and accept more files',async({page})=>{
 await page.goto('/editor/');await page.locator('[data-tab="blocks"]').click();
 await expect(page.locator('[data-add="evaluations"]')).toContainText('Evaluations');
 const chooser=page.waitForEvent('filechooser');await page.locator('[data-add="evaluations"]').click();await (await chooser).setFiles([file('AIDA-2022.pdf'),file('AIDA-2023.pdf')]);
 await expect(page.locator('.card.section')).toContainText('Past evaluations');await expect(page.locator('.card.document')).toHaveCount(2);await expect(page.locator('.card.document').first()).toContainText('AIDA 2022');
 await page.reload();await expect(page.locator('.card.document')).toHaveCount(2);
 await page.locator('.card.section').click();await expect(page.locator('#section-pdf-upload')).toBeVisible();await page.locator('#section-pdf-upload').setInputFiles(file('AIDA-2024.pdf'));
 await expect(page.locator('.card.section')).toHaveCount(1);await expect(page.locator('.card.document')).toHaveCount(3);await expect(page.locator('.card.document').last()).toContainText('AIDA 2024');
 await page.locator('#preview').click();await page.locator('.card.document').last().locator('[data-media="pdf"]').click();await expect(page.locator('.document-dialog')).toBeVisible();
});

test('invalid PDF batch adds no cards and the entry is available on phones',async({page})=>{
 await page.goto('/editor/');await page.locator('[data-tab="blocks"]').click();await page.locator('#evaluations-upload').setInputFiles([file('good.pdf'),{name:'wrong.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')}]);
 await expect(page.locator('#evaluations-status')).toContainText('does not match');await expect(page.locator('.card.section')).toHaveCount(0);await expect(page.locator('.card.document')).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});await page.locator('[data-mobile-tool="blocks"]').click();await expect(page.locator('.mobile-sheet [data-add="evaluations"]')).toBeVisible();const chooser=page.waitForEvent('filechooser');await page.locator('.mobile-sheet [data-add="evaluations"]').click();await (await chooser).setFiles(file('Latest-review.pdf'));await expect(page.locator('.card.document')).toHaveCount(1);await expect(page.locator('.card.section')).toContainText('Past evaluations');await page.locator('.mobile-sheet .sheet-done').click();await page.locator('.card.section').click();await expect(page.locator('#section-pdf-upload')).toBeVisible();await page.locator('#section-pdf-upload').setInputFiles(file('Second-review.pdf'));await expect(page.locator('.card.document')).toHaveCount(2);
});
