// SYNTHETIC ONLY. Normal visible upload/mapping, independent fixed oracle, real downloads.
"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium,productUrl,repositoryRoot,optionalScreenshotEnabled,captureScreenshot,screenshotName}=require('./smoke-runtime.cjs');
const control=path.join(repositoryRoot,'data/synthetic-kpi-calculability-control.csv');
// Frozen before product comparison. Manual decimal arithmetic is in data/KPI_CONTROL_IMPORT.md.
const expected={inventory:1901,excess:575.70,blocked:146,noDemand:650.95,noPlan:316.35,recovery:1242.05,share:65.33666491320358};
const moneyKeys=Object.keys(expected).filter(k=>k!=='share');
const exactDe={inventory:'1.901,00 €',excess:'575,70 €',blocked:'146,00 €',noDemand:'650,95 €',noPlan:'316,35 €',recovery:'1.242,05 €'};
const compactDe={inventory:'1.901 €',excess:'576 €',blocked:'146 €',noDemand:'651 €',noPlan:'316 €',recovery:'1.242 €'};
const text=s=>s.replace(/[\u00a0\u202f]/g,' ').trim();
let assertions=0;
function eq(a,b,message){assertions++;assert.deepEqual(a,b,message);}
function near(a,b,message){assertions++;assert.ok(typeof a==='number'&&Math.abs(a-b)<1e-8,`${message}: ${a} vs ${b}`);}
async function snap(page,name){if(optionalScreenshotEnabled())await captureScreenshot(page,screenshotName('overview-polish-calculability-01',name),{fullPage:false});}
async function models(page){return page.evaluate(()=>window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest(window.__obsoliqTestBridge.getOverviewRows()));}
async function upload(page,file){
 const start=page.locator('#overviewEmptyState [data-empty-upload]');
 await(await start.isVisible()?start:page.locator('#uploadButton')).click();
 await page.locator('#packageTypeModal.active').waitFor();
 const pending=page.waitForEvent('filechooser');
 await page.locator('#packageTypeInventoryButton').click();
 await(await pending).setFiles(file);
 await page.locator('#mappingModal.active').waitFor();
 await page.locator('.column-mapping-select[data-mapping-index="0"]').selectOption('material_id');
 await page.locator('.column-mapping-select[data-mapping-index="5"]').selectOption('standard_price');
}
async function applyMapping(page){
 const confirmation=page.locator('[data-input-trust-confirm]');
 if(await confirmation.isVisible())await confirmation.check();
 eq(await page.locator('#mappingApplyButton').isEnabled(),true,'visible reviewed mapping can be committed');
 await page.locator('#mappingApplyButton').click();
 await page.locator('#mappingModal.active').waitFor({state:'hidden'});
 await page.waitForFunction(()=>!document.getElementById('overviewWorkspace').dataset.dataOperation);
}
async function detail(page,key){await page.locator(`[data-kpi-details="${key}"]`).click();await page.locator('#overviewKpiDetailDialog[open]').waitFor();}
async function close(page){await page.keyboard.press('Escape');eq(await page.locator('#overviewKpiDetailDialog[open]').count(),0,'Escape closes detail');}
// Independent RFC4180 reader; it does not call the product parser or any product arithmetic.
function parseCsv(csv){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<csv.length;i++){
  const c=csv[i];
  if(c==='"'){if(quoted&&csv[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell);rows.push(row);}
 return rows;
}
async function download(page,variant){
 await page.locator('#exportInventoryButton').click();
 await page.locator('#downloadModal.active').waitFor();
 await page.locator('#downloadScopeAll').check();
 await page.locator(variant==='original'?'#downloadVariantOriginal':'#downloadVariantEnriched').check();
 await page.locator('#downloadFormatSheets').check();
 const pending=page.waitForEvent('download');await page.locator('#downloadConfirmButton').click();
 const file=await pending;const stream=await file.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);
 return {name:file.suggestedFilename(),rows:parseCsv(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/,''))};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const diagnostics={pageErrors:[],consoleErrors:[],externalRequests:[]};
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage();
 page.on('pageerror',e=>diagnostics.pageErrors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')diagnostics.consoleErrors.push(m.text());});
 page.on('request',r=>{if(/^https?:/.test(r.url()))diagnostics.externalRequests.push(r.url());});
 page.on('dialog',d=>d.accept());
 await page.addInitScript(()=>window.__OBSOLIQ_TEST_MODE__=true);
 await page.goto(productUrl);
 await upload(page,control);
 const mapping=await page.locator('.column-mapping-select[data-mapping-index]').evaluateAll(nodes=>nodes.map(n=>n.value));
 eq(mapping.includes('stock_value')&&mapping.includes('standard_price')&&mapping.includes('direct_no_need_value'),true,'normal mapping recognizes stock, EUR price and no-demand source');
 await snap(page,'control-visible-mapping-de.png');
 await applyMapping(page);
 const all=await models(page);
 for(const key of Object.keys(expected)){
  near(all[key].strictAggregate.value,expected[key],`${key} independent Soll`);
  eq(all[key].strictAggregate.status,'complete',`${key} complete`);
  eq(all[key].causes.length,0,`${key} no spurious causes`);
 }
 for(const key of moneyKeys){
  eq(all[key].exactAmount.kind,'complete',`${key} not a subtotal`);eq(all[key].exactAmount.currency,'EUR',`${key} proven EUR`);
  const card=page.locator(`[data-kpi-card="${key}"]`);
  eq(await card.getAttribute('data-kpi-availability'),'complete',`${key} complete card`);
  eq(await card.locator('[data-kpi-status]').textContent(),'Berechenbar',`${key} concise complete status`);
  eq(await card.locator('[data-kpi-amount-label]').textContent(),'Vollständiger Betrag',`${key} explicit full amount semantics`);
  eq(text(await card.locator('.value').textContent()),compactDe[key],`${key} existing compact rounding`);
  eq(await card.locator('[data-kpi-total-status]').isVisible(),false,`${key} no false missing total`);
  await detail(page,key);
  eq(text(await page.locator('[data-kpi-exact-value]').textContent()),exactDe[key],`${key} exact cents`);
  if(key==='recovery')eq(text(await page.locator('[data-kpi-share-value]').textContent()),'65,3 %','exact strict percentage presentation');
  await close(page);
 }
 eq(await page.locator('#overviewKpiIssues').isVisible(),false,'complete data has no restrictive central CTA');
 await page.evaluate(()=>scrollTo(0,0));await snap(page,'control-complete-de-light-1440x1000.png');
 await detail(page,'recovery');await snap(page,'control-recovery-detail-de-light.png');await close(page);
 const rows=await page.evaluate(()=>window.__obsoliqTestBridge.getEnrichedRowsForTest());
 const rowExpected=[
  [1000.25,150.60,441.25,441.25,0,150.60,40.40,200.20,50.05,false],
  [300.30,350.35,571.55,300.30,271.25,300.30,0,0,0,true],
  [500.50,150,676.20,500.50,175.70,150,200.20,150.30,0,true],
  [99.95,0,0,0,0,0,0,0,0,false]
 ];
 const fields=['stock_value','no_need_value','gross_recovery_potential','recovery_potential','recovery_overlap_value','net_no_need_value','net_no_plan_value','net_excess_value','net_bad_stock_value'];
 rows.forEach((row,i)=>{fields.forEach((field,j)=>near(row[field],rowExpected[i][j],`row ${i+1} ${field}`));eq(row.recovery_is_capped,rowExpected[i][9],`row ${i+1} cap`);});
 eq(rows[3].stock_value_source,'derived','blank stock is validly derived from 5 × EUR19.99');
 const enriched=await download(page,'enriched');
 eq(enriched.rows.length,5,'enriched all-source export contains 4 rows');
 const original=await download(page,'original');
 eq(original.rows,parseCsv(fs.readFileSync(control,'utf8')),'original export preserves every synthetic raw source cell including the blank');
 // Export preserves raw inputs and appends Recovery, not every canonical KPI column.
 // Reconcile only identical scope/semantics; reconstruct the documented blank-stock derivation
 // and no-demand source sum independently from exported raw cells (all control inputs >= 0).
 const exportFields={excess:'Excess (EUR)',blocked:'Bad Stock (EUR)',noPlan:'No Plan (EUR)',recovery:'Recovery-Potenzial'};
 for(const [key,label]of Object.entries(exportFields)){
  const index=enriched.rows[0].indexOf(label);eq(index>=0,true,`enriched export has ${label}`);
  near(enriched.rows.slice(1).reduce((sum,row)=>sum+Number(row[index]),0),expected[key],`${key} same-scope export sum`);
 }
 const cell=(row,label)=>row[enriched.rows[0].indexOf(label)];
 near(enriched.rows.slice(1).reduce((sum,row)=>sum+(cell(row,'Stock Value (EUR)')===''?Number(cell(row,'Stock Quantity'))*Number(cell(row,'STD Price (EUR)')):Number(cell(row,'Stock Value (EUR)'))),0),expected.inventory,'inventory reconciles from preserved stock/derivation inputs');
 near(enriched.rows.slice(1).reduce((sum,row)=>sum+['No Need EUR','No Need / Conso EUR','No Need / No Con EUR'].reduce((n,label)=>n+Number(cell(row,label)),0),0),expected.noDemand,'no-demand reconciles from the three raw source columns');
 near(enriched.rows.slice(1).reduce((sum,row)=>sum+Number(cell(row,'Überschneidung / Deckelung')),0),446.95,'exported overlap excludes double counting');
 await page.locator('#overviewGlobalSearch').fill('SYN-CALC-004');
 await page.waitForFunction(()=>window.__obsoliqTestBridge.getOverviewRows().length===1);
 const filtered=await models(page);near(filtered.inventory.strictAggregate.value,99.95,'filter updates derived stock');eq(filtered.recovery.strictAggregate.value,0,'true recovery zero');eq(filtered.share.strictAggregate.value,0,'true share zero with positive denominator');
 await detail(page,'inventory');
 eq(text(await page.locator('[data-kpi-exact-value]').textContent()),'99,95 €','filtered exact amount is current');
 await page.locator('[data-kpi-detail-close]').click();
 eq(text(await page.locator('[data-kpi-card="recovery"] .value').textContent()),'0 €','filtered true zero stays visible');
 eq(await page.locator('[data-kpi-card="inventory"]').getAttribute('data-kpi-availability'),'complete','filtered stock remains complete');
 eq(await page.locator('#overviewKpiIssues').isVisible(),false,'filter has no stale causes');
 await page.locator('#overviewGlobalSearch').fill('NO-MATCH-SYNTHETIC');
 await page.waitForFunction(()=>window.__obsoliqTestBridge.getOverviewRows().length===0);
 eq((await models(page)).inventory.strictAggregate.value,null,'empty scope is not a fabricated zero');
 await page.locator('#overviewGlobalSearch').fill('');
 await page.waitForFunction(()=>window.__obsoliqTestBridge.getOverviewRows().length===4);
 await detail(page,'recovery');await close(page);
 await page.locator('#sampleButton').click();
 await page.waitForFunction(()=>window.__obsoliqTestBridge.getState().rawRows===102&&document.getElementById('actionFeedback').textContent.trim()==='Import abgeschlossen');
 const demo=await models(page);
 for(const[key,value]of Object.entries({inventory:4703268.70,excess:424480,blocked:117003.30,noDemand:223309.70,noPlan:26781.40,recovery:779220.40}))near(demo[key].exactAmount.value,value,`unchanged error demo ${key}`);
 eq(demo.share.strictAggregate.value,null,'error demo quotient unavailable');
 eq(await page.locator('[data-kpi-card="inventory"] [data-kpi-status]').textContent(),'Teilweise','demo inventory remains visibly partial');
 eq(await page.locator('[data-kpi-card="excess"] [data-kpi-status]').textContent(),'Teilweise','demo projection remains visibly partial');
 eq(await page.locator('[data-kpi-card="noDemand"] [data-kpi-status]').textContent(),'Berechenbar','demo no-demand remains visibly complete');
 eq(await page.locator('#overviewKpiIssues').getAttribute('data-kpi-issue-positions'),'3','central count deduplicates physical rows');
 const oldToken=await page.locator('#overviewKpiIssues button').getAttribute('data-kpi-source-token');
 await page.locator('#overviewKpiIssues button').focus();await page.keyboard.press('Enter');
 await page.locator('[data-kpi-cause-focus="overview"]').waitFor();
 eq(await page.evaluate(()=>document.activeElement?.matches('[data-kpi-cause-focus="overview"] h3')),true,'keyboard navigation focuses the named source-cause destination');
 eq(await page.locator('[data-kpi-cause-row]').count(),5,'five physical cells, not duplicate dependency rows');
 eq(await page.locator('[data-kpi-cause-row]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.kpiCauseRow))].sort()),['45','56','66'],'precise three positions');
 await page.locator('[data-process="overview"]').click();
 await upload(page,control);await applyMapping(page);
 eq(await page.evaluate(token=>window.__obsoliqTestBridge.openKpiCauseFocusForTest('overview',token),oldToken),false,'old source token cannot navigate after replacement');
 eq(await page.evaluate(()=>window.__obsoliqTestBridge.getKpiCauseFocusForTest()),null,'old source focus cleared');
 eq(await page.locator('#overviewKpiIssues').isVisible(),false,'new complete source removes prior causes');
 eq(diagnostics,{pageErrors:[],consoleErrors:[],externalRequests:[]},'clean isolated browser diagnostics');
 console.log(JSON.stringify({status:'PASS',assertions,expected,actual:Object.fromEntries(Object.entries(all).map(([k,m])=>[k,m.strictAggregate.value])),mapping,exports:[enriched.name,original.name],diagnostics},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
