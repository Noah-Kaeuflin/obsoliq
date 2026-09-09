"use strict";

// Synthetic UI integration. Internal hooks are used only for state oracles and controlled failures.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium, productUrl, repositoryRoot, optionalScreenshotEnabled, captureScreenshot, screenshotName } = require("./smoke-runtime.cjs");
const checks = [];
const evidence = {};
const screenshots = [];
const sourcePath = name => path.join(repositoryRoot, "data", "demo", name);
const initialPo = sourcePath("purchase-orders.csv");
const updatedPo = sourcePath("purchase-orders-update.csv");
const targetOrder = "0004500001";
const targetItem = "00010";
const check = (condition, label) => { assert.ok(condition, label); checks.push(label); console.log(`PASS ${checks.length} ${label}`); };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks.push(label); console.log(`PASS ${checks.length} ${label}`); };
const decisionField = (page, name) => page.locator(`[data-po-decision-field="${name}"]`);
const reportField = (page, name) => page.locator(`[data-po-feedback-field="${name}"]`);
const decisionSave = page => page.locator('#purchaseOrderDecisionDialog button[type="submit"]').click();
const reportSave = page => page.locator('#purchaseOrderFeedbackDialog button[type="submit"]').click();

async function capture(page, name) {
  if (optionalScreenshotEnabled()) screenshots.push(await captureScreenshot(page, screenshotName("recovery-operations-integration-01", name), { fullPage: false }));
}

async function navigate(page, process) {
  const tab = page.locator(`.process-tabs [data-process="${process}"]`);
  if (await tab.isVisible()) await tab.click();
  else {
    await page.locator("#navToggleButton").click();
    await page.locator(`[data-nav-section="${process}"]`).click();
  }
  await page.waitForFunction(key => window.__obsoliqTestBridge.getState().activeProcessKey === key, process);
}

async function language(page, code) {
  await page.locator('.process-tabs [data-process="settings"]').click();
  await page.locator("#languageSelect").selectOption(code);
  await page.locator("#settingsDoneButton").click();
}

async function loaded(page) {
  await page.waitForFunction(() => {
    const b = window.__obsoliqTestBridge, w = document.getElementById("overviewWorkspace");
    return b?.getState().rawRows === 102 && !w.dataset.dataOperation && w.getAttribute("aria-busy") === "false"
      && ["available", "limited"].includes(b.getSlowDeadRecoveryCaseRuntimeForTest().status);
  });
}

async function setupDemo(page) {
  await page.goto(productUrl);
  await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge));
  check(await page.locator("#overviewEmptyState [data-empty-load-sample]").isVisible(), "fresh source-free product exposes visible demo action");
  await page.locator("#overviewEmptyState [data-empty-load-sample]").click();
  await loaded(page);
}

