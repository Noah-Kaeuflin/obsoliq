// Synthetic only. The downloaded JSON bytes are reselected through the normal file chooser.
const assert = require("node:assert/strict"), crypto = require("node:crypto");
const { chromium, productUrl, captureScreenshot } = require("./smoke-runtime.cjs");
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const checks = []; function check(value, label) { assert.ok(value, label); checks.push(label); console.log("PASS " + checks.length + " " + label); }
const reviews = page => page.evaluate(() => window.__obsoliqTestBridge.getPurchaseOrderReviewsForTest());
const state = page => page.evaluate(() => window.__obsoliqTestBridge.purchaseOrderReviewsForTest.snapshot());
const business = page => page.evaluate(() => { const b = window.__obsoliqTestBridge, s = b.snapshotDatasetRuntimeState(); return {
  ...Object.fromEntries(["rawRows", "originalHeaders", "sourceColumnMetadata", "normalizedRows", "enrichedRows", "currentDatasetMeta", "dataQualityIssues", "dataCorrections", "issueDecisions", "remediationActions", "remediationHistory", "actionStatusSnapshot", "historicalMetricsRuntimeState", "historicalMetricsRuntimeBuildCount", "slowDeadRecoveryCaseRuntime", "slowDeadRecoveryCaseBuildCount"].map(key => [key, s[key]])),
  packages: b.getRegistrySnapshot(), excess: b.getExcessRowsForTest().map(r => ({ id: r.case_id, net: r.net_addressable_value, score: r.opportunity_score, readiness: r.decision_readiness })) }; });
