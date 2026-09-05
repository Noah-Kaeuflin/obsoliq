(function (global) {
  const root = global.ObsoliQ;
  root.purchaseOrders = root.purchaseOrders || {};
  const FORMAT = "obsoliq-po-review-backup-v2", LEGACY_FORMAT = "obsoliq-po-review-backup-v1";
  const LIMITS = Object.freeze({ bytes: 5 * 1024 * 1024, entries: 2000, historyPerEntry: 100, history: 10000, depth: 14, nodes: 250000, text: 12000 });
  const canonical = value => root.data.purchaseOrdersBuilder.signature(value);
  const copy = value => JSON.parse(JSON.stringify(value));
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const pick = (value, keys) => Object.fromEntries(keys.filter(key => own(value || {}, key)).map(key => [key, value[key]]));
  const VALUE_KEYS = ["purchase_order", "purchase_order_item", "material_id", "plant", "source_system", "open_quantity", "base_unit", "delivery_date", "delivery_date_raw", "delivery_date_status", "item_status", "supplier", "buyer", "open_value", "value_status", "source_currency", "source_row_index"];
  const ID_KEYS = ["material_id", "plant", "storage_location", "batch", "special_stock", "sales_order", "sales_order_item", "project", "wbs_element", "profit_center", "program", "program_short"];
  const CASE_KEYS = ["primary_category", "category", "gross_excess_value", "net_addressable_excess_value", "excess_overlap_value", "stock_value", "recovery_potential", "root_cause", "owner_reference", "relationship_match_type", "evidence_summary", "limitations"];
  const AUDIT_KEYS = ["packageId", "revision", "datasetId", "sourceLabel", "importedAt", "classification"];
  const DECISION_KEYS = ["direction", "work_state", "reason", "owner", "review_date", "reduction_quantity", "requested_delivery_date", "evidence_type", "evidence_reference", "evidence_date", "updated_at", "documented_at"];
  const fail = code => { throw new Error(code); };
  async function digest(value) {
    if (!global.crypto?.subtle || !global.TextEncoder) fail("backup_crypto_unavailable");
    const bytes = new global.TextEncoder().encode(canonical(value));
    return [...new Uint8Array(await global.crypto.subtle.digest("SHA-256", bytes))].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  // Review timestamps are audit metadata, not interpretation controls. No other policy field is removed.
  function interpretation(value) {
    if (Array.isArray(value)) return value.map(interpretation);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).filter(key => !["confirmedAt", "reviewConfirmedAt"].includes(key)).map(key => [key, interpretation(value[key])]));
    return value;
  }
  function sourceBasis(record, rows) {
    if (!record?.sourceData || !record.mapping?.columnMapping || !rows.length) return null;
    return canonical({ headers: record.sourceData.headers, metadata: record.sourceData.sourceColumnMetadata,
      mapping: interpretation(record.mapping.columnMapping), policy: interpretation(record.buildData?.buildMetadata?.normalizationPolicy || record.inputTrustMetadata?.normalizationPolicy || {}), rows });
  }
  function caseKey(item) {
    return canonical({ kind: "excess", ...pick(item.source_row || item, ID_KEYS), material_id: item.material_id, plant: item.plant || item.source_row?.plant || "" });
  }
  function captureContext(row, inventoryPackage, poPackage, entity, cases) {
    const raw = inventoryPackage?.sourceData?.rows || [];
    const members = entity?.rows || [];
    const indices = new Set(members.map(item => item.__sourceRowIndex ?? item.row_number));
    const inventorySource = sourceBasis(inventoryPackage, raw.filter((item, index) => indices.has(item.__sourceRowIndex ?? index + 1)));
    const poSource = sourceBasis(poPackage, (poPackage?.sourceData?.rows || []).filter((item, index) => (item.__sourceRowIndex ?? index + 1) === row.source_row_index));
    const fields = root.core.canonical.importableFieldEntries().map(([key]) => key);
    return { inventory: inventorySource && canonical({ source: inventorySource, values: members.map(item => pick(item, fields)) }), po: poSource,
      cases: cases.map(item => ({ case_id: item.case_id, key: caseKey(item), evidence: canonical(pick(item, CASE_KEYS)), action_row_number: item.source_row_number || item.source_row?.row_number || null })) };
  }
  function audit(source) {
    const result = pick(source || {}, AUDIT_KEYS);
    if (typeof result.sourceLabel === "string") result.sourceLabel = result.sourceLabel.split(/[\\/]/).pop();
    return result;
  }
  async function accepted(row, caseId) {
    const context = row.backup_context, item = context?.cases.find(item => item.case_id === caseId);
    if (!context?.inventory || !context.po || !item) fail("backup_basis_missing");
    return { values: pick(row, VALUE_KEYS), source: audit(row.source), inventory_source: audit(row.inventory_source),
      proof: { inventory: await digest(context.inventory), po: await digest(context.po), case: await digest(item.evidence) } };
  }
  async function entry(record, row) {
    if (row.backup_record) return { ...copy(row.backup_record), feedback: copy(row.feedback || []) };
    const item = row.backup_context?.cases.find(item => item.case_id === record.case_id);
    if (!item) fail("backup_basis_missing");
    const identity = { purchase_order: row.purchase_order, purchase_order_item: row.purchase_order_item, material_id: row.material_id, plant: row.plant,
      source_system: row.source_system || "", case_key: item.key };
    const value = { id: await digest(identity), identity, accepted: await accepted(row, record.case_id), version: row.decision_version || 0, history: [], feedback: copy(row.feedback || []) };
    if (own(row, "decision")) value.decision = copy(row.decision);
    for (const previous of row.decision_history || []) {
      value.history.push(previous.backup_version ? copy(previous.backup_version) : { version: previous.version, decision: copy(previous.decision), accepted: await accepted(previous.source, record.case_id) });
    }
    return value;
  }
  function object(value, keys, required = keys) {
    if (!value || Array.isArray(value) || typeof value !== "object" || Object.keys(value).some(key => !keys.includes(key)) || required.some(key => !own(value, key))) fail("backup_structure_invalid");
  }
  function str(value, empty = true) { if (typeof value !== "string" || (!empty && !value.length)) fail("backup_structure_invalid"); }
  function boundedTree(value, depth = 0, count = { nodes: 0 }) {
    if (++count.nodes > LIMITS.nodes || depth > LIMITS.depth) fail("backup_limit");
    if (typeof value === "string" && value.length > LIMITS.text) fail("backup_limit");
    if (typeof value === "number" && !Number.isFinite(value)) fail("backup_structure_invalid");
    if (value && typeof value === "object") for (const key of Object.keys(value)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) fail("backup_structure_invalid");
      boundedTree(value[key], depth + 1, count);
    }
  }
  function validateAccepted(value, identity) {
    object(value, ["values", "source", "inventory_source", "proof"]);
    object(value.values, VALUE_KEYS, ["purchase_order", "purchase_order_item", "material_id", "plant", "open_quantity", "base_unit"]);
    for (const [key, field] of Object.entries(value.values)) {
      if (["open_quantity", "open_value"].includes(key)) { if (field !== null && (typeof field !== "number" || !Number.isFinite(field))) fail("backup_structure_invalid"); }
      else if (key === "source_row_index") { if (!Number.isSafeInteger(field) || field < 1) fail("backup_structure_invalid"); }
      else str(field);
    }
    for (const key of ["purchase_order", "purchase_order_item", "material_id", "plant", "source_system"]) if ((value.values[key] || "") !== identity[key]) fail("backup_identity_invalid");
    if (!(value.values.open_quantity > 0) || !value.values.base_unit) fail("backup_structure_invalid");
    for (const source of [value.source, value.inventory_source]) {
      object(source, AUDIT_KEYS, ["packageId", "datasetId", "revision"]);
      for (const [key, field] of Object.entries(source)) {
        if (key === "revision") { if (!Number.isSafeInteger(field) || field < 1) fail("backup_structure_invalid"); }
        else { str(field); if (key !== "importedAt" && /[\\/]/.test(field)) fail("backup_structure_invalid"); }
      }
    }
    object(value.proof, ["inventory", "po", "case"]);
    if (Object.values(value.proof).some(hash => typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))) fail("backup_structure_invalid");
  }
  function validateDecision(value, acceptedSource, version) {
    object(value, DECISION_KEYS, ["direction", "work_state"]);
    const service = root.purchaseOrders.reviewService;
    if (!service.WORK_STATES.includes(value.work_state) || (value.direction !== "" && !service.DECISION_TYPES.includes(value.direction))) fail("backup_structure_invalid");
    for (const [key, field] of Object.entries(value)) {
      if (key === "reduction_quantity") { if (field !== null && typeof field !== "string" && typeof field !== "number") fail("backup_structure_invalid"); }
      else if (field !== null) str(field);
    }
    if (value.work_state === "documented") {
      if (version < 1 || service.validateDecision(value, acceptedSource.values).errors.length || !value.documented_at || !value.updated_at) fail("backup_history_invalid");
      if (value.direction === "request_reduction" && typeof value.reduction_quantity !== "number") fail("backup_structure_invalid");
    }
    for (const key of ["updated_at", "documented_at"]) if (value[key]) {
      const date = new Date(value[key]);
      if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value[key]) || !Number.isFinite(date.getTime())
        || ![date.toISOString(), date.toISOString().replace(".000Z", "Z")].includes(value[key])) fail("backup_history_invalid");
    }
    if (value.work_state !== "documented" && value.documented_at) fail("backup_history_invalid");
  }
  function documentedVersions(item) {
    return [...item.history, ...(item.decision?.work_state === "documented" ? [{ version: item.version, decision: item.decision, accepted: item.accepted }] : [])];
  }
  async function feedbackTarget(item, version) {
    const matches = documentedVersions(item).filter(old => old.version === version);
    if (matches.length !== 1) fail("backup_feedback_invalid");
    if ([matches[0].accepted.source, matches[0].accepted.inventory_source].some(source => !source.packageId || !source.datasetId)) fail("backup_feedback_invalid");
    return { entry_id: item.id, decision_version: version, decision_signature: await digest({ identity: item.identity, ...matches[0] }) };
  }
  async function validateFeedback(item, ids = new Set()) {
    if (!Array.isArray(item.feedback) || item.feedback.length > 500 || ids.size + item.feedback.length > 10000) fail("backup_limit");
    const seen = new Map(), corrected = new Set();
    for (const report of item.feedback) {
      object(report, ["id", "target", "kind", "description", "remaining", "reporter", "reported_on", "recorded_at", "implemented_on", "reference_type", "reference", "corrects_id", "correction_reason"]);
      for (const key of Object.keys(report).filter(key => key !== "target")) str(report[key]);
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(report.id) || ids.has(report.id)) fail("backup_feedback_invalid");
      object(report.target, ["entry_id", "decision_version", "decision_signature"]);
      if (!Number.isSafeInteger(report.target.decision_version) || canonical(report.target) !== canonical(await feedbackTarget(item, report.target.decision_version))) fail("backup_feedback_invalid");
      const version = documentedVersions(item).find(old => old.version === report.target.decision_version);
      const validated = root.purchaseOrders.reviewService.validateFeedback(report, version.decision.direction);
      if (validated.errors.length || Object.keys(validated.values).some(key => validated.values[key] !== report[key])) fail("backup_feedback_invalid");
      const date = new Date(report.recorded_at);
      if (!Number.isFinite(date.getTime()) || date.toISOString() !== report.recorded_at) fail("backup_feedback_invalid");
      if (report.corrects_id) {
        const prior = seen.get(report.corrects_id);
        // Only backward references to one unreplaced report of the same decision are legal.
        if (!prior || corrected.has(prior.id) || canonical(prior.target) !== canonical(report.target) || !report.correction_reason) fail("backup_feedback_invalid");
        corrected.add(prior.id);
      } else if (report.correction_reason) fail("backup_feedback_invalid");
      ids.add(report.id); seen.set(report.id, report);
    }
  }
  async function validateEntries(entries, format = FORMAT) {
    if (!Array.isArray(entries) || entries.length > LIMITS.entries) fail("backup_limit");
    const ids = new Set(), feedbackIds = new Set(); let historyCount = 0;
    for (const item of entries) {
      object(item, ["id", "identity", "accepted", "version", "decision", "history", ...(format === FORMAT ? ["feedback"] : [])], ["id", "identity", "accepted", "version", "history", ...(format === FORMAT ? ["feedback"] : [])]);
      object(item.identity, ["purchase_order", "purchase_order_item", "material_id", "plant", "source_system", "case_key"]);
      for (const [key, field] of Object.entries(item.identity)) str(field, key === "source_system");
      if (item.id !== await digest(item.identity) || ids.has(item.id)) fail("backup_identity_invalid");
      ids.add(item.id);
      if (!Number.isSafeInteger(item.version) || item.version < 0 || !Array.isArray(item.history) || item.history.length > LIMITS.historyPerEntry) fail("backup_history_invalid");
      validateAccepted(item.accepted, item.identity);
      if (own(item, "decision")) validateDecision(item.decision, item.accepted, item.version);
      else if (item.version !== 0 || item.history.length) fail("backup_history_invalid");
      let previous = 0;
      for (const old of item.history) {
        if (++historyCount > LIMITS.history) fail("backup_limit");
        object(old, ["version", "decision", "accepted"]);
        if (!Number.isSafeInteger(old.version) || old.version <= previous || old.version >= item.version || old.decision?.work_state !== "documented") fail("backup_history_invalid");
        previous = old.version; validateAccepted(old.accepted, item.identity); validateDecision(old.decision, old.accepted, old.version);
      }
      if (format === FORMAT) await validateFeedback(item, feedbackIds);
    }
    return copy(entries);
  }
  async function encode(entries, createdAt = new Date().toISOString()) {
    const payload = { format: FORMAT, created_at: createdAt, scope: "po-review-work-only;source-files-required", entries };
    boundedTree(payload); await validateEntries(entries);
    const json = JSON.stringify({ ...payload, integrity: { algorithm: "SHA-256", canonicalization: "obsoliq-stable-json-v1", digest: await digest(payload) } }, null, 2);
    if (new global.TextEncoder().encode(json).length > LIMITS.bytes) fail("backup_limit");
    return json;
  }
  async function decode(json) {
    if (typeof json !== "string" || new global.TextEncoder().encode(json).length > LIMITS.bytes) fail("backup_limit");
    let data; try { data = JSON.parse(json); } catch { fail("backup_structure_invalid"); }
    boundedTree(data);
    if (![FORMAT, LEGACY_FORMAT].includes(data?.format)) fail("backup_version_unknown");
    object(data, ["format", "created_at", "scope", "entries", "integrity"]);
    str(data.created_at); if (data.scope !== "po-review-work-only;source-files-required") fail("backup_structure_invalid");
    object(data.integrity, ["algorithm", "canonicalization", "digest"]);
    if (data.integrity.algorithm !== "SHA-256" || data.integrity.canonicalization !== "obsoliq-stable-json-v1" || data.integrity.digest !== await digest(pick(data, ["format", "created_at", "scope", "entries"]))) fail("backup_checksum_invalid");
    const entries = await validateEntries(data.entries, data.format);
    return entries.map(item => ({ ...item, feedback: item.feedback || [] }));
  }
  function restoredRow(item, acceptedSource = item.accepted) {
    const values = copy(acceptedSource.values);
    return { ...values, position_id: canonical([values.purchase_order, values.purchase_order_item]), source: copy(acceptedSource.source), inventory_source: copy(acceptedSource.inventory_source),
      link_status: "unmatched", case_ids: [], inventory_row_keys: [], inventory_entity_key: "", current_signature: "restored-unverified" };
  }
  root.purchaseOrders.backup = Object.freeze({ FORMAT, LEGACY_FORMAT, LIMITS, canonical, digest, captureContext, entry, accepted, encode, decode, restoredRow, documentedVersions, feedbackTarget, validateFeedback });
})(window);