async function importPo(page, file, apply = true) {
  await navigate(page, "purchase-orders");
  const chooser = page.waitForEvent("filechooser");
  await page.locator("#purchaseOrdersPage [data-po-import]").click();
  await (await chooser).setFiles(file);
  await page.locator("[data-po-confirm]").waitFor({ state: "visible" });
  if (page.viewportSize().width === 390) {
    check(await page.locator(".mapping-modal").evaluate(el => el.scrollWidth <= el.clientWidth + 1), "390px mapping dialog contains its header and controls");
    const reachable = () => page.locator("[data-po-confirm]").evaluate(el => {
      const rect = el.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === el;
    });
    await page.mouse.move(27, 400);
    for (let step = 0; step < 12 && !(await reachable()); step++) {
      await page.mouse.wheel(0, 300);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    check(await reachable(), "390px mapping confirmation is reachable through real wheel scrolling without forced focus");
    await capture(page, "mapping-mobile.png");
  }
  check(await page.locator("#mappingApplyButton").isDisabled(), "PO source requires explicit interpretation confirmation");
  if (apply) await confirmPo(page);
}

async function confirmPo(page) {
  await page.locator("[data-po-confirm]").check();
  await page.locator("#mappingApplyButton").click();
  await page.waitForFunction(() => !document.getElementById("mappingModal").classList.contains("active"));
  check(await page.evaluate(() => document.activeElement !== document.body && !document.getElementById("mappingModal").contains(document.activeElement)), "mapping apply returns focus to a live product control");
}

async function cancelMapping(page, dirty = false) {
  if (dirty) page.once("dialog", dialog => dialog.accept());
  await page.locator("#mappingCancelButton").click();
  await page.waitForFunction(() => !document.getElementById("mappingModal").classList.contains("active"));
}

async function positions(page) {
  return page.evaluate(() => window.__obsoliqTestBridge.getPurchaseOrderReviewsForTest().flatMap(record => record.positions.map(row => ({ ...row, reviewId: record.review_id }))));
}

async function position(page, item = targetItem) {
  const rows = await positions(page);
  const found = rows.find(row => row.purchase_order === targetOrder && row.purchase_order_item === item);
  assert.ok(found, `synthetic PO ${targetOrder}/${item} exists`);
  return found;
}

async function edit(page, item = targetItem) {
  const row = await position(page, item);
  const buttons = page.locator("[data-po-decision]");
  const index = await buttons.evaluateAll((items, id) => items.findIndex(item => item.dataset.poPosition === id), row.position_id);
  assert.ok(index >= 0, "exact saved position has a visible editor action");
  await buttons.nth(index).click();
  await page.locator("#purchaseOrderDecisionDialog").waitFor({ state: "visible" });
}

async function closeDecision(page, dirty = false) {
  if (dirty) page.once("dialog", dialog => dialog.accept());
  await page.locator("[data-po-decision-cancel]").click();
  await page.locator("#purchaseOrderDecisionDialog").waitFor({ state: "hidden" });
  check(await page.evaluate(() => document.activeElement?.matches("[data-po-decision]")), "closing the editor returns focus to its decision action");
}

async function snapshot(page) {
  return page.evaluate(() => {
    const b = window.__obsoliqTestBridge, s = b.snapshotDatasetRuntimeState(), state = b.getState();
    return {
      registry: b.getRegistrySnapshot(),
      inventory: { rawRows: s.rawRows, metadata: s.currentDatasetMeta, normalizedRows: s.normalizedRows, enrichedRows: s.enrichedRows },
      saved: b.purchaseOrderReviewsForTest.snapshot(),
      projected: b.getPurchaseOrderReviewsForTest(),
      poFilters: s.purchaseOrderFilters,
      filters: s.filterState,
      route: { view: state.currentView, process: state.activeProcessKey,
        workspace: document.getElementById("overviewWorkspace").dataset.view,
        active: [...document.querySelectorAll(".view.active")].map(el => el.id),
        placeholderVisible: Boolean(document.getElementById("placeholderPage").getClientRects().length) },
      language: { html: document.documentElement.lang, selected: document.getElementById("languageSelect").value, current: s.currentLanguage }
    };
  });
}

async function downloadBackup(page) {
  const pending = page.waitForEvent("download");
  await page.locator("[data-po-backup]").click();
  const download = await pending, parts = [];
  for await (const part of await download.createReadStream()) parts.push(part);
  check(download.suggestedFilename() === "obsoliq_po_review_backup.json", "visible backup action downloads JSON");
  return Buffer.concat(parts);
}

async function recoveryUsable(page, label) {
  const status = await page.evaluate(() => ({
    operation: document.getElementById("overviewWorkspace").dataset.dataOperation || "",
    inert: document.getElementById("overviewWorkspace").inert || document.getElementById("placeholderPage").inert,
    disabled: ["uploadButton", "sampleButton", "navToggleButton"].some(id => document.getElementById(id).disabled)
  }));
  same(status, { operation: "", inert: false, disabled: false }, `${label}: operation is fully unlocked`);
  await navigate(page, "overview");
  check(await page.locator(".metrics").isVisible(), `${label}: real navigation reaches Overview`);
  await navigate(page, "actions");
  await edit(page);
  check(await decisionField(page, "reason").isVisible(), `${label}: saved decision reopens`);
  await closeDecision(page);
  await downloadBackup(page);
}

async function restorePreview(page, bytes) {
  const pending = page.waitForEvent("filechooser");
  await page.locator("[data-po-restore]").click();
  await (await pending).setFiles({ name: "obsoliq_po_review_backup.json", mimeType: "application/json", buffer: bytes });
  await page.locator("#purchaseOrderRestoreDialog").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.getElementById("purchaseOrderRestoreDialog").getAttribute("aria-busy") === "false");
}