const field = (page, key) => page.locator('[data-po-decision-field="' + key + '"]');
const save = page => page.locator('#purchaseOrderDecisionDialog button[type="submit"]').click();
async function samples(page) {
  await page.locator("#sampleButton").click();
  await page.waitForFunction(() => ["available", "limited"].includes(window.__obsoliqTestBridge.getSlowDeadRecoveryCaseRuntimeForTest().status));
}
async function po(page, update = false) {
  await page.locator('[data-process="purchase-orders"]').click();
  await page.locator(update ? "[data-po-demo-update]" : "[data-po-demo]").click();
  await page.locator("[data-po-confirm]").check(); await page.locator("#mappingApplyButton").click();
  await page.waitForFunction(() => !document.getElementById("mappingModal").classList.contains("active"));
}
async function download(page) {
  const pending = page.waitForEvent("download"); await page.locator("[data-po-backup]").click();
  const d = await pending, chunks = []; for await (const chunk of await d.createReadStream()) chunks.push(chunk);
  check(d.suggestedFilename() === "obsoliq_po_review_backup.json", "JSON filename");
  return Buffer.concat(chunks);
}
async function preview(page, buffer) {
  const pending = page.waitForEvent("filechooser"); await page.locator("[data-po-restore]").click();
  await (await pending).setFiles({ name: "obsoliq_po_review_backup.json", mimeType: "application/json", buffer });
  await page.locator("#purchaseOrderRestoreDialog").waitFor({ state: "visible" });
}
async function apply(page) {
  await page.locator("[data-po-restore-confirm]").check(); await page.locator("[data-po-restore-apply]").click();
  await page.locator("#purchaseOrderRestoreDialog").waitFor({ state: "hidden" });
}
const close = page => page.locator("[data-po-restore-cancel]").click();
async function editItem(page, item) {
  const r = (await reviews(page)).flatMap(record => record.positions.map(row => ({ record, row }))).find(({row}) => row.purchase_order_item === item);
  const buttons = page.locator("[data-po-decision]");
  const index = await buttons.evaluateAll((items, position) => items.findIndex(b => b.dataset.poPosition === position), r.row.position_id);
  await buttons.nth(index).click();
  await page.locator("#purchaseOrderDecisionDialog").waitFor({ state: "visible" });
}
module.exports = { check, checks, reviews, state, business, field, save, samples, po, download, preview, apply, close, editItem };
if (require.main === module) (async () => {
  const browser = await chromium.launch({ headless: true }), errors = [], consoleErrors = [], requests = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); }); page.on("request", r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
    await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; }); await page.goto(productUrl); await samples(page); await po(page);
    const originalPackage = await page.evaluate(() => window.__obsoliqTestBridge.getPurchaseOrdersModelForTest().poIdentity);
    await page.locator("#purchaseOrdersPage [data-po-case]").first().click(); await page.locator('[data-excess-detail-target="actions"]:visible').click();
    for (const box of await page.locator("[data-po-select]:visible").all()) await box.check(); await page.locator("[data-po-handoff]:visible").click();
    await editItem(page, "00010"); await field(page, "direction").selectOption("request_reduction"); await field(page, "work_state").selectOption("documented");
    await field(page, "reason").fill('Synthetisch "Prüfung"\n<img src=x onerror=alert(1)>'); await field(page, "owner").fill("Synthetischer Einkauf"); await field(page, "reduction_quantity").fill("8"); await save(page);
    await editItem(page, "00010"); await field(page, "reason").fill('Synthetisch "Prüfung"\nVersion 2'); await save(page);
    await editItem(page, "00020"); await field(page, "reason").fill("Entwurf ohne Owner\n000"); await save(page);
    const beforeBackup = hash(await business(page)), bytes = await download(page), doc = JSON.parse(bytes.toString("utf8"));
    check(doc.format === "obsoliq-po-review-backup-v2" && doc.entries.length === 2, "versioned downloaded backup");
    check(doc.entries.some(e => e.history.length === 1) && doc.entries.some(e => e.decision.work_state === "open"), "saved draft and documented history included");
    check(hash(await business(page)) === beforeBackup, "backup does not change business state");
    await page.reload(); check((await reviews(page)).length === 0, "reload clears session reviews");
    await samples(page); await samples(page); await po(page); await page.locator('[data-process="actions"]').click();
    const newPackage = await page.evaluate(() => window.__obsoliqTestBridge.getPurchaseOrdersModelForTest().poIdentity);
    check(newPackage.packageId !== originalPackage.packageId || newPackage.datasetId !== originalPackage.datasetId, "different session/package IDs proven");
    const beforeRestore = hash(await business(page)), beforeReviews = hash(await state(page));
    await preview(page, bytes);
    check(await page.locator('[data-po-restore-state="current"]').count() === 2, "fresh accepted identical sources current in preview");
    check((await page.locator("#purchaseOrderRestoreDialog").innerText()).includes("PLANT-03"), "exact plant context visible in preview");
    check(await page.locator("[data-po-restore-apply]").isDisabled() && hash(await state(page)) === beforeReviews, "preview is nonmutating and explicit confirmation required");
    await captureScreenshot(page, "screenshots/recovery-loop-01c/de-restore-1440.png", { fullPage: true });
    await apply(page);
    check((await reviews(page)).flatMap(r => r.positions).filter(r => r.currently_documented).length === 1, "one current documented decision, draft not counted");
    const againBytes = await download(page); check(JSON.stringify(JSON.parse(againBytes).entries) === JSON.stringify(doc.entries), "real UI lossless roundtrip");
    check(hash(await business(page)) === beforeRestore, "restore leaves sources, quantities, recovery, actions and history runtime unchanged");
    const applied = hash(await state(page)); await preview(page, bytes);
    check(await page.locator('[data-po-restore-state="identical"]').count() === 2, "second restore identifies existing records"); await apply(page);
    check(hash(await state(page)) === applied, "second restore exact no-op");
    await editItem(page, "00010"); await field(page, "reason").fill("Different local draft"); await save(page);
    const conflictState = hash(await state(page)); await preview(page, bytes);
    check(await page.locator('[data-po-restore-state="conflict"]').count() === 1 && await page.locator("[data-po-restore-apply]").count() === 0, "conflict blocks entire import"); await close(page);
    check(hash(await state(page)) === conflictState, "existing work protected");
    await preview(page, Buffer.from(bytes.toString().replace("Version 2", "tampered")));
    check((await page.locator("#purchaseOrderRestoreDialog").innerText()).includes("Integritätsprüfung"), "damaged download rejected by UI"); await close(page);
    check(hash(await state(page)) === conflictState, "bad file no state change");
    await page.reload(); await samples(page); await po(page, true); await page.locator('[data-process="actions"]').click();
    await preview(page, bytes); check(await page.locator('[data-po-restore-state="stale"]').count() >= 1, "changed 6-unit source restored as stale"); await apply(page);
    const old = (await reviews(page)).flatMap(r => r.positions).find(r => r.purchase_order_item === "00010");
    check(!old.currently_documented && old.decision.reduction_quantity === 8, "previous request retained without current validity");
    await editItem(page, "00010"); await page.locator("[data-po-decision-recheck]").click(); await page.locator("[data-po-recheck-confirm]").check(); await save(page);
    check((await page.locator("#purchaseOrderDecisionDialog .po-decision-errors").innerText()).includes("Reduktionsmenge"), "existing recheck blocks 8 > 6");
    await field(page, "reduction_quantity").fill("4"); await save(page);
    check((await reviews(page)).flatMap(r => r.positions).find(r => r.purchase_order_item === "00010").decision_history.length === 2, "recheck archives restored previous decision");
    await page.reload(); await samples(page); await page.locator('[data-process="actions"]').click(); await preview(page, bytes);
    check(await page.locator('[data-po-restore-state="unassignable"]').count() === 2, "missing PO sources preview unassignable"); await apply(page);
    check((await reviews(page)).every(r => !r.case_id && !r.inventory_dataset_id), "unassigned documentation has no operational case");
    await po(page); await page.locator('[data-process="actions"]').click();
    check((await reviews(page)).every(r => r.positions.every(p => p.source_status === "unassignable")), "later import does not silently reassign");
    await page.locator("[data-po-reassociate]").click(); await page.locator("[data-po-restore-confirm]").waitFor(); await apply(page);
    check((await reviews(page)).flatMap(r => r.positions).filter(r => r.currently_documented).length === 1, "conscious later reassignment works");
    for (const language of ["de", "en"]) {
      await page.setViewportSize({ width: 1440, height: 900 }); await page.locator('[data-process="settings"]').click(); await page.locator("#languageSelect").selectOption(language);
      if (await page.locator("#darkModeToggle").isChecked() !== (language === "en")) await page.locator('label[for="darkModeToggle"]').click();
      await page.locator("#settingsDoneButton").click(); await page.locator('[data-process="actions"]').click(); await preview(page, bytes);
      check((await page.locator("#purchaseOrderRestoreDialog").innerText()).includes(language === "de" ? "Sicherung prüfen" : "Review backup"), "localized restore " + language);
      for (const width of [1440, 1024, 390]) {
        await page.setViewportSize({ width, height: 900 });
        check(await page.evaluate(() => { const d = document.getElementById("purchaseOrderRestoreDialog"); return d.scrollWidth <= d.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }), "contained restore layout " + language + " " + width);
        if (width === 390) check(await page.locator("#purchaseOrderRestoreDialog .table-wrap").evaluate(el => el.scrollWidth <= el.clientWidth + 1), "mobile source state visible without lateral scroll " + language);
        await captureScreenshot(page, "screenshots/recovery-loop-01c/" + language + "-" + width + ".png", { fullPage: true });
      }
      await close(page);
    }
    check(errors.length === 0, "no page errors"); check(consoleErrors.length === 0, "no console errors"); check(requests.length === 0, "no external requests");
    console.log(JSON.stringify({ status: "PASS", assertions: checks.length, checks, beforeBackup, beforeRestore, pageErrors: errors, consoleErrors, externalRequests: requests }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
