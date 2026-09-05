// Synthetic UI inputs only; real file:// forms, CSV/JSON downloads and reload/restore.
const crypto=require("node:crypto");
const {chromium,productUrl,captureScreenshot}=require("./smoke-runtime.cjs");
const {check,checks,reviews,state,business,field,save,samples,po,download,preview,apply,editItem}=require("./recovery-loop-01c-product-smoke.cjs");
const hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const input=(page,key)=>page.locator('[data-po-feedback-field="'+key+'"]');
const submit=page=>page.locator('#purchaseOrderFeedbackDialog button[type="submit"]').click();
const reports=async page=>(await reviews(page)).flatMap(r=>r.positions).find(p=>p.purchase_order_item==="00010").feedback||[];
const add=async(page,version)=>{await page.locator('[data-po-feedback-add="'+version+'"]').click();await page.locator("#purchaseOrderFeedbackDialog").waitFor({state:"visible"});};
const done=page=>page.locator("[data-po-decision-cancel]").click();
const description='=SYNTHETIC "3 gemeldet"\n<img src=x onerror="window.__reportXss=true">';
(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[],consoleErrors=[],requests=[];
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"});
    page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});page.on("request",r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    await page.addInitScript(()=>{window.__OBSOLIQ_TEST_MODE__=true;});await page.goto(productUrl);await samples(page);await po(page);
    await page.locator("#purchaseOrdersPage [data-po-case]").first().click();await page.locator('[data-excess-detail-target="actions"]:visible').click();
    for(const box of await page.locator("[data-po-select]:visible").all())await box.check();await page.locator("[data-po-handoff]:visible").click();
    await editItem(page,"00010");await field(page,"direction").selectOption("request_reduction");await field(page,"work_state").selectOption("documented");
    await field(page,"reason").fill("Synthetische Reduzierungsanfrage");await field(page,"owner").fill("Synthetischer Einkauf");await field(page,"reduction_quantity").fill("8");await save(page);
    const before=hash(await business(page));await editItem(page,"00010");await add(page,1);await submit(page);
    check((await page.locator("#purchaseOrderFeedbackDialog .po-decision-errors").innerText()).includes("Meldedatum fehlt"),"DE required field messages");
    check((await reports(page)).length===0,"invalid form stores nothing");
    await input(page,"kind").selectOption("partial_reported");await input(page,"description").fill(description);await input(page,"reporter").fill("+Synthetischer Einkauf");await input(page,"reported_on").fill("2026-09-05");await submit(page);
    check((await page.locator("#purchaseOrderFeedbackDialog .po-decision-errors").innerText()).includes("noch offenen Anteil"),"partial report needs remaining part");
    await input(page,"remaining").fill("5 noch offen gemeldet");await submit(page);
    await page.locator("#purchaseOrderFeedbackDialog").waitFor({state:"hidden"});
    check((await reports(page)).length===1,"report recorded through UI");
    check((await page.locator(".po-feedback-report").innerText()).includes("Teilweise umgesetzt gemeldet"),"explicit human reported wording");
    check((await page.locator(".po-feedback-report").innerText()).includes("Keine Referenz erfasst"),"missing reference visible");
    check(await page.locator(".po-feedback-report img").count()===0 && !await page.evaluate(()=>window.__reportXss),"feedback free text escaped");
    const first=(await reports(page))[0];
    await page.locator('[data-po-feedback-correct="'+first.id+'"]').click();await input(page,"description").fill("Synthetische Korrektur: 2 gemeldet");await input(page,"remaining").fill("6 offen");await submit(page);
    check((await page.locator("#purchaseOrderFeedbackDialog .po-decision-errors").innerText()).includes("Korrekturgrund"),"correction reason enforced in UI");
    await input(page,"correction_reason").fill("Synthetische Verwechslung");await input(page,"reference").fill("SYN-REF-001");await submit(page);
    check((await reports(page)).length===2,"correction is append-only");
    check((await page.locator('[data-po-report="'+first.id+'"]').innerText()).includes("Durch Korrektur ersetzt"),"original visibly superseded");
    check(hash(await business(page))===before,"feedback and correction preserve all business/runtime state");
    await done(page);
    const csvPending=page.waitForEvent("download");await page.locator("[data-po-feedback-export]").click();const csv=await csvPending,parts=[];for await(const chunk of await csv.createReadStream())parts.push(chunk);
    const csvText=Buffer.concat(parts).toString("utf8");
    check(csv.suggestedFilename()==="obsoliq_po_implementation_reports.csv","readable report CSV filename");
    const table=await page.evaluate(csv=>window.ObsoliQ.data.ingestion.parseDelimited(csv),csvText);
    check(table.rows.length===2,"CSV one row per report");
    check(csvText.includes("'=SYNTHETIC")&&csvText.includes("'+Synthetischer Einkauf")&&csvText.includes('""3 gemeldet""'),"formula guards, quotes, multiline text preserved");
    check(!table.headers.includes("open_value")&&!table.headers.includes("recovery_potential"),"no multiplied financial values");
    await po(page,true);await page.locator('[data-process="actions"]').click();
    check((await reports(page)).length===2,"source 12 to6 generates no report");
    await editItem(page,"00010");await add(page,1);
    const text=await page.locator("#purchaseOrderFeedbackDialog").innerText();
    check(text.includes("Damals dokumentierte Entscheidung")&&text.includes("Aktuell beobachtete PO-Daten")&&text.includes("8")&&text.includes("6")&&text.includes("Veraltet"),"historical request and current observation distinct");
    await input(page,"kind").selectOption("full_reported");await input(page,"description").fill("Vollständig umgesetzt gemeldet, synthetische Aussage ohne Prüfung");await input(page,"reporter").fill("Synthetische Funktion");await input(page,"reported_on").fill("2026-09-05");await submit(page);
    check((await reports(page)).length===3,"stale historical v1 can receive report");
    await page.locator("[data-po-decision-recheck]").first().click();await field(page,"reduction_quantity").fill("4");await page.locator("[data-po-recheck-confirm]").check();await save(page);
    await editItem(page,"00010");
    check(await page.locator('.po-feedback-version[data-po-feedback-version="2"] .po-feedback-report').count()===0,"new v2 has no inherited reports");
    check(await page.locator('.po-feedback-version[data-po-feedback-version="1"] .po-feedback-report').count()===3,"v1 reports retained under v1");
    await add(page,1);await input(page,"kind").selectOption("not_implemented_reported");await input(page,"description").fill("Historische synthetische Aussage");await input(page,"reporter").fill("SYN");await input(page,"reported_on").fill("2026-09-05");
    check((await page.locator("#purchaseOrderFeedbackDialog").innerText()).includes("Quellenstatus dieser Entscheidungsversion: Veraltet"),"historical v1 is not shown current after documenting v2");
    await captureScreenshot(page,"screenshots/recovery-loop-01d/de-history-1440.png",{fullPage:true});
    for(const width of [1440,1024,390]) {
      await page.setViewportSize({width,height:900});
      check(await page.locator("#purchaseOrderFeedbackDialog").evaluate(d=>d.scrollWidth<=d.clientWidth+1),"DE form contained "+width);
      await captureScreenshot(page,"screenshots/recovery-loop-01d/de-"+width+".png",{fullPage:true});
    }
    await submit(page);await done(page);await page.setViewportSize({width:1440,height:900});
    const bytes=await download(page),doc=JSON.parse(bytes);check(doc.format==="obsoliq-po-review-backup-v2","real v2 backup");
    const reportCount=(await reports(page)).length;await page.reload();check((await reviews(page)).length===0,"reload clears session reports");
    await samples(page);await po(page,true);await page.locator('[data-process="actions"]').click();const restoreBefore=hash(await business(page));await preview(page,bytes);await apply(page);
    check((await reports(page)).length===reportCount,"reports and corrections restored through actual file chooser");
    const restored=JSON.parse(await download(page));check(JSON.stringify(restored.entries)===JSON.stringify(doc.entries),"real backup lossless history/report roundtrip");
    check(hash(await business(page))===restoreBefore,"restore leaves business state unchanged");
    const stateBefore=hash(await state(page));await preview(page,bytes);await apply(page);check(hash(await state(page))===stateBefore,"repeat v2 restore no duplicate");
    const legacy=structuredClone(doc);legacy.format="obsoliq-po-review-backup-v1";legacy.entries.forEach(e=>delete e.feedback);
    const v1=await page.evaluate(async data=>{const {integrity,...payload}=data;return JSON.stringify({...payload,integrity:{...integrity,digest:await window.ObsoliQ.purchaseOrders.backup.digest(payload)}});},legacy);
    await preview(page,Buffer.from(v1));await apply(page);check(hash(await state(page))===stateBefore,"v1 import does not erase reports");
    await page.locator('[data-process="settings"]').click();await page.locator("#languageSelect").selectOption("en");await page.locator('label[for="darkModeToggle"]').click();await page.locator("#settingsDoneButton").click();await page.locator('[data-process="actions"]').click();await editItem(page,"00010");
    check((await page.locator(".po-feedback-section").innerText()).includes("Superseded by correction"),"EN correction history");await add(page,2);
    check((await page.locator("#purchaseOrderFeedbackDialog").innerText()).includes("Currently observed PO data"),"EN observed source");
    for(const width of [1440,1024,390]) {
      await page.setViewportSize({width,height:900});check(await page.locator("#purchaseOrderFeedbackDialog").evaluate(d=>d.scrollWidth<=d.clientWidth+1),"EN dark form contained "+width);
      await captureScreenshot(page,"screenshots/recovery-loop-01d/en-dark-"+width+".png",{fullPage:true});
    }
    check(errors.length===0,"no page errors");check(consoleErrors.length===0,"no console errors");check(requests.length===0,"no external requests");
    console.log(JSON.stringify({suite:"RECOVERY-LOOP-01D product",passed:checks.length,checks,errors,consoleErrors,requests,businessBeforeAfter:before,restoreBeforeAfter:restoreBefore,browser:browser.version()},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