// One-shot delays wrap the real file/WebCrypto implementation; no product state is seeded.
async function holdAsync(page, kind, key) {
  await page.evaluate(({ kind, key }) => {
    const prototype = kind === "digest" ? Object.getPrototypeOf(crypto.subtle) : Blob.prototype;
    const method = kind === "digest" ? "digest" : "text";
    const descriptor = Object.getOwnPropertyDescriptor(prototype, method), original = prototype[method];
    const state = window[key] = { started: false, completed: false };
    Object.defineProperty(prototype, method, { configurable: true, writable: true, value: async function (...args) {
      Object.defineProperty(prototype, method, descriptor);
      state.started = true;
      try {
        await new Promise((resolve, reject) => { state.release = resolve; state.reject = () => reject(new Error("CONTROLLED_READ_FAILURE")); });
        return await original.apply(this, args);
      } finally { state.completed = true; }
    } });
  }, { kind, key });
}

async function startHeldImport(page, key) {
  await holdAsync(page, "text", key);
  const chooser = page.waitForEvent("filechooser");
  await page.locator("#purchaseOrdersPage [data-po-import]").click();
  await (await chooser).setFiles(updatedPo);
  await page.waitForFunction(key => window[key].started, key);
}

async function rejectHeldImport(page, key) {
  const alert = page.waitForEvent("dialog");
  page.once("dialog", dialog => dialog.accept());
  await page.evaluate(key => window[key].reject(), key);
  const dialog = await alert;
  check(dialog.type() === "alert" && dialog.message().length > 0, "controlled read failure is explained to the user");
  await page.waitForFunction(() => !document.getElementById("overviewWorkspace").dataset.dataOperation);
}

