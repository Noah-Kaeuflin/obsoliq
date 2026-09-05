// SYNTHETIC ONLY. Normal file input, mapping review, PO linking and Action handoff.
const assert = require("node:assert/strict");
const path = require("node:path");
const crypto = require("node:crypto");
const { chromium, productUrl, repositoryRoot, optionalScreenshotEnabled, captureScreenshot } = require("./smoke-runtime.cjs");
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
let assertions = 0;
const checks = [];
function check(value, label) { assertions++; assert.ok(value, label); checks.push(label); console.log("PASS "+assertions+" "+label); }
async function businessState(page) {
  return page.evaluate(() => {
    const b = window.__obsoliqTestBridge, s = b.snapshotDatasetRuntimeState();
    const keys = ["rawRows","originalHeaders","sourceColumnMetadata","normalizedRows","enrichedRows","currentDatasetMeta","dataQualityIssues","dataCorrections","issueDecisions","remediationActions","remediationHistory","actionStatusSnapshot","historicalMetricsRuntimeState","historicalMetricsRuntimeBuildCount","slowDeadRecoveryCaseRuntime","slowDeadRecoveryCaseBuildCount"];
    return { ...Object.fromEntries(keys.map(k=>[k,s[k]])),
      packages: b.getRegistrySnapshot().packages.filter(p=>p.packageType!=="purchase_orders"),
      excess: b.getExcessRowsForTest().map(row=>({id:row.case_id,net:row.net_addressable_value,score:row.opportunity_score,readiness:row.decision_readiness})) };
  });
}
async function model(page) {
  return page.evaluate(()=>{
    const m=window.__obsoliqTestBridge.getPurchaseOrdersModelForTest();
    return {sourceValid:m.sourceValid,rows:m.rows.map(r=>({order:r.purchase_order,item:r.purchase_order_item,status:r.link_status,quantity:r.open_quantity,cases:r.case_ids,classification:r.source.classification}))};
  });
}
async function confirm(page) {
  await page.locator("[data-po-confirm]").check();
  check(await page.locator("#mappingApplyButton").isEnabled(),"confirmed mapping can apply");
  await page.locator("#mappingApplyButton").click();
  await page.waitForFunction(()=>!document.getElementById("mappingModal").classList.contains("active"));
}
async function upload(page, file) {
  const chosen=page.waitForEvent("filechooser");
  await page.locator("#purchaseOrdersPage [data-po-import]").click();
  await (await chosen).setFiles(file);
  await page.locator("[data-po-confirm]").waitFor();
}
async function reviews(page) { return page.evaluate(()=>window.__obsoliqTestBridge.getPurchaseOrderReviewsForTest().map(r=>({case:r.case_id,positions:r.positions.map(p=>({order:p.purchase_order,item:p.purchase_order_item,state:p.review_state}))}))); }
async function openCase(page) {
  await page.locator('[data-process="purchase-orders"]').click();
  await page.locator("#purchaseOrdersPage [data-po-case]").first().click();
  await page.locator('[data-excess-detail-target="actions"]:visible').click();
  await page.locator("[data-po-select]:visible").first().waitFor();
}
async function readDownload(download) {
  const stream=await download.createReadStream(); const parts=[];
  for await (const part of stream) parts.push(part);
  return Buffer.concat(parts).toString("utf8");
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const errors=[],consoleErrors=[],external=[];
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"});
    page.on("pageerror",e=>errors.push(e.message));
    page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});
    page.on("request",r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
    await page.addInitScript(()=>{window.__OBSOLIQ_TEST_MODE__=true;});
    await page.goto(productUrl);
    await page.locator("#sampleButton").click();
    await page.waitForFunction(()=>window.__obsoliqTestBridge.getRegistrySnapshot().packages.length===3);
    await page.waitForFunction(()=>["available","limited"].includes(window.__obsoliqTestBridge.getSlowDeadRecoveryCaseRuntimeForTest().status));
    check((await page.evaluate(()=>window.__obsoliqTestBridge.getState().rawRows))===102,"original three-package demo");
    const beforeHash=hash(await businessState(page));
    await page.locator('[data-process="purchase-orders"]').click();
    check(await page.locator("#purchaseOrdersPage").isVisible(),"PO page and empty state");
    const templatePromise=page.waitForEvent("download");
    await page.locator("[data-po-template]").click();
    check((await readDownload(await templatePromise)).includes("open_quantity"),"downloadable required-field template");
    await upload(page,path.join(repositoryRoot,"data","demo","purchase-orders.csv"));
    check(await page.locator("#mappingApplyButton").isDisabled(),"unconfirmed open quantity blocks apply");
    check(await page.locator(".po-preview tbody tr").count()===14,"preview all rows including exclusions");
    await confirm(page);
    let m=await model(page);
    check(m.sourceValid&&m.rows.length===14,"productive file upload committed");
    check(m.rows.filter(r=>r.status==="matched").length===4,"exact matches including non-excess entity");
    check(m.rows.filter(r=>r.status==="excluded").length===7,"excluded positions cannot match");
    check(m.rows.filter(r=>r.status==="unit_conflict").length===1,"unit mismatch visible");
    check(m.rows.some(r=>r.quantity===0&&r.status==="excluded"),"real zero retained but not open");
    check(hash(await businessState(page))===beforeHash,"PO import leaves inventory/history/SlowDead/actions/readiness unchanged");
    await page.locator('[data-po-filter="status"]').selectOption("matched");
    check(await page.locator("#purchaseOrdersPage tbody tr").count()===4,"PO status filter");
    await page.locator("[data-po-search]").fill("0004500001");
    check(await page.locator("#purchaseOrdersPage tbody tr").count()===2,"PO search preserves item identities");
    await page.locator("[data-po-search]").fill("");
    await page.locator('[data-po-filter="status"]').selectOption("");
    // The explicit extension marks generated inputs and their downstream exports synthetic.
    await page.locator("[data-po-demo]").click(); await confirm(page);
    check((await model(page)).rows.every(r=>r.classification==="synthetic"),"explicit demo provenance");
    await openCase(page);
    check(await page.locator("[data-po-select]:visible").count()===2,"detail shows only matching case items");
    await page.locator("[data-po-select]:visible").first().check();
    await page.locator("[data-po-handoff]:visible").click();
    check((await reviews(page))[0].positions.length===1,"handoff to existing Actions case");
    await openCase(page);
    for (const box of await page.locator("[data-po-select]:visible").all()) await box.check();
    await page.locator("[data-po-handoff]:visible").click();
    check((await reviews(page)).length===1&&(await reviews(page))[0].positions.length===2,"additional selection retained without duplicate task");
    await openCase(page);
    for (const box of await page.locator("[data-po-select]:visible").all()) await box.check();
    await page.locator("[data-po-handoff]:visible").click();
    check((await reviews(page))[0].positions.length===2,"repeated handoff idempotent");
    const downloadPromise=page.waitForEvent("download");
    await page.locator("[data-po-export]").click();
    const download=await downloadPromise, csv=await readDownload(download);
    check(download.suggestedFilename()==="obsoliq_po_review_list.csv","review CSV download");
    check(csv.includes("0004500001")&&csv.includes("00010")&&csv.includes("00020")&&csv.includes("synthetic")&&csv.includes("source_revision")&&csv.includes("current"),"export preserves IDs, currentness, source revision and synthetic classification");
    check(hash(await businessState(page))===beforeHash,"handoff has no financial or classification effects");
    await page.locator('[data-process="purchase-orders"]').click();
    await page.locator("[data-po-demo-update]").click(); await confirm(page);
    check((await reviews(page))[0].positions.every(p=>p.state==="stale"),"source update retains prior context as stale");
    check((await model(page)).rows[0].quantity===6,"updated open quantity");
    const registryBefore=hash(await page.evaluate(()=>window.__obsoliqTestBridge.getRegistrySnapshot()));
    await upload(page,{name:"synthetic-invalid-po.csv",mimeType:"text/csv",buffer:Buffer.from("purchase_order,purchase_order_item,material_id,plant,open_quantity,base_unit\n001,001,MAT-1090,PLANT-03,12abc,EA")});
    await page.locator("[data-po-confirm]").check();
    check(await page.locator("#mappingApplyButton").isDisabled(),"all-invalid import blocked");
    page.once("dialog",dialog=>dialog.accept());
    await page.locator("#mappingCancelButton").click();
    await page.waitForFunction(()=>!document.getElementById("mappingModal").classList.contains("active"));
    check(hash(await page.evaluate(()=>window.__obsoliqTestBridge.getRegistrySnapshot()))===registryBefore,"aborted invalid import retains registry and ID sequence");
    check(hash(await businessState(page))===beforeHash,"update and abort preserve other packages and runtimes");
    for(const language of ["de","en"]) {
      await page.setViewportSize({width:1440,height:900});
      await page.locator('[data-process="settings"]').waitFor({state:"visible"});
      await page.locator('[data-process="settings"]').click();
      await page.locator("#languageSelect").selectOption(language);
      if(await page.locator("#darkModeToggle").isChecked()!==(language==="en")) await page.locator('label[for="darkModeToggle"]').click();
      check(await page.locator("#darkModeToggle").isChecked()===(language==="en"),"theme control "+language);
      await page.locator("#settingsDoneButton").click();
      await page.locator('[data-process="purchase-orders"]').click();
      check((await page.locator("#purchaseOrdersPage h2").innerText())===(language==="de"?"Bestellungen":"Purchase Orders"),"localized PO page "+language);
      for(const width of [1440,1024,390]) {
        await page.setViewportSize({width,height:900});
        check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"no page overflow "+language+" "+width);
        if(optionalScreenshotEnabled()) await captureScreenshot(page,"screenshots/recovery-loop-01a/"+language+"-"+width+".png",{fullPage:true});
      }
    }
    check(errors.length===0,"no page errors");check(consoleErrors.length===0,"no console errors");check(external.length===0,"file-only offline execution");
    console.log(JSON.stringify({status:"PASS",assertions,checks,beforeHash,afterHash:hash(await businessState(page)),pageErrors:errors,consoleErrors,externalRequests:external},null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
