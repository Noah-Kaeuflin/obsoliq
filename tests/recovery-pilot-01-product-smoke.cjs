// Real synthetic files, productive chooser/review/commit. Bridges read state only.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {chromium,productUrl,captureScreenshot}=require('./smoke-runtime.cjs');
const {check,checks,reviews,state,business,field,save,samples,download,apply,editItem}=require('./recovery-loop-01c-product-smoke.cjs');
const fixture=require('./fixtures/recovery-pilot-01.cjs');
const dir=path.resolve(process.env.OBSOLIQ_PILOT_FILES||''),output=process.env.OBSOLIQ_PILOT_RESULTS;
if(!process.env.OBSOLIQ_PILOT_FILES||!output)throw Error('External OBSOLIQ_PILOT_FILES and OBSOLIQ_PILOT_RESULTS required');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const model=page=>page.evaluate(()=>window.__obsoliqTestBridge.getPurchaseOrdersModelForTest());
const item=async page=>(await reviews(page)).flatMap(r=>r.positions).find(r=>r.purchase_order_item==='00010');
async function choose(page,name){
  await page.locator('[data-process="purchase-orders"]').click();
  const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.locator('#purchaseOrdersPage [data-po-import]').click()]);
  await chooser.setFiles(path.join(dir,name));
}
const policy=(page,field,key,value)=>page.locator('[data-po-policy="'+field+'"][data-policy-key="'+key+'"]').selectOption(value);
async function prepare(page,name,locale='en-US'){
  await choose(page,name);await page.locator('.po-preview').waitFor({state:'visible'});
  if(locale)await policy(page,'open_quantity','numericLocale',locale);
  const value=page.locator('[data-po-policy="open_value"][data-policy-key="numericLocale"]');if(await value.count())await value.selectOption(locale||'auto');
}
async function commit(page){await page.locator('[data-po-confirm]').check();await page.locator('#mappingApplyButton').click();await page.waitForFunction(()=>!document.getElementById('mappingModal').classList.contains('active'));}
async function imported(page,name){await prepare(page,name);await commit(page);}
async function cancel(page){await page.locator('#mappingCancelButton').click();await page.waitForFunction(()=>!document.getElementById('mappingModal').classList.contains('active'));}
async function verifyRows(page,updated,label){
  const m=await model(page);check(m.rows.length===fixture.rows.length,label+' row count');
  for(let i=0;i<fixture.rows.length;i++){
    const r=m.rows[i],source=fixture.rows[i],[q,status,reason,hasCase]=fixture.expected[i];
    check(r.purchase_order===source[0]&&r.purchase_order_item===source[1]&&r.material_id===source[2]&&r.plant===source[3],label+' physical identity row '+(i+1));
    check(r.open_quantity===(updated&&i===0?6:q)&&r.base_unit===source[5]&&r.link_status===status&&Boolean(r.case_ids.length)===hasCase,label+' quantity/unit/exact relationship row '+(i+1));
    if(reason)check(r.exclusion_reasons.includes(reason),label+' exclusion '+reason);
  }
  check(m.rows[0].delivery_date==='2026-10-01'&&m.rows[4].delivery_date==='',label+' optional dates');
  check(m.rows[0].supplier.includes('Prüftechnik')&&m.rows[3].open_value===14.4,label+' Unicode/decimal numeric cell');
  check(m.rows[9].open_value===0&&m.rows[10].open_quantity===null,label+' true zero is not missing');
  return m.rows.map(r=>({order:r.purchase_order,item:r.purchase_order_item,material:r.material_id,plant:r.plant,quantity:r.open_quantity,unit:r.base_unit,status:r.link_status,date:r.delivery_date,value:r.open_value}));
}
async function downloadFile(page,selector){const pending=page.waitForEvent('download');await page.locator(selector).click();const d=await pending;const dest=path.join(output,d.suggestedFilename());await d.saveAs(dest);return {path:dest,bytes:await fs.readFile(dest)};}
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({headless:true}),errors=[],consoleErrors=[],requests=[],alerts=[],evidence=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    page.on('dialog',async d=>{alerts.push(d.message());if(d.type()==='confirm')await d.accept();else await d.dismiss();});
    await page.addInitScript(()=>{window.__OBSOLIQ_TEST_MODE__=true;});await page.goto(productUrl);await samples(page);
    const semantics={};
    for(const ext of ['csv','tsv','xlsx'])for(const updated of [false,true]){
      const name=(updated?'po-aktualisierung.':'po-anfang.')+ext;
      await imported(page,name);const result=await verifyRows(page,updated,name);
      const key=String(updated);if(semantics[key])check(hash(result)===hash(semantics[key]),name+' semantic equality across formats');else semantics[key]=result;
      evidence.push({file:name,semanticHash:hash(result),source: (await model(page)).poIdentity});
    }
    for(const locale of ['de','en']){
      await prepare(page,'zahlen-'+locale+'.xlsx',locale==='de'?'de-DE':'en-US');await commit(page);
      check(JSON.stringify((await model(page)).rows.map(r=>r.open_quantity))==='[1234.5,2345.75]','explicit numeric text '+locale);
    }
    for(const system of ['1900','1904']){
      await prepare(page,'datum-'+system+'.xlsx');await policy(page,'delivery_date','dateFormat','excel-serial');
      check((await page.locator('.po-preview').innerText()).includes('Datum nicht interpretierbar'),'serial without system unavailable '+system);
      await policy(page,'delivery_date','excelDateSystem',system);await commit(page);
      check((await model(page)).rows[0].delivery_date==='2026-10-01','explicit serial system '+system);
    }
    await imported(page,'numerische-kennung.xlsx');
    check((await model(page)).rows[0].purchase_order==='4500001'&&(await model(page)).rows[0].purchase_order_item==='10','numeric IDs never invent lost zeros');
    let before=hash(await business(page));await prepare(page,'mehrdeutige-menge.xlsx',null);
    check((await page.locator('.po-preview').innerText()).includes('Mehrdeutiges Zahlenformat'),'ambiguous quantity needs review');
    await page.locator('[data-po-confirm]').check();check(await page.locator('#mappingApplyButton').isDisabled(),'ambiguous all-invalid source blocked');await cancel(page);
    check(hash(await business(page))===before,'cancel preserves active data/registry');
    await prepare(page,'ungueltige-zellen.xlsx');
    const invalid=await page.locator('.po-preview').innerText();check(invalid.includes('Ungültige Menge')&&invalid.includes('Offene Menge fehlt')&&invalid.includes('Keine verwendbare offene Position'),'error and no formula result remain invalid/missing');
    await page.locator('[data-po-confirm]').check();check(await page.locator('#mappingApplyButton').isDisabled(),'no usable XLSX cannot apply');await cancel(page);
    check(hash(await business(page))===before,'unusable XLSX preserves active state');
    await choose(page,'beschaedigt.xlsx');await page.waitForFunction(()=>document.getElementById('fileInput').value==='');
    check(alerts.some(t=>t.includes('XLSX-ZIP-Struktur')),'corrupt workbook has understandable error');check(hash(await business(page))===before,'parser failure preserves active state');
    await imported(page,'po-anfang.xlsx');await verifyRows(page,false,'walkthrough');
    await captureScreenshot(page,'screenshots/recovery-pilot-01/import-results.png',{fullPage:true});
    await page.locator('#purchaseOrdersPage [data-po-case]').first().click();await page.locator('[data-excess-detail-target="actions"]:visible').click();
    for(const box of await page.locator('[data-po-select]:visible').all())await box.check();await page.locator('[data-po-handoff]:visible').click();
    await editItem(page,'00010');await field(page,'direction').selectOption('request_reduction');await field(page,'work_state').selectOption('in_review');
    await field(page,'reason').fill('Synthetischer Pilot: Versorgung und Lieferbindung vor Reduktion prüfen');await field(page,'owner').fill('Synthetischer Einkauf');await field(page,'reduction_quantity').fill('8');await save(page);
    check((await item(page)).decision.work_state==='in_review'&&(await item(page)).decision_version===1,'draft v1');
    await editItem(page,'00010');await field(page,'work_state').selectOption('documented');await save(page);
    check((await item(page)).decision_version===2&&(await item(page)).source_status==='current','documented v2 after draft');
    before=hash(await business(page));await editItem(page,'00010');await page.locator('[data-po-feedback-add="2"]').click();
    const f=key=>page.locator('[data-po-feedback-field="'+key+'"]'),submit=()=>page.locator('#purchaseOrderFeedbackDialog button[type="submit"]').click();
    await f('kind').selectOption('partial_reported');await f('description').fill('Synthetische Aussage: drei Einheiten umgesetzt gemeldet');await f('remaining').fill('Fünf Einheiten noch offen gemeldet');await f('reporter').fill('Synthetischer Einkauf');await f('reported_on').fill('2026-09-05');await submit();
    const first=(await item(page)).feedback[0];check(first.target.decision_version===2,'report bound to selected documented v2');
    await page.locator('[data-po-feedback-correct="'+first.id+'"]').click();await f('description').fill('Synthetische Korrektur: zwei Einheiten gemeldet');await f('remaining').fill('Sechs Einheiten noch offen gemeldet');await f('correction_reason').fill('Zahlendreher im synthetischen Beispiel');await submit();
    check((await item(page)).feedback.length===2&&(await item(page)).feedback[1].corrects_id===first.id,'correction retains original');
    check(hash(await business(page))===before,'human report/correction no analytics or source changes');
    await captureScreenshot(page,'screenshots/recovery-pilot-01/reports.png',{fullPage:true});await page.locator('[data-po-decision-cancel]').click();
    await imported(page,'po-aktualisierung.xlsx');await page.locator('[data-process="actions"]').click();
    check((await item(page)).source_status==='stale'&&(await item(page)).feedback.length===2,'12 to6 only stales source, never generates implementation');
    await editItem(page,'00010');await page.locator('[data-po-decision-recheck]').first().click();await page.locator('[data-po-recheck-confirm]').check();await save(page);
    check((await page.locator('#purchaseOrderDecisionDialog .po-decision-errors').innerText()).length>0&&(await item(page)).decision_version===2,'8 exceeds6 and cannot create version');
    await field(page,'reduction_quantity').fill('4');await save(page);
    check((await item(page)).decision_version===3&&(await item(page)).source_status==='current'&&(await item(page)).decision_history[0].version===2,'new valid4 is v3; historical documented v2 retained');
    check((await item(page)).feedback.every(f=>f.target.decision_version===2),'new decision inherits no historical reports');
    const reviewCsv=await downloadFile(page,'[data-po-export]'),reportCsv=await downloadFile(page,'[data-po-feedback-export]');
    const parse=bytes=>page.evaluate(s=>window.ObsoliQ.data.ingestion.parseDelimited(s),bytes.toString('utf8'));
    const rc=await parse(reportCsv.bytes),dc=await parse(reviewCsv.bytes);
    check(rc.rows.length===2&&reportCsv.bytes.toString().includes(first.id)&&reportCsv.bytes.toString().includes('Zahlendreher'),'report CSV contains exact reports/correction');
    check(rc.rows.every(r=>r.decision_version==='2'&&r.requested_reduction_quantity==='8'&&r.historical_source_status==='stale'&&r.current_source_status==='current'),'CSV historical v2/request8 stays distinct from current v3');
    check(rc.rows[0].correction_state==='superseded'&&rc.rows[1].corrects_id===rc.rows[0].id&&!rc.headers.includes('open_value'),'CSV correction links and no financial multiplication');
    check(dc.rows.length===2&&reviewCsv.bytes.toString().includes('0004500001')&&reviewCsv.bytes.toString().includes('request_reduction'),'review CSV retains both handed off items');
    const exported=dc.rows.find(r=>r.purchase_order_item==='00010');check(exported.decision_version==='3'&&exported.requested_reduction_quantity==='4'&&exported.open_quantity==='6'&&exported.source_status==='current','review CSV exact current decision and observed quantity');
    const backup=await downloadFile(page,'[data-po-backup]'),original=JSON.parse(backup.bytes);
    // Same values in another physical file cannot keep a documented source current.
    await imported(page,'po-aktualisierung.tsv');check((await item(page)).source_status==='stale','equivalent TSV source does not bypass currentness');
    await page.reload();check((await reviews(page)).length===0,'reload clears session work');await samples(page);await imported(page,'po-aktualisierung.xlsx');await page.locator('[data-process="actions"]').click();
    before=hash(await business(page));const chooser=page.waitForEvent('filechooser');await page.locator('[data-po-restore]').click();await(await chooser).setFiles(backup.path);
    await page.locator('#purchaseOrderRestoreDialog').waitFor({state:'visible'});await apply(page);
    const restored=JSON.parse(await download(page));check(JSON.stringify(restored.entries)===JSON.stringify(original.entries),'actual downloaded backup roundtrip preserves versions/proofs/reports');
    check(hash(await business(page))===before,'restore changes work only');
    await editItem(page,'00010');check(await page.locator('.po-feedback-version[data-po-feedback-version="2"] .po-feedback-report').count()===2,'historical reports remain visible after restore');
    await page.locator('[data-po-feedback-add="2"]').click();
    for(const width of [1440,1024,390]){await page.setViewportSize({width,height:900});check(await page.locator('#purchaseOrderFeedbackDialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1),'restored German form fits '+width);await captureScreenshot(page,'screenshots/recovery-pilot-01/restored-'+width+'.png',{fullPage:true});}
    await page.locator('[data-po-feedback-cancel]').click();await page.locator('[data-po-decision-cancel]').click();await page.setViewportSize({width:1440,height:900});
    await page.locator('[data-process="settings"]').click();await page.locator('#languageSelect').selectOption('en');await page.locator('label[for="darkModeToggle"]').click();await page.locator('#settingsDoneButton').click();await page.locator('[data-process="actions"]').click();await editItem(page,'00010');
    check((await page.locator('.po-feedback-section').innerText()).includes('Superseded by correction'),'EN historical correction remains distinct');
    await captureScreenshot(page,'screenshots/recovery-pilot-01/en-dark.png',{fullPage:true});
    await page.reload();await samples(page);await imported(page,'po-aktualisierung.tsv');await page.locator('[data-process="actions"]').click();
    const [otherChooser]=await Promise.all([page.waitForEvent('filechooser'),page.locator('[data-po-restore]').click()]);await otherChooser.setFiles(backup.path);await page.locator('#purchaseOrderRestoreDialog').waitFor({state:'visible'});await apply(page);
    check((await item(page)).source_status==='stale','restore on reordered equivalent TSV remains stale, not silently rebound');
    check(JSON.stringify(JSON.parse(await download(page)).entries)===JSON.stringify(original.entries),'different physical source preserves accepted historical proof and reports');
    check(!errors.length&&!consoleErrors.length&&!requests.length,'no page/console/external errors');
    const result={suite:'RECOVERY-PILOT-01',passed:checks.length,checks,browser:browser.version(),errors,consoleErrors,requests,alerts,formats:evidence,walkthrough:'PASS'};
    await fs.writeFile(path.join(output,'RESULT.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
