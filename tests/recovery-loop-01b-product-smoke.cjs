// SYNTHETIC ONLY. Full decision UI flow through existing file:// demo/import/actions.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const {chromium,productUrl,captureScreenshot}=require(path.join(root,"tests/smoke-runtime.cjs"));
const hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const checks=[];function check(value,label){assert.ok(value,label);checks.push(label);console.log("PASS "+checks.length+" "+label);}
async function business(page){return page.evaluate(()=>{const b=window.__obsoliqTestBridge,s=b.snapshotDatasetRuntimeState();return {...Object.fromEntries(["rawRows","originalHeaders","sourceColumnMetadata","normalizedRows","enrichedRows","currentDatasetMeta","dataQualityIssues","dataCorrections","issueDecisions","remediationActions","remediationHistory","actionStatusSnapshot","historicalMetricsRuntimeState","historicalMetricsRuntimeBuildCount","slowDeadRecoveryCaseRuntime","slowDeadRecoveryCaseBuildCount"].map(k=>[k,s[k]])),packages:b.getRegistrySnapshot().packages.filter(p=>p.packageType!=="purchase_orders"),excess:b.getExcessRowsForTest().map(r=>({id:r.case_id,net:r.net_addressable_value,score:r.opportunity_score,readiness:r.decision_readiness}))};});}
async function reviews(page){return page.evaluate(()=>window.__obsoliqTestBridge.getPurchaseOrderReviewsForTest());}
async function confirm(page){await page.locator("[data-po-confirm]").check();await page.locator("#mappingApplyButton").click();await page.waitForFunction(()=>!document.getElementById("mappingModal").classList.contains("active"));}
async function openCase(page){await page.locator('[data-process="purchase-orders"]').click();await page.locator("#purchaseOrdersPage [data-po-case]").first().click();await page.locator('[data-excess-detail-target="actions"]:visible').click();}
async function edit(page,index=0){await page.locator("[data-po-decision]").nth(index).click();await page.locator("#purchaseOrderDecisionDialog").waitFor({state:"visible"});}
const field=(page,key)=>page.locator('[data-po-decision-field="'+key+'"]');
const save=page=>page.locator('#purchaseOrderDecisionDialog button[type="submit"]').click();
const cancel=page=>page.locator("[data-po-decision-cancel]").click();
async function download(page){const promise=page.waitForEvent("download");await page.locator("[data-po-export]").click();const d=await promise,stream=await d.createReadStream(),parts=[];for await(const chunk of stream)parts.push(chunk);return {name:d.suggestedFilename(),csv:Buffer.concat(parts).toString("utf8")};}
(async()=>{
const browser=await chromium.launch({headless:true}),errors=[],consoleErrors=[],requests=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"});page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});page.on("request",r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.addInitScript(()=>{window.__OBSOLIQ_TEST_MODE__=true;});await page.goto(productUrl);await page.locator("#sampleButton").click();
 await page.waitForFunction(()=>window.__obsoliqTestBridge.getRegistrySnapshot().packages.length===3&&["available","limited"].includes(window.__obsoliqTestBridge.getSlowDeadRecoveryCaseRuntimeForTest().status));
 const beforeHash=hash(await business(page));
 await page.locator('[data-process="purchase-orders"]').click();await page.locator("[data-po-demo]").click();await confirm(page);await openCase(page);
 for(const box of await page.locator("[data-po-select]:visible").all())await box.check();await page.locator("[data-po-handoff]:visible").click();
 check((await reviews(page))[0].positions.length===2,"two positions in existing review");
 await edit(page);await field(page,"reason").fill("Synthetic draft");await save(page);
 check((await reviews(page))[0].positions[0].decision.work_state==="open","incomplete draft saved");
 await edit(page);await field(page,"direction").selectOption("request_reduction");await field(page,"work_state").selectOption("documented");await field(page,"reason").fill("");await field(page,"reduction_quantity").fill("8");await save(page);
 check((await page.locator(".po-decision-errors").innerText()).includes("Begründung")&&(await page.locator(".po-decision-errors").innerText()).includes("Verantwortlichkeit"),"required fields prevent documentation");
 const reason='=Synthetic "Prüfung"\n<img src=x onerror=alert(1)>',owner="+Synthetic Einkauf";
 await field(page,"reason").fill(reason);await field(page,"owner").fill(owner);await field(page,"review_date").fill("2026-10-01");await field(page,"evidence_reference").fill('=HYPERLINK("synthetic")');await field(page,"evidence_type").fill("Synthetische Notiz, kein Lieferantenbeleg");
 await save(page);
 let r=(await reviews(page))[0].positions[0];check(r.currently_documented&&r.decision.reduction_quantity===8&&r.source_status==="current","documented current decision without self-invalidation");
 check(hash(await business(page))===beforeHash,"decision does not change Inventory/History/SlowDead/Action/readiness");
 await edit(page);check(await field(page,"reason").inputValue()===reason,"reopen preserves multiline Unicode");check(await page.locator("#purchaseOrderDecisionDialog img").count()===0,"imported/free text escaped");await save(page);
 check((await reviews(page))[0].positions[0].decision_version===r.decision_version,"repeat save no version or duplicate");
 await openCase(page);for(const box of await page.locator("[data-po-select]:visible").all())await box.check();await page.locator("[data-po-handoff]:visible").click();
 check((await reviews(page))[0].positions.length===2&&(await reviews(page))[0].positions[0].decision.reason===reason,"repeat handoff retains decisions");
 const exported=await download(page);const parsed=await page.evaluate(csv=>window.ObsoliQ.data.ingestion.parseDelimited(csv),exported.csv);
 check(exported.name==="obsoliq_po_review_list.csv","existing CSV filename");
 const out=parsed.rows[0];check(out.purchase_order==="0004500001"&&out.purchase_order_item==="00010","CSV preserves leading zeros");
 check(out.decision_reason==="'"+reason&&out.decision_owner==="'"+owner&&out.evidence_reference.startsWith("'="),"CSV formula guards and quoted multiline Unicode");
 check(out.currently_documented==="true"&&out.source_status==="current"&&out.source_revision,"CSV decision and source evidence");
 await edit(page);await field(page,"reason").fill("discard me");page.once("dialog",d=>d.dismiss());await cancel(page);check(await page.locator("#purchaseOrderDecisionDialog").isVisible(),"dirty cancel can stay");
 page.once("dialog",d=>d.accept());await cancel(page);check((await reviews(page))[0].positions[0].decision.reason===reason,"discard does not mutate decision");
 await page.locator('[data-process="purchase-orders"]').click();await page.locator("[data-po-demo-update]").click();await confirm(page);await page.locator('[data-process="actions"]').click();
 r=(await reviews(page))[0].positions[0];check(r.source_status==="stale"&&!r.currently_documented&&r.decision.reduction_quantity===8,"source update preserves old decision as stale");
 await page.locator("[data-po-review-filter]").selectOption("documented");check(await page.locator("[data-po-decision]").count()===0,"stale documented excluded from current documented filter");
 await page.locator("[data-po-review-filter]").selectOption("stale");check(await page.locator("[data-po-decision]").count()===2,"stale filter");
 const staleExport=await download(page);check(staleExport.csv.includes("stale")&&staleExport.csv.includes("documented"),"stale export retains previous documented status");
 await edit(page);check((await page.locator("[data-po-current-quantity]").innerText()).includes("6"),"current quantity visible separately from prior accepted 12");await save(page);check((await page.locator(".po-decision-errors").innerText()).includes("Quelle"),"no stale save shortcut");
 await page.locator("[data-po-decision-recheck]").click();
 check((await page.locator(".po-source-comparison").innerText()).includes("12")&&(await page.locator(".po-source-comparison").innerText()).includes("6"),"explicit old/new quantity comparison");
 await save(page);check((await page.locator(".po-decision-errors").innerText()).includes("bestätigen"),"confirmation required");
 await page.locator("[data-po-recheck-confirm]").check();await save(page);check((await page.locator(".po-decision-errors").innerText()).includes("Reduktionsmenge"),"8 invalid after open quantity falls to 6");
 await field(page,"reduction_quantity").fill("4");await save(page);
 r=(await reviews(page))[0].positions[0];check(r.currently_documented&&r.decision.reduction_quantity===4&&r.decision_history.length===1,"revalidated 4 accepted; earlier 8 retained in history");
 await page.locator("[data-po-review-filter]").selectOption("documented");check(await page.locator("[data-po-decision]").count()===1,"current documented filter");
 // Simulate a source completion while the edit is open via the existing productive import bridge.
 await edit(page);const prior=hash(await reviews(page));
 const race=await page.evaluate(async()=>{const b=window.__obsoliqTestBridge,O=window.ObsoliQ,csv=O.purchaseOrders.demo.initial,parsed=O.data.ingestion.parseDelimited(csv),builder=O.data.purchaseOrdersBuilder;
 const mapping=O.mapping.engine.createAutomaticColumnMapping({headers:parsed.headers,rows:parsed.rows,...builder.mappingOptions(parsed.sourceColumnMetadata)}),p=builder.inspect({headers:parsed.headers,sourceRows:parsed.rows,sourceColumnMetadata:parsed.sourceColumnMetadata,columnMapping:mapping});
 return b.loadTextDataset(csv,"synthetic-race.csv",{packageType:"purchase_orders",allowMappingReview:false,normalizationPolicy:p.effectivePolicy,purchaseOrderReview:{confirmed:true,binding:p.reviewBinding},sourceDescriptor:{classification:"synthetic"}});});
 check(race.status==="loaded","source completion during open editor");await save(page);check((await page.locator(".po-decision-errors").innerText()).includes("Quelle"),"save rejects old edit token after committed source change");
 await cancel(page);await page.locator('[data-process="actions"]').click();await page.locator("[data-po-review-filter]").selectOption("");
 await edit(page);await field(page,"direction").selectOption("request_cancellation");await field(page,"work_state").selectOption("question_required");
 page.once("dialog",d=>d.accept());await cancel(page);check((await reviews(page))[0].positions[0].decision.direction==="request_reduction","cancel across source change cannot alter wrong row");
 // Dedicated core contract tests exercise saving the original editor token after a committed import.
 check(hash(await business(page))===beforeHash,"full decision loop preserves business calculations and status");
 for(const lang of ["de","en"]){
  await page.setViewportSize({width:1440,height:900});await page.locator('[data-process="settings"]').click();await page.locator("#languageSelect").selectOption(lang);
  if(await page.locator("#darkModeToggle").isChecked()!==(lang==="en"))await page.locator('label[for="darkModeToggle"]').click();await page.locator("#settingsDoneButton").click();await page.locator('[data-process="actions"]').click();await edit(page);
  check((await page.locator("#purchaseOrderDecisionDialog").innerText()).includes(lang==="de"?"Bearbeitungsstand":"Work state"),"localized editor "+lang);
  for(const width of [1440,1024,390]){await page.setViewportSize({width,height:900});check(await page.evaluate(()=>{const d=document.getElementById("purchaseOrderDecisionDialog");return document.documentElement.scrollWidth<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1;}),"contained layout "+lang+" "+width);await captureScreenshot(page,"screenshots/recovery-loop-01b/"+lang+"-"+width+".png",{fullPage:true});}
  await cancel(page);
 }
 check(errors.length===0,"no page errors");check(consoleErrors.length===0,"no console errors");check(requests.length===0,"no external requests");
 console.log(JSON.stringify({status:"PASS",assertions:checks.length,checks,beforeHash,afterHash:hash(await business(page)),pageErrors:errors,consoleErrors,externalRequests:requests},null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
