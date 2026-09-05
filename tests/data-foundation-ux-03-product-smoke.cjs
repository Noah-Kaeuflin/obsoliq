// Presentation checks use the existing synthetic demo and synthetic diagnostic variants only.
const assert = require("node:assert/strict"), crypto = require("node:crypto"), path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium, productUrl, captureScreenshot, optionalScreenshotEnabled } = require("./smoke-runtime.cjs");
const { samples, po, business, state, editItem, field, save, reviews } = require("./recovery-loop-01c-product-smoke.cjs");
const checks = [], images = [];
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const check = (value, label) => { assert.ok(value, label); checks.push(label); console.log("PASS " + checks.length + " " + label); };
const foundation = page => page.evaluate(() => window.__obsoliqTestBridge.buildDataFoundationPresentationModelForTest());
const open = async page => {
  if (!await page.locator('.data-foundation-summary').isVisible()) {
    if (!await page.locator('[data-process="overview"]').isVisible()) await page.locator('#navToggleButton').click();
    await page.locator('[data-process="overview"]').click();
  }
  await page.locator(".data-foundation-summary").click();
  await page.waitForFunction(() => document.querySelector('.data-foundation-summary').getAttribute('aria-expanded') === 'true');
};
const photograph = async (page, name) => {
  if (optionalScreenshotEnabled()) images.push(await captureScreenshot(page, "screenshots/data-foundation-ux-03/" + name + ".png"));
};
(async () => {
  const browser = await chromium.launch({ headless: true });
  const pageErrors = [], consoleErrors = [], external = [], snapshots = [];
  try {
    const page = await browser.newPage({ viewport: { width:1440, height:900 }, reducedMotion:"reduce" });
    page.on("pageerror", e=>pageErrors.push(e.message));
    page.on("console", m=>{if(m.type()==="error")consoleErrors.push(m.text());});
    page.on("request", r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
    await page.addInitScript(()=>{window.__OBSOLIQ_TEST_MODE__=true;});
    await page.goto(productUrl); await samples(page);
    const diagnostics = await page.evaluate(()=>{const b=window.__obsoliqTestBridge;return {
      relationship:b.getInventoryMaterialMasterRelationshipForTest(), enrichment:b.getInventoryEnrichmentDiagnosticsForTest(), model:b.buildDataFoundationPresentationModelForTest()};});
    const r = diagnostics.relationship, e = diagnostics.enrichment;
    check(r.inventoryRowCount===102 && r.eligibleInventoryRowCount===101 && r.matchedInventoryRowCount===100, "demo denominator 102 / 101 / 100 reproduced");
    check(r.exactMatchCount===100 && r.fallbackMatchCount===0 && r.matchRate===100/101, "match formula unchanged");
    check(r.invalidKeys.length===1 && r.invalidKeys[0].inventorySourceRowIndex===8 && r.invalidKeys[0].reason==='missing_material_id', "excluded row diagnosed explicitly, not inferred from count difference");
    check(r.unmatched[0].inventorySourceRowIndex===76 && r.ambiguousCount===0 && r.conflictCount===0, "unmatched versus ambiguous and duplicate keys separated");
    check(e.conflicts.length===1 && e.conflicts[0].inventorySourceRowIndex===102 && e.conflicts[0].fieldKey==='material_description', "exact field conflict at physical duplicate row 102");
    check(diagnostics.model.materialReviews.map(g=>g.key).join(',')==='invalid,fields,unmatched', "separate invalid-key, field-conflict and unmatched review groups");
    check(diagnostics.model.sources.purchaseOrders.presence==='not_imported' && diagnostics.model.summary.primaryText==='Bestandsanalyse aktiv', "optional missing PO does not block or auto-load");
    const variants = await page.evaluate(()=>{
      const b=window.__obsoliqTestBridge, initial=b.buildDataFoundationPresentationModelForTest();
      const relationship=b.getInventoryMaterialMasterRelationshipForTest(), enrichment=b.getInventoryEnrichmentDiagnosticsForTest();
      const quality=window.ObsoliQ.data.packageRelationshipQualityEngine.relationshipQuality;
      const master={status:'ready',packageType:'material_master',packageValidation:{statusKey:'ready'}};
      const complete={status:'executed',inventoryRowCount:1,eligibleInventoryRowCount:1,matchedInventoryRowCount:1,matchRate:1,
        unmatchedCount:0,ambiguousCount:0,invalidKeyCount:0,conflictCount:0,unmatched:[],ambiguous:[],invalidKeys:[],conflicts:[]};
      const build=input=>b.buildDataFoundationPresentationModelForTest({materialMasterPackage:master,materialRelationship:complete,materialEnrichment:{conflictCount:0,conflicts:[]},...input});
      const field={inventoryRowKey:'synthetic-row',inventorySourceRowIndex:1,fieldKey:'material_description',inventoryValue:'A',materialMasterValue:'B'};
      return {
        complete:build({}), missing:build({materialMasterPackage:null}), pending:build({materialRelationship:null}),
        differentScope:build({inventoryPackage:{sourceDescriptor:{rows:5}}}),
        quality:quality({relationshipResult:relationship,enrichmentDiagnostics:enrichment}),
        qualityWithoutInvalid:quality({relationshipResult:{...relationship,invalidKeyCount:0},enrichmentDiagnostics:enrichment}),
        zero:build({materialRelationship:{...complete,matchedInventoryRowCount:0,matchRate:0}}),
        noDenominator:build({materialRelationship:{...complete,eligibleInventoryRowCount:0,matchedInventoryRowCount:0,matchRate:0}}),
        poZero:build({purchaseOrdersPackage:{packageType:'purchase_orders'},purchaseOrdersModel:{sourceValid:true,inventoryValid:true,rows:[]}}),
        field:build({materialEnrichment:{conflictCount:1,conflicts:[field]}}),
        ambiguous:build({materialRelationship:{...complete,matchedInventoryRowCount:0,matchRate:0,ambiguousCount:1,ambiguous:[{inventoryRowKey:'synthetic-row',reason:'multiple_material_candidates'}]}}),
        invalid:build({materialMasterPackage:{...master,status:'invalid',packageValidation:{statusKey:'invalid',blockingErrors:[{key:'packageInvalid'}]}}}),
        gap:build({materialRelationship:{...complete,matchRate:0.5}}),
        poReady:build({purchaseOrdersPackage:{packageType:'purchase_orders'},purchaseOrdersModel:{sourceValid:true,inventoryValid:true,rows:[{usable:true,link_status:'matched'}]}}),
        poInvalid:build({purchaseOrdersPackage:{packageType:'purchase_orders'},purchaseOrdersModel:{sourceValid:false,inventoryValid:true,rows:[]}}),
        poInventoryInvalid:build({purchaseOrdersPackage:{packageType:'purchase_orders'},purchaseOrdersModel:{sourceValid:true,inventoryValid:false,rows:[]}}),
        // Removing only the invalid key shows why 99% and one conflict did not cause the former warning.
        cause:b.buildDataFoundationPresentationModelForTest({materialRelationship:{...b.getInventoryMaterialMasterRelationshipForTest(),invalidKeyCount:0,invalidKeys:[]}}), initial
      };
    });
    check(!variants.complete.sourceStates.materialMaster.review && variants.complete.materialReviews.length===0, "complete source has no invented review");
    check(variants.field.sourceStates.materialMaster.review && variants.field.materialReviews[0].key==='fields', "100% match with field conflict remains reviewable");
    check(variants.missing.sourceStates.materialMaster.missing && !variants.pending.sourceStates.materialMaster.missing && variants.pending.materialReviews[0].text.includes('nicht berechnet'), "missing versus loaded but not calculated");
    check(variants.ambiguous.materialReviews[0].key==='ambiguous', "ambiguous relationship is not mislabeled unmatched");
    check(variants.invalid.materialReviews[0].key==='source' && variants.invalid.sources.materialMaster.validity.key==='invalid', "package validation has independent source review");
    check(variants.gap.materialReviews[0].text.includes('nicht vollständig'), "unknown limitation states diagnostic gap, not invented material error");
    check(variants.poReady.sourceStates.purchaseOrders.active && !variants.poReady.sourceStates.purchaseOrders.review, "fully usable PO source state");
    check(variants.poInvalid.sourceStates.purchaseOrders.className==='invalid' && variants.poInventoryInvalid.sources.purchaseOrders.sourceValid, "invalid PO source distinct from invalid inventory context");
    check(variants.zero.relationships.materialMaster.matchRateText==='0 %' && variants.noDenominator.relationships.materialMaster.matchRateText==='n. v.', 'zero match rate versus unavailable denominator');
    check(variants.poZero.purchaseOrdersCountsText.includes('0 verwendbare Positionen') && variants.poInvalid.purchaseOrdersCountsText.includes('n. v. verwendbare Positionen'), 'true PO zero versus invalid-source unavailable count');
    check(variants.differentScope.relationships.materialMaster.countsText.startsWith('5 eingelesene Bestandszeilen · 1 im Verknüpfungslauf'), 'ingested rows are not inferred from analytical relationship scope');
    check(variants.quality.status==='limited' && variants.qualityWithoutInvalid.status==='complete', 'former quality warning specifically depends on diagnosed invalid key, not 99% alone');
    const before=hash(await business(page)), workflow=hash(await state(page));
    const builds=await page.evaluate(()=>window.__obsoliqTestBridge.getExcessPageModelBuildCountForTest());
    await open(page);
    check((await page.locator('#dataFoundationDetail').innerText()).includes('100 von 101 berücksichtigten Bestandszeilen zugeordnet'), "denominator explicitly labeled");
    check(await page.locator('[data-data-foundation-import-material-master]').count()===0, "loaded master not given generic upload fix");
    await page.locator('[data-df-review="invalid"]').click();
    check(await page.locator('#df-review-invalid[open] [data-source-row-index="8"]').count()===1, "primary action opens the exact invalid source row");
    check((await page.locator('#df-review-invalid').innerText()).includes('Materialnummer fehlt'), "actual missing key localized");
    await page.locator('#df-review-fields > summary').click();
    check(await page.locator('#df-review-fields [data-source-row-index="102"]').count()===1 && await page.locator('#df-review-fields [data-source-row-index="86"]').count()===0, "conflict review never selects the other physical duplicate");
    check((await page.locator('#df-review-fields').innerText()).includes('Actuator arm rev. B'), "both source values exposed for review");
    await page.locator('#df-review-unmatched > summary').click();
    check(await page.locator('#df-review-unmatched [data-source-row-index="76"]').count()===1, "unmatched review exact row");
    check(await page.evaluate(()=>window.__obsoliqTestBridge.getExcessPageModelBuildCountForTest())===builds, 'disclosures do not build Excess analytics');
    check(hash(await business(page))===before && hash(await state(page))===workflow, "review actions do not mutate analytical state, packages, decisions or build counts");
    snapshots.push({stage:'demo reviews',before,after:hash(await business(page))});
    await page.keyboard.press('Escape');
    check(await page.locator('.data-foundation-summary').evaluate(el=>el===document.activeElement), "Escape closes and returns focus");
    for(const language of ['de','en'])for(const dark of [false,true]) {
      await page.setViewportSize({width:1440,height:900}); await page.locator('[data-process="settings"]').click();
      await page.locator('#languageSelect').selectOption(language);
      if(await page.locator('#darkModeToggle').isChecked()!==dark)await page.locator('label[for="darkModeToggle"]').click();
      await page.locator('#settingsCloseButton').click();
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:width===390?844:900}); await open(page);
        const summaryText=await page.locator('#dataFoundationDetail').innerText();
        check(summaryText.includes(language==='de'?'Kontextanreicherung eingeschränkt':'Context enrichment limited'), `${language} ${dark?'dark':'light'} ${width} status localized`);
        await page.locator('[data-df-review="invalid"]').focus(); await page.keyboard.press('Enter');
        check(await page.locator('#df-review-invalid').getAttribute('open')!==null, `${language} ${dark} ${width} keyboard action`);
        const box=await page.locator('#df-review-invalid > summary').boundingBox();
        check(box && box.x>=0 && box.x+box.width<=width, `${language} ${dark} ${width} review fits viewport`);
        check(await page.locator('[data-df-review="invalid"]').evaluate(el=>getComputedStyle(el.parentElement).gridTemplateColumns.trim().split(/\s+/).length===1), `${language} ${dark} ${width} source explanation stays in one column`);
        await photograph(page,`${language}-${dark?'dark':'light'}-${width}`);
        await page.keyboard.press('Escape');
        check(await page.locator('.data-foundation-summary').evaluate(el=>el===document.activeElement), `${language} ${dark} ${width} focus return`);
      }
    }
    check(hash(await business(page))===before && hash(await state(page))===workflow, "language/theme/responsive presentation leaves business and runtime unchanged");
    await open(page);
    const chooser=page.waitForEvent('filechooser'); await page.locator('#dataFoundationDetail [data-po-import]').click();
    await (await chooser).setFiles([]);
    check(await page.evaluate(()=>window.__obsoliqTestBridge.getState().pendingUploadPackageType)==='purchase_orders', 'optional PO action opens existing correctly typed file chooser');
    check(!await page.locator('[data-data-foundation]').evaluate(el=>el.open) && hash(await business(page))===before, 'PO file chooser closes narrow drawer without importing anything');
    await page.setViewportSize({width:1440,height:900}); await po(page);
    const poModel=await page.evaluate(()=>window.__obsoliqTestBridge.getPurchaseOrdersModelForTest());
    check(poModel.rows.length===14 && poModel.rows.filter(r=>r.usable).length===7 && poModel.rows.filter(r=>r.link_status==='matched').length===4, "actual PO demo 14 source / 7 usable / 4 matched / 7 excluded");
    await open(page); check((await foundation(page)).sourceStates.purchaseOrders.review, "PO exclusions and link problems are visible limitations");
    const poBefore=hash(await business(page)); await page.locator('[data-df-po-open]').click();
    check(await page.locator('#purchaseOrdersPage').isVisible(), "review action opens existing purchase order workspace");
    check(hash(await business(page))===poBefore, "PO navigation does not mutate business");
    await open(page); await page.setViewportSize({width:390,height:844}); await page.locator('[data-df-po-open]').click();
    check(await page.locator('#purchaseOrdersPage h2').evaluate(el=>el===document.activeElement), 'narrow PO review navigation focuses destination heading');
    await page.setViewportSize({width:1440,height:900});
    await page.locator('#purchaseOrdersPage [data-po-case]').first().click();
    await page.locator('[data-excess-detail-target="actions"]:visible').click();
    for(const box of await page.locator('[data-po-select]:visible').all())await box.check();
    await page.locator('[data-po-handoff]:visible').click();
    await editItem(page,'00010'); await field(page,'direction').selectOption('request_reduction'); await field(page,'work_state').selectOption('documented');
    await field(page,'reason').fill('Synthetic DF-UX regression'); await field(page,'owner').fill('Synthetic procurement'); await field(page,'reduction_quantity').fill('8'); await save(page);
    await po(page,true); check((await reviews(page)).some(r=>r.positions.some(p=>p.source_status==='stale')), "updated PO leaves prior documented decision stale");
    const current=await foundation(page);
    check(current.sources.purchaseOrders.sourceValid && current.sourceStates.purchaseOrders.className!=='invalid', "stale decision does not invalidate current PO source");
    const afterPO=hash(await business(page)), afterReviews=hash(await state(page)); await open(page);
    await page.locator('[data-df-review="invalid"]').click(); await page.keyboard.press('Escape');
    check(hash(await business(page))===afterPO && hash(await state(page))===afterReviews, "source review preserves existing PO decisions and backups");
    snapshots.push({stage:'with PO decision',before:afterPO,after:hash(await business(page))});
    // Existing presentation regressions are run against current app.js, not copied historical output.
    // A new context keeps DE-default legacy assertions independent of the EN/dark UI matrix.
    const legacyPage = await browser.newPage({viewport:{width:1440,height:900}});
    legacyPage.on('pageerror',e=>pageErrors.push(e.message));
    legacyPage.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    legacyPage.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
    await legacyPage.goto(pathToFileURL(path.join(__dirname,'data-foundation-ux-03.html')).href);
    await legacyPage.waitForFunction(()=>Boolean(window.__OBSOLIQ_TEST_RESULTS__),null,{timeout:120000});
    const legacy=await legacyPage.evaluate(()=>window.__OBSOLIQ_TEST_RESULTS__);
    console.log(JSON.stringify({legacy}));
    check(legacy.status==='PASS', 'existing Data Foundation regression contracts');
    check(pageErrors.length===0 && consoleErrors.length===0 && external.length===0,'no page/console/external errors');
    console.log(JSON.stringify({status:'PASS',checks:checks.length,legacy,diagnostics:{relationship:r,enrichment:e},snapshots,images,browser:browser.version(),pageErrors,consoleErrors,external},null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
