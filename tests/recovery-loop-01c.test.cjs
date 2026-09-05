// Synthetic fixtures only. No filesystem artifacts or customer data.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console, crypto: crypto.webcrypto, TextEncoder, __OBSOLIQ_TEST_MODE__: true }); context.window = context;
for (const file of ["js/core/canonical-model.js", "js/core/value-utils.js", "js/data/source-model.js", "js/data/source-ingestion.js", "js/data/schema-profiler.js", "js/data/input-normalization-engine.js", "js/mapping/mapping-engine.js", "js/data/data-package-registry.js", "js/data/consumption-history-semantics-engine.js", "js/data/consumption-history-relationship-engine.js", "js/data/purchase-orders-builder.js", "js/application/input-trust-service.js", "js/application/package-import-service.js", "js/purchase-orders/po-review-backup.js", "js/purchase-orders/purchase-order-review-service.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
const O = context.ObsoliQ, R = O.purchaseOrders.reviewService, B = O.purchaseOrders.backup, builder = O.data.purchaseOrdersBuilder;
const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x)), hash = x => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
const checks = []; function eq(actual, expected, label) { assert.deepEqual(clone(actual), clone(expected), label); checks.push(label); }
function ok(value, label) { assert.ok(value, label); checks.push(label); }
function model(session = "A", quantity = 12, overrides = {}) {
  const csv = `purchase_order,purchase_order_item,material_id,plant,open_quantity,base_unit,source_system,open_value\n00045001,00010,000123,0010,${quantity},EA,SYNTHETIC,0\n00045001,00020,000123,0010,3,EA,SYNTHETIC,`;
  const parsed = O.data.ingestion.parseDelimited(csv), mapping = O.mapping.engine.createAutomaticColumnMapping({ headers: parsed.headers, rows: parsed.rows, ...builder.mappingOptions(parsed.sourceColumnMetadata) });
  const input = { headers: parsed.headers, sourceRows: parsed.rows, sourceColumnMetadata: parsed.sourceColumnMetadata, columnMapping: mapping }, inspected = builder.inspect(input);
  const built = builder.buildPurchaseOrdersPackage({ ...input, normalizationPolicy: inspected.effectivePolicy, purchaseOrderReview: { confirmed: true, binding: inspected.reviewBinding } });
  const po = { packageId: "PO-" + session, datasetId: "PO-DS-" + session, revision: 1, packageType: "purchase_orders", status: "ready", sourceData: { headers: parsed.headers, rows: parsed.rows, sourceColumnMetadata: parsed.sourceColumnMetadata },
    mapping: { mappingSignature: inspected.mappingSignature, columnMapping: mapping }, buildData: { packageRows: built.normalizedRows, buildMetadata: built.buildMetadata, inputTrustMetadata: { normalizationPolicySignature: inspected.normalizationPolicySignature } },
    inputTrustMetadata: { normalizationPolicySignature: inspected.normalizationPolicySignature }, sourceDescriptor: { classification: "synthetic", sourceLabel: "C:/synthetic/private-location/po.csv" } };
  const inventoryRows = [{ material_id: "000123", plant: "0010", base_unit: "EA", stock_quantity: 20, stock_value: 200, excess_value: 50, row_number: 1, __sourceRowIndex: 1 }];
  const inv = { packageId: "INV-" + session, datasetId: "INV-DS-" + session, revision: 1, relationshipKeys: { material: ["material_id"], organization: ["plant"] },
    sourceData: { headers: ["material_id", "plant", "stock_value"], rows: [{ material_id: "000123", plant: "0010", stock_value: 200, __sourceRowIndex: 1 }], sourceColumnMetadata: [] },
    mapping: { columnMapping: [{ sourceIndex: 0, sourceKey: "material_id", selectedCanonicalField: "material_id" }], mappingSignature: "synthetic-inventory-mapping" },
    buildData: { buildMetadata: { normalizationPolicy: { fields: {}, confirmedAt: session === "A" ? "2026-09-01" : "2026-09-02" } } } };
  const cases = [{ case_id: "EXCESS-" + session, material_id: "000123", plant: "0010", source_row: inventoryRows[0], source_row_number: 1, gross_excess_value: 50 }];
  if (overrides.mapping) inv.mapping.columnMapping[0].sourceIndex = 1;
  if (overrides.policy) inv.buildData.buildMetadata.normalizationPolicy.fields.stock_value = { numericLocale: "en-US" };
  if (overrides.case) cases[0].gross_excess_value = 30;
  if (overrides.ambiguous) cases.push({ ...cases[0], case_id: "second-case" });
  return R.buildModel({ inventoryPackage: inv, poPackage: po, inventoryRows, cases });
}
const clock = () => "2026-09-05T12:00:00.000Z";
function makeService(m) {
  const service = R.createReviewService({ clock });
  service.handoff({ model: m, caseRecord: { case_id: m.rows[0].case_ids[0], material_id: "000123" }, actionRow: { row_number: 1 }, positionIds: m.rows.map(row => row.position_id) });
  return service;
}
function save(service, m, values, index = 0) {
  const review = service.list(m)[0], position = review.positions.find(row => row.purchase_order_item === (index ? "00020" : "00010"));
  const editor = service.beginDecision({ model: m, reviewId: review.review_id, positionId: position.position_id }).editor;
  return service.saveDecision({ model: m, editor, input: values });
}
const decision = { direction: "request_reduction", work_state: "documented", reason: 'Synthetisch: "Prüfung"\n=keine Ausführung', owner: "+Synthetischer Einkauf", reduction_quantity: 8, evidence_reference: "C:/user-entered/Beleg.txt", evidence_type: "synthetic", evidence_date: "2026-09-05" };
async function restore(service, json, m) {
  const preview = await service.previewRestore({ json, model: m });
  return { preview, result: service.applyRestore({ preview, model: m, confirmed: true }) };
}
async function resign(data) { const { integrity, ...payload } = data; return JSON.stringify({ ...payload, integrity: { algorithm: "SHA-256", canonicalization: "obsoliq-stable-json-v1", digest: await B.digest(payload) } }); }
module.exports = { O, R, B, clone, hash, model, clock, makeService, save, decision, restore, resign };
if (require.main === module) (async () => {
  const original = model(), originalHash = hash(original), source = makeService(original);
  eq(save(source, original, decision).status, "ready", "document first version");
  eq(save(source, original, { ...decision, reason: decision.reason + "\nVersion 2" }).status, "ready", "retain documented history");
  eq(save(source, original, { direction: "", work_state: "in_review", reason: "Unvollständiger Entwurf\n00", owner: "" }, 1).status, "ready", "incomplete saved draft");
  const backed = await source.createBackup(), data = JSON.parse(backed.json);
  eq(backed.counts, { total: 2, documented: 1, drafts: 1, history: 1 }, "scope counts");
  ok(!backed.json.includes("private-location") && backed.json.includes("C:/user-entered/Beleg.txt"), "generated paths removed, manual reference unchanged");
  ok(!backed.json.includes("sourceRows") && !backed.json.includes("backup_context") && !backed.json.includes("edit_binding"), "no source files or editor tokens serialized");
  eq(await B.digest({ b: 2, a: 1 }), crypto.createHash("sha256").update('{"a":1,"b":2}').digest("hex"), "canonical SHA-256 known vector");
  const fresh = model("B"), target = R.createReviewService({ clock }), freshHash = hash(fresh);
  const loaded = await restore(target, backed.json, fresh);
  eq(loaded.preview.rows.map(row => row.state), ["current", "current"], "identical sources with new session IDs");
  eq(loaded.result.status, "ready", "confirmed atomic restore");
  eq(target.list(fresh)[0].positions.filter(row => row.currently_documented).length, 1, "only genuine current documented counted");
  eq(JSON.parse((await target.createBackup()).json).entries, data.entries, "complete lossless roundtrip including draft/history/timestamps");
  eq(hash(fresh), freshHash, "source/financial context unchanged"); eq(hash(original), originalHash, "backup raw state immutable");
  const before = hash(target.snapshot());
  const duplicate = await restore(target, backed.json, fresh);
  eq(duplicate.preview.rows.map(row => row.state), ["identical", "identical"], "duplicate preview");
  eq(duplicate.result.unchanged, true, "duplicate restore no-op"); eq(hash(target.snapshot()), before, "duplicate state unchanged");
  const staleModel = model("C", 6), staleService = R.createReviewService();
  const stale = await restore(staleService, backed.json, staleModel);
  ok(stale.preview.rows.some(row => row.state === "stale"), "changed quantity marked stale");
  const staleReview = staleService.list(staleModel)[0], staleRow = staleReview.positions.find(row => row.purchase_order_item === "00010");
  eq(staleRow.currently_documented, false, "8 not current when open is 6");
  const editor = staleService.beginDecision({ model: staleModel, reviewId: staleReview.review_id, positionId: staleRow.position_id, recheck: true }).editor;
  eq(editor.previous_source.open_quantity, 12, "original accepted quantity retained");
  ok(staleService.saveDecision({ model: staleModel, editor, input: decision, confirmed: true }).errors.includes("reduction_invalid"), "01B recheck rejects 8 > 6");
  eq(staleService.saveDecision({ model: staleModel, editor, input: { ...decision, reduction_quantity: 4 }, confirmed: true }).status, "ready", "01B fresh review accepts 4");
  const amended = JSON.parse((await staleService.createBackup()).json).entries.find(row => row.identity.purchase_order_item === "00010");
  eq(amended.history.length, 2, "restored history remains history after new edit");
  eq(amended.history[1].accepted, data.entries.find(row => row.identity.purchase_order_item === "00010").accepted, "original accepted basis retained in next version");
  for (const [name, m] of [["missing", { rows: [], sourceValid: false }], ["ambiguous", model("X", 12, { ambiguous: true })]]) {
    const s = R.createReviewService(), result = await restore(s, backed.json, m);
    eq(result.preview.rows.every(row => row.state === "unassignable"), true, name + " no false link");
    eq(s.list(m).every(record => !record.case_id && !record.inventory_dataset_id && record.positions.every(row => !row.currently_documented)), true, name + " no operational case");
    eq(s.list(fresh).every(record => record.positions.every(row => row.source_status === "unassignable")), true, name + " later imports cannot auto-bind");
    const again = await s.previewReassociation(fresh);
    eq(s.applyRestore({ preview: again, model: fresh }).status, "blocked", name + " explicit reassociation confirmation required");
    eq(s.applyRestore({ preview: again, model: fresh, confirmed: true }).status, "ready", name + " conscious reassociation");
    eq(s.list(fresh).flatMap(r => r.positions).length, 2, name + " rebind no duplicate");
  }
  for (const kind of ["mapping", "policy", "case"]) {
    const s = R.createReviewService(), m = model("D", 12, { [kind]: true });
    eq((await restore(s, backed.json, m)).preview.rows.every(row => row.state === "stale"), true, kind + " is part of proof");
  }
  eq(save(target, fresh, { ...decision, reason: "different local work" }).status, "ready", "existing local amendment");
  const conflictBefore = hash(target.snapshot()), conflict = await restore(target, backed.json, fresh);
  eq(conflict.preview.status, "conflict", "different content conflicts"); eq(conflict.result.status, "blocked", "whole conflict import blocked"); eq(hash(target.snapshot()), conflictBefore, "no conflict overwrite");
  const mutations = [
    ["unknown version", d => { d.format = "unknown"; }], ["invalid type", d => { d.entries[0].accepted.values.open_quantity = "12"; }],
    ["duplicate", d => { d.entries.push(clone(d.entries[0])); }], ["bad history", d => { const e=d.entries.find(e=>e.history.length); e.history[0].version=e.version; }],
    ["forged current", d => { d.entries[0].current = true; }], ["editor token", d => { d.entries[0].edit_binding = "forged"; }],
    ["huge text", d => { d.entries[0].decision.reason = "x".repeat(12001); }], ["bad ID", d => { d.entries[0].id = "wrong"; }],
    ["bad status", d => { d.entries[0].decision.work_state = "Implemented"; }], ["wrong identity", d => { d.entries[0].accepted.values.material_id = "OTHER"; }],
    ["invalid timestamp", d => { d.entries[0].decision.updated_at = "2026-02-30T12:00:00Z"; }]
  ];
  for (const [label, mutate] of mutations) {
    const modified = clone(data); mutate(modified); const snapshot = hash(target.snapshot());
    eq((await target.previewRestore({ json: await resign(modified), model: fresh })).status, "blocked", label + " rejected");
    eq(hash(target.snapshot()), snapshot, label + " atomic");
  }
  for (const json of ["{", backed.json.replace("Version 2", "tampered"), " ".repeat(B.LIMITS.bytes + 1), '{"__proto__":{"polluted":true}}']) eq((await target.previewRestore({ json, model: fresh })).status, "blocked", "malformed/checksum/size/prototype rejected");
  eq({}.polluted, undefined, "no prototype pollution");
  const fault = R.createReviewService({ restoreFault: () => { throw new Error("synthetic commit fault"); } }), faultHash = hash(fault.snapshot());
  eq((await restore(fault, backed.json, fresh)).result.status, "blocked", "fault after staged map swap"); eq(hash(fault.snapshot()), faultHash, "full map rollback");
  const racing = R.createReviewService(), preview = await racing.previewRestore({ json: backed.json, model: fresh });
  eq(racing.applyRestore({ preview, model: staleModel, confirmed: true }).errors, ["backup_preview_changed"], "source change after preview rejected");
  const existingPreview = await target.previewRestore({ json: (await target.createBackup()).json, model: fresh });
  save(target, fresh, { ...decision, reason: "another edit" });
  eq(target.applyRestore({ preview: existingPreview, model: fresh, confirmed: true }).errors, ["backup_preview_changed"], "decision edit after preview rejected");
  const oldEditorService = makeService(fresh), r = oldEditorService.list(fresh)[0], oldEditor = oldEditorService.beginDecision({ model: fresh, reviewId: r.review_id, positionId: r.positions[0].position_id }).editor;
  oldEditorService.restore([]); await restore(oldEditorService, backed.json, fresh);
  eq(oldEditorService.saveDecision({ model: fresh, editor: oldEditor, input: decision }).errors, ["edit_conflict"], "imported logical version cannot authorize old editor");
  const draftData = clone(data), draft = draftData.entries.find(e => e.decision.work_state !== "documented");
  delete draft.decision.owner; draft.decision.review_date = null; draft.decision.reduction_quantity = 0; draft.decision.reason = "  raw text\n  ";
  const exactDraft = R.createReviewService(); await restore(exactDraft, await resign(draftData), fresh);
  eq(JSON.parse((await exactDraft.createBackup()).json).entries, draftData.entries, "missing/null/zero/raw draft text preserved without cleanup");
  const exported = R.exportReviews(staleService.list(staleModel));
  const exportedDecision = exported.find(row => row.purchase_order_item === "00010");
  ok(exportedDecision.documented_history.includes("Prüfung") && !exportedDecision.documented_history.includes("backup_context"), "CSV remains readable history, no source file payload");
  const collisionModel = clone(original);
  for (const row of collisionModel.rows) {
    const key = JSON.parse(row.backup_context.cases[0].key);
    row.backup_context.cases[0].key = B.canonical({ ...key, program: "synthetic-new-program" });
  }
  const incomingService = makeService(collisionModel), collisionFile = (await incomingService.createBackup()).json;
  const collisionOwner = makeService(original), collisionBefore = hash(collisionOwner.snapshot());
  const collisionPreview = await collisionOwner.previewRestore({ json: collisionFile, model: collisionModel });
  eq(collisionPreview.status, "conflict", "operational same case/item collision visible before apply");
  eq(collisionOwner.applyRestore({ preview: collisionPreview, model: collisionModel, confirmed: true }).status, "blocked", "operational collision blocks whole file");
  eq(hash(collisionOwner.snapshot()), collisionBefore, "operational collision protects work");
  console.log(JSON.stringify({ status: "PASS", assertions: checks.length, checks, sourceHash: originalHash, stateHash: hash(exactDraft.snapshot()) }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