async function restoreApply(page) {
  await page.locator("[data-po-restore-confirm]").check();
  await page.locator("[data-po-restore-apply]").click();
  await page.locator("#purchaseOrderRestoreDialog").waitFor({ state: "hidden" });
  check(await page.evaluate(() => document.activeElement?.matches("[data-po-restore]")), "successful restore returns focus to its live action");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const diagnostics = { pageErrors: [], consoleErrors: [], externalRequests: [] };
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", acceptDownloads: true });
  await context.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
  const page = await context.newPage();
  page.on("pageerror", error => diagnostics.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") diagnostics.consoleErrors.push(message.text()); });
  page.on("request", request => { if (/^https?:/i.test(request.url())) diagnostics.externalRequests.push(request.url()); });
  try {
    await setupDemo(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await importPo(page, initialPo);
    const poModel = await page.evaluate(() => window.__obsoliqTestBridge.getPurchaseOrdersModelForTest());
    const sourceRow = poModel.rows.find(row => row.purchase_order === targetOrder && row.purchase_order_item === targetItem);
    check(sourceRow.open_quantity === 12 && sourceRow.link_status === "matched", "actual fixture supplies a matched 12-unit PO item");
    await page.locator(`#purchaseOrdersPage [data-po-case="${sourceRow.case_ids[0]}"]`).first().click();
    await page.locator('[data-excess-detail-target="actions"]:visible').click();
    for (const box of await page.locator("[data-po-select]:visible").all()) await box.check();
    await page.locator("[data-po-handoff]:visible").click();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "390px visible PO handoff remains contained and its checkboxes are pointer reachable");
    await page.setViewportSize({ width: 1440, height: 1000 });
    check((await positions(page)).length === 2, "visible handoff retains two distinct selected PO positions");
    await edit(page);
    await decisionField(page, "direction").selectOption("request_reduction");
    await decisionField(page, "work_state").selectOption("documented");
    await decisionField(page, "reason").fill("Synthetische Reduktionsanfrage für Integrationsprüfung");
    await decisionField(page, "owner").fill("Synthetischer Einkauf");
    await decisionField(page, "reduction_quantity").fill("8");
    await decisionSave(page);
    check(await page.evaluate(() => document.activeElement?.matches("[data-po-decision]")), "saving a decision focuses its newly rendered action");
    const documented = await position(page);
    const originalVersion = documented.decision_version;
    check(documented.currently_documented && documented.decision.reduction_quantity === 8, "UI documents a valid request for 8 of 12 units");
    await edit(page);
    const savedReason = await decisionField(page, "reason").inputValue();
    await decisionField(page, "reason").fill("Ungespeicherte Eingabe bleibt bei Nein erhalten");
    page.once("dialog", dialog => dialog.dismiss());
    await page.locator(`[data-po-feedback-add="${originalVersion}"]`).click();
    check(await decisionField(page, "reason").inputValue() === "Ungespeicherte Eingabe bleibt bei Nein erhalten", "declining discard preserves unsaved parent input");
    await closeDecision(page, true);
    await edit(page);
    await holdAsync(page, "digest", "heldFeedback");
    await page.locator(`[data-po-feedback-add="${originalVersion}"]`).click();
    await page.waitForFunction(() => window.heldFeedback.started);
    check(await decisionField(page, "reason").isDisabled() && await page.locator('[data-po-operation-status]').isVisible(), "pending feedback preparation visibly protects parent input");
    await page.keyboard.type("must not replace parent");
    check(await decisionField(page, "reason").inputValue() === savedReason, "keyboard input cannot silently change the pending parent");
    await closeDecision(page);
    await navigate(page, "purchase-orders");
    const beforeConcurrent = await snapshot(page);
    await startHeldImport(page, "heldImport");
    check(await page.locator("#sampleButton").isDisabled() && await page.locator("#uploadButton").isDisabled() && await page.locator("#navToggleButton").isDisabled(), "pending file read disables competing demo/import/navigation controls");
    await page.locator("#sampleButton").dispatchEvent("click");
    await page.locator("#purchaseOrdersPage [data-po-import]").dispatchEvent("click");
    await page.evaluate(() => {
      const transfer = new DataTransfer(); transfer.items.add(new File(["bad"], "competing.csv"));
      window.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer }));
      window.heldFeedback.release();
    });
    await page.waitForFunction(() => window.heldFeedback.completed);
    // A task boundary lets the rejected old editor completion/finally finish.
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
    check(await page.locator("#overviewWorkspace").getAttribute("data-data-operation") === "import", "late cancelled feedback cannot release a newer import owner");
    check(await page.locator("#purchaseOrderFeedbackDialog:visible").count() === 0, "late cancelled feedback does not reopen its dialog");
    await rejectHeldImport(page, "heldImport");
    same(await snapshot(page), beforeConcurrent, "concurrent attempts and failed read preserve every saved binding and route");
    await recoveryUsable(page, "cancelled feedback and concurrent file read");
    await edit(page);
    await page.locator(`[data-po-feedback-add="${originalVersion}"]`).click();
    await reportField(page, "kind").selectOption("partial_reported");
    await reportField(page, "description").fill("Synthetische Aussage: drei Einheiten umgesetzt gemeldet");
    await reportField(page, "remaining").fill("Fünf Einheiten noch offen gemeldet");
    await reportField(page, "reporter").fill("Synthetischer Einkauf");
    await reportField(page, "reported_on").fill("2026-09-05");
    await reportSave(page);
    const firstReport = (await position(page)).feedback[0];
    await page.locator(`[data-po-feedback-correct="${firstReport.id}"]`).click();
    await reportField(page, "description").fill("Synthetische Korrektur: zwei Einheiten gemeldet");
    await reportField(page, "remaining").fill("Sechs Einheiten noch offen gemeldet");
    await reportField(page, "correction_reason").fill("Zahlendreher im synthetischen Beispiel");
    await reportSave(page);
    check((await position(page)).feedback.length === 2, "human report correction appends without deleting its original");
    await capture(page, "decision-feedback-desktop.png");
    await closeDecision(page);
    await edit(page, "00020");
    await decisionField(page, "reason").fill("Gespeicherter unvollständiger Entwurf");
    await decisionSave(page);
    const initialBytes = await downloadBackup(page);
    const initialDocument = JSON.parse(initialBytes.toString("utf8"));
    check(initialDocument.entries.length === 2 && initialDocument.entries.some(entry => entry.decision.work_state === "open"), "download includes saved draft and documented position");

    await navigate(page, "purchase-orders");
    const beforeCancel = await snapshot(page);
    await importPo(page, updatedPo, false);
    await cancelMapping(page);
    same(await snapshot(page), beforeCancel, "mapping cancellation preserves source, interpretation, decisions, reports, drafts, route and language");
    await recoveryUsable(page, "mapping cancellation");

    await navigate(page, "purchase-orders");
    const beforeInvalid = await snapshot(page);
    await importPo(page, { name: "synthetic-invalid-po.csv", mimeType: "text/csv", buffer: Buffer.from("purchase_order,purchase_order_item,material_id,plant,open_quantity,base_unit\n0004500001,00010,MAT-1090,PLANT-03,12abc,EA") }, false);
    await page.locator("[data-po-confirm]").check();
    check(await page.locator("#mappingApplyButton").isDisabled(), "invalid quantity cannot be committed");
    check((await page.locator("#mappingIssues").innerText()).length > 0, "invalid source gives visible interpretation feedback");
    await cancelMapping(page, true);
    same(await snapshot(page), beforeInvalid, "invalid source leaves all prior state intact");
    await recoveryUsable(page, "invalid source");

    for (const [key, value, label] of [["forceBuildErrorForTest", true, "package processing"], ["forceCommitFailureForTest", "after-register", "post-registration rollback"], ["ui-render", true, "post-commit UI rendering"], ["ui-finalization", true, "post-commit UI finalization"]]) {
      await navigate(page, "purchase-orders");
      if (key === "forceCommitFailureForTest") await language(page, "en");
      await navigate(page, "purchase-orders");
      const before = await snapshot(page);
      await importPo(page, updatedPo, false);
      await page.locator("[data-po-confirm]").check();
      await page.evaluate(({ key, value }) => window.__obsoliqTestBridge.setPendingUploadContextOptions({ [key]: value, suppressErrorLog: true }), { key, value });
      if (key === "ui-render") await page.evaluate(() => {
        const target = document.getElementById("dataPackagesPanel"), descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
        Object.defineProperty(target, "innerHTML", { configurable: true, get() { return descriptor.get.call(this); }, set(value) {
          const stack = new Error().stack || "";
          if (stack.includes("renderPackageAvailability") && stack.includes("continuePackageImportWithMapping") && !stack.includes("renderOverview")) {
            delete target.innerHTML; window.renderFaultObserved = true; throw new Error("CONTROLLED_PO_UI_RENDER_FAILURE");
          }
          descriptor.set.call(this, value);
        } });
      });
      if (key === "ui-finalization") await page.evaluate(() => {
        const target = document.getElementById("mappingModal").classList;
        Object.defineProperty(target, "remove", { configurable: true, value: function (...tokens) {
          delete target.remove;
          window.finalizationFaultObserved = true;
          throw new Error("CONTROLLED_PO_UI_FINALIZATION_FAILURE");
        } });
      });
      await page.locator("#mappingApplyButton").click();
      const failureFeedback = await page.locator("#actionFeedback").evaluate(el => ({ text: el.textContent, error: el.classList.contains("error") }));
      check(await page.locator("#mappingModal.active").isVisible(), `${label}: rejected apply retains the review for recovery`);
      same(await snapshot(page), before, `${label}: all source/version/report bindings roll back exactly`);
      check(failureFeedback.error && failureFeedback.text.length > 0, `${label}: failure is explained immediately`);
      check(await page.locator('#mappingIssues [role="alert"]').isVisible(), `${label}: persistent error is visible inside the mapping dialog`);
      check(await page.locator('#mappingIssues [role="alert"]').evaluate(el => document.activeElement === el), `${label}: focus reaches the actionable failure`);
      if (key === "ui-render") check(await page.evaluate(() => window.renderFaultObserved), "controlled error occurred in the actual post-commit renderer");
      if (key === "ui-finalization") check(await page.evaluate(() => window.finalizationFaultObserved), "controlled error occurred at actual post-render mapping finalization");
      await cancelMapping(page, true);
      await recoveryUsable(page, label);
      if (key === "forceCommitFailureForTest") await language(page, "de");
    }

    await importPo(page, updatedPo);
    await navigate(page, "actions");
    const stale = await position(page);
    check(!stale.currently_documented && stale.decision.reduction_quantity === 8 && stale.feedback.length === 2, "successful 12-to-6 source update stales the 8-unit request while retaining reports");
    await edit(page);
    await page.locator("[data-po-decision-recheck]").click();
    await page.locator("[data-po-recheck-confirm]").check();
    await decisionSave(page);
    check(await page.locator("#purchaseOrderDecisionDialog .po-decision-errors").isVisible(), "re-documenting 8 against 6 is blocked");
    check((await position(page)).decision_version === originalVersion, "invalid redocumentation creates no version");
    await decisionField(page, "reduction_quantity").fill("4");
    await decisionSave(page);
    const revised = await position(page);
    check(revised.currently_documented && revised.decision.reduction_quantity === 4 && revised.decision_history.length === 1, "valid explicit recheck archives the old documented version");
    same(revised.feedback, stale.feedback, "reports and correction remain exactly bound to their original decision version");
    await edit(page);
    await page.setViewportSize({ width: 390, height: 844 });
    check(await page.locator("#purchaseOrderDecisionDialog").evaluate(el => el.scrollWidth <= el.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1), "390px decision remains horizontally contained");
    await capture(page, "decision-history-mobile.png");
    await closeDecision(page);
    const backupBytes = await downloadBackup(page);
    const backup = JSON.parse(backupBytes.toString("utf8"));

    const beforeDialogFault = await snapshot(page);
    await page.evaluate(() => {
      const original = HTMLDialogElement.prototype.showModal;
      HTMLDialogElement.prototype.showModal = function (...args) {
        if (this.id === "purchaseOrderRestoreDialog") {
          HTMLDialogElement.prototype.showModal = original;
          window.restoreStartFaultObserved = true;
          throw new Error("CONTROLLED_RESTORE_DIALOG_START_FAILURE");
        }
        return original.apply(this, args);
      };
    });
    await restorePreview(page, backupBytes);
    check(await page.evaluate(() => window.restoreStartFaultObserved) && await page.locator('#purchaseOrderRestoreDialog [role="alert"]').isVisible(), "restore dialog startup failure is caught and explained");
    check(await page.locator("[data-po-restore-apply]").count() === 0 && await page.locator("#sampleButton").isEnabled(), "failed restore startup offers no apply and releases the operation");
    await page.locator("[data-po-restore-cancel]").click();
    same(await snapshot(page), beforeDialogFault, "failed restore dialog startup preserves every prior binding");
    await recoveryUsable(page, "restore dialog startup failure");

    const beforePendingRestore = await snapshot(page);
    await holdAsync(page, "text", "heldRestore");
    const restoreChooser = page.waitForEvent("filechooser");
    await page.locator("[data-po-restore]").click();
    await (await restoreChooser).setFiles({ name: "actual-downloaded-backup.json", mimeType: "application/json", buffer: backupBytes });
    await page.waitForFunction(() => window.heldRestore.started);
    check(await page.locator('#purchaseOrderRestoreDialog [role="status"]').isVisible() && await page.locator("#sampleButton").isDisabled(), "pending restore is visible, cancellable and excludes source operations");
    await page.locator("[data-po-restore-cancel]").click();
    same(await snapshot(page), beforePendingRestore, "cancelling an active backup read preserves full state");
    await navigate(page, "purchase-orders");
    const beforeLateRestore = await snapshot(page);
    await startHeldImport(page, "newerImport");
    await page.evaluate(() => window.heldRestore.release());
    await page.waitForFunction(() => window.heldRestore.completed);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
    check(await page.locator("#overviewWorkspace").getAttribute("data-data-operation") === "import" && await page.locator("#sampleButton").isDisabled(), "late cancelled restore cannot unlock a newer source read");
    check(await page.locator("#purchaseOrderRestoreDialog:visible").count() === 0, "late cancelled restore cannot reopen or offer apply");
    await rejectHeldImport(page, "newerImport");
    same(await snapshot(page), beforeLateRestore, "late restore and failed source read preserve full saved state");
    await recoveryUsable(page, "cancelled pending restore at 390px");

    const beforeRestoreCancel = await snapshot(page);
    await restorePreview(page, backupBytes);
    check(await page.locator("[data-po-restore-apply]").isDisabled(), "restore preview requires explicit confirmation");
    await page.locator("[data-po-restore-cancel]").click();
    same(await snapshot(page), beforeRestoreCancel, "restore cancellation preserves full prior state");
    check(await page.evaluate(() => document.activeElement?.matches("[data-po-restore]")), "ready-preview cancel returns focus to restore action");
    await recoveryUsable(page, "restore cancellation at 390px");
    const beforeBadBackup = await snapshot(page);
    await restorePreview(page, Buffer.from(backupBytes.toString("utf8").replace("Synthetische Reduktionsanfrage", "Tampered request")));
    check(await page.locator("[data-po-restore-apply]").count() === 0, "invalid backup is blocked without an apply action");
    await capture(page, "invalid-backup-mobile.png");
    await page.locator("[data-po-restore-cancel]").click();
    same(await snapshot(page), beforeBadBackup, "invalid backup cannot partially replace decisions or reports");
    await recoveryUsable(page, "invalid backup at 390px");

    await page.setViewportSize({ width: 1440, height: 1000 });
    await setupDemo(page);
    await importPo(page, updatedPo);
    await navigate(page, "actions");
    const freshSources = await snapshot(page);
    await restorePreview(page, backupBytes);
    check(await page.locator('[data-po-restore-state="current"]').count() >= 1, "separately reimported matching source is current in restore preview");
    await page.evaluate(() => {
      const dialog = document.getElementById("purchaseOrderRestoreDialog");
      Object.defineProperty(dialog, "close", { configurable: true, value() {
        delete dialog.close;
        window.restoreFinalizeFaultObserved = true;
        throw new Error("CONTROLLED_RESTORE_FINALIZATION_FAILURE");
      } });
    });
    await page.locator("[data-po-restore-confirm]").check();
    await page.locator("[data-po-restore-apply]").click();
    check(await page.evaluate(() => window.restoreFinalizeFaultObserved) && await page.locator('#purchaseOrderRestoreDialog [role="alert"]').isVisible(), "restore finalization failure is caught with a visible no-apply explanation");
    same(await snapshot(page), freshSources, "failed restore finalization rolls back sources and all decision/report contents atomically");
    await page.locator("[data-po-restore-cancel]").click();
    await navigate(page, "overview");
    check(await page.locator(".metrics").isVisible(), "after failed restore finalization real navigation remains usable");
    await navigate(page, "actions");
    check(await page.locator("[data-po-backup]").isDisabled(), "rollback to the original empty work state correctly leaves backup disabled");
    await restorePreview(page, backupBytes);
    await capture(page, "restore-preview-desktop.png");
    await restoreApply(page);
    const roundtrip = JSON.parse((await downloadBackup(page)).toString("utf8"));
    same(roundtrip.entries, backup.entries, "actual downloaded JSON roundtrips decisions, drafts, versions, sources and report corrections losslessly");
    const restoredState = await snapshot(page);
    same(restoredState.registry, freshSources.registry, "JSON restore does not import or replace source packages");
    await restorePreview(page, backupBytes);
    check(await page.locator('[data-po-restore-state="identical"]').count() === backup.entries.length, "repeat backup identifies every entry as identical");
    await restoreApply(page);
    same(await snapshot(page), restoredState, "repeat restore is an exact no-op");
    await edit(page, "00020");
    await page.locator("[data-po-decision-recheck]").first().click();
    if (await page.locator("[data-po-recheck-confirm]").count()) await page.locator("[data-po-recheck-confirm]").check();
    await decisionField(page, "reason").fill("Abweichender gespeicherter lokaler Entwurf");
    await decisionSave(page);
    const conflicted = await snapshot(page);
    await restorePreview(page, backupBytes);
    check(await page.locator('[data-po-restore-state="conflict"]').count() > 0 && await page.locator("[data-po-restore-apply]").count() === 0, "conflicting saved draft blocks the whole restore");
    await page.locator("[data-po-restore-cancel]").click();
    same(await snapshot(page), conflicted, "conflict protection retains the local draft and every existing report");
    await recoveryUsable(page, "restore conflict");
    same(diagnostics, { pageErrors: [], consoleErrors: [], externalRequests: [] }, "no unexpected browser errors or external requests");
    evidence.originalDecisionVersion = originalVersion;
    evidence.finalDecisionVersion = revised.decision_version;
    evidence.savedEntries = backup.entries.length;
    evidence.feedbackEntries = revised.feedback.length;
    console.log(JSON.stringify({ status: "PASS", assertions: checks.length, checks, evidence, screenshots, diagnostics }, null, 2));
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
