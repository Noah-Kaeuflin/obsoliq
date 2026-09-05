(function (global) {
  const root = global.ObsoliQ;
  root.purchaseOrders = root.purchaseOrders || {};
  const builder = root.data.purchaseOrdersBuilder;
  const entities = root.data.consumptionHistoryRelationshipEngine;
  const unit = root.data.consumptionHistorySemanticsEngine.normalizedUnit;
  const text = value => String(value ?? "").trim();
  const clone = value => JSON.parse(JSON.stringify(value));
  const signature = builder.signature;
  const DECISION_TYPES = Object.freeze(["keep", "request_reduction", "request_cancellation", "request_postponement"]);
  const WORK_STATES = Object.freeze(["open", "in_review", "question_required", "documented"]);
  const emptyDecision = () => ({ direction: "", reason: "", work_state: "open", owner: "", review_date: "", reduction_quantity: null,
    requested_delivery_date: "", evidence_type: "", evidence_reference: "", evidence_date: "", updated_at: "", documented_at: "" });
  const dateValid = value => root.data.consumptionHistorySemanticsEngine.parsePostingDate(value, "yyyy-mm-dd").status === "valid";
  const FEEDBACK_FIELDS = Object.freeze(["kind", "description", "remaining", "reporter", "reported_on", "implemented_on", "reference_type", "reference", "corrects_id", "correction_reason"]);
  const feedbackKinds = direction => direction === "keep" ? ["keep_reported", "not_implemented_reported", "rejected_reported"]
    : ["partial_reported", "full_reported", "not_implemented_reported", "rejected_reported"];
  function validateFeedback(input, direction) {
    const values = Object.fromEntries(FEEDBACK_FIELDS.map(key => [key, text(input[key])])), errors = [];
    if (!feedbackKinds(direction).includes(values.kind)) errors.push("feedback_kind_required");
    for (const key of ["description", "reporter", "reported_on"]) if (!values[key]) errors.push("feedback_" + key + "_required");
    if (values.kind === "partial_reported" && !values.remaining) errors.push("feedback_remaining_required");
    for (const key of ["reported_on", "implemented_on"]) if (values[key] && !dateValid(values[key])) errors.push("feedback_date_invalid");
    if (values.corrects_id && !values.correction_reason) errors.push("feedback_correction_required");
    if (!values.corrects_id && values.correction_reason) errors.push("feedback_correction_invalid");
    if (Object.values(values).some(value => value.length > 12000)) errors.push("backup_limit");
    return { values, errors };
  }
  function validateDecision(input, row) {
    const decision = emptyDecision(), errors = [];
    for (const key of ["direction", "reason", "work_state", "owner", "review_date", "requested_delivery_date", "evidence_type", "evidence_reference", "evidence_date"]) decision[key] = text(input[key]);
    if (!WORK_STATES.includes(decision.work_state)) errors.push("work_state_invalid");
    if (decision.direction && !DECISION_TYPES.includes(decision.direction)) errors.push("direction_required");
    for (const key of ["review_date", "evidence_date"]) if (decision[key] && !dateValid(decision[key])) errors.push(key + "_invalid");
    if (decision.direction === "request_reduction") {
      const raw = input.reduction_quantity;
      if (raw !== null && raw !== undefined && text(raw) !== "") {
        // HTML number inputs supply a canonical decimal, never an import-locale guess.
        const canonical = typeof raw === "number" || (typeof raw === "string" && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()));
        const parsed = canonical ? root.core.valueUtils.numericEvidence(Number(raw)) : null;
        if (!parsed || parsed.status !== "valid" || !(parsed.normalizedValue > 0) || !Number.isFinite(row.open_quantity) || parsed.normalizedValue > row.open_quantity) errors.push("reduction_invalid");
        else decision.reduction_quantity = parsed.normalizedValue;
      }
    } else decision.requested_delivery_date = decision.direction === "request_postponement" ? decision.requested_delivery_date : "";
    if (decision.direction === "request_postponement" && decision.requested_delivery_date) {
      if (!dateValid(decision.requested_delivery_date)) errors.push("delivery_invalid");
      else if (dateValid(row.delivery_date) && decision.requested_delivery_date <= row.delivery_date) errors.push("delivery_not_later");
    }
    if (decision.direction !== "request_postponement") decision.requested_delivery_date = "";
    if (decision.work_state === "documented") {
      if (!DECISION_TYPES.includes(decision.direction)) errors.push("direction_required");
      if (!decision.reason) errors.push("reason_required");
      if (!decision.owner) errors.push("owner_required");
      if (decision.direction === "request_reduction" && decision.reduction_quantity === null) errors.push("reduction_required");
      if (decision.direction === "request_postponement" && !decision.requested_delivery_date) errors.push("delivery_required");
    }
    return { decision, errors: [...new Set(errors)] };
  }
  function sourceToken(row) {
    return signature({ position: row.position_id, material: row.material_id, plant: row.plant, quantity: row.open_quantity, unit: row.base_unit,
      delivery: row.delivery_date, itemStatus: row.item_status, system: row.source_system, source: row.source, inventory: row.inventory_source,
      entity: row.inventory_entity_key, rows: row.inventory_row_keys, relationship: row.current_signature });
  }
  function currentPosition(model, record, row) {
    if (!model?.sourceValid || !model.inventoryValid || model.inventoryIdentity?.datasetId !== record.inventory_dataset_id) return null;
    const candidates = model.rows.filter(candidate => candidate.position_id === row.position_id);
    if (candidates.length !== 1) return null;
    const candidate = candidates[0];
    return candidate.link_status === "matched" && candidate.case_ids.includes(record.case_id)
      && candidate.material_id === row.material_id && candidate.plant === row.plant && text(candidate.source_system) === text(row.source_system) ? candidate : null;
  }
  function sourceState(model, record, row) {
    const current = currentPosition(model, record, row);
    return !current ? "unassignable" : sourceToken(current) === sourceToken(row) ? "current" : "stale";
  }
  function sourceForVersion(row, version) {
    if (row.decision_version === version && row.decision?.work_state === "documented") return row;
    const matches = (row.decision_history || []).filter(old => old.version === version);
    return matches.length === 1 ? matches[0].source : null;
  }
  function versionSourceStates(model, record, row) {
    return Object.fromEntries([...(row.decision_history || []).map(old => old.version), ...(row.decision?.work_state === "documented" ? [row.decision_version] : [])]
      .map(version => { const source = sourceForVersion(row, version); return [version, source ? sourceState(model, record, source) : "unassignable"]; }));
  }
  function packageBinding(record) {
    return record ? { packageId: record.packageId, revision: record.revision, datasetId: record.datasetId,
      mapping: record.mapping?.mappingSignature || "", policy: record.buildData?.buildMetadata?.normalizationPolicySignature || record.inputTrustMetadata?.normalizationPolicySignature || "" } : null;
  }
  function validSource(record) {
    if (!record || record.packageType !== "purchase_orders" || record.status !== "ready" || !Number.isInteger(record.revision) || record.revision < 1) return false;
    const data = record.sourceData || {}, meta = record.buildData?.buildMetadata || {};
    const input = { headers: data.headers, sourceRows: data.rows, sourceColumnMetadata: data.sourceColumnMetadata, columnMapping: record.mapping?.columnMapping, normalizationPolicy: meta.normalizationPolicy };
    if (builder.sourceSignature(input) !== meta.sourceSignature) return false;
    const mappedSignature = root.mapping.engine.columnMappingSignature(input.columnMapping, builder.mappingOptions(data.sourceColumnMetadata));
    return mappedSignature === record.mapping?.mappingSignature && mappedSignature === meta.mappingSignature
      && signature(meta.normalizationPolicy) === meta.normalizationPolicySignature
      && record.inputTrustMetadata?.normalizationPolicySignature === meta.normalizationPolicySignature
      && record.buildData?.inputTrustMetadata?.normalizationPolicySignature === meta.normalizationPolicySignature
      && meta.purchaseOrderReview?.confirmed === true
      && meta.purchaseOrderReview.binding === signature({ source: meta.sourceSignature, mappingSignature: mappedSignature, normalizationPolicySignature: meta.normalizationPolicySignature });
  }
  function buildModel({ inventoryPackage, poPackage, inventoryRows = [], cases = [] } = {}) {
    const inventoryIdentity = packageBinding(inventoryPackage), poIdentity = packageBinding(poPackage);
    const currentSignature = signature({ version: "po-relationship-v1", inventory: inventoryIdentity, po: poIdentity });
    const indexed = entities.indexInventoryEntities(inventoryRows);
    const sourceValid = validSource(poPackage);
    const inventoryKeys = new Set(Object.values(inventoryPackage?.relationshipKeys || {}).flat());
    const inventoryValid = Boolean(inventoryPackage?.packageId && Number.isInteger(inventoryPackage.revision) && inventoryPackage.revision > 0 && inventoryKeys.has("material_id") && inventoryKeys.has("plant"));
    const rows = (poPackage?.buildData?.packageRows || []).map(row => {
      const entity = indexed.byEntityKey.get(entities.entityKey(row.material_id, row.plant));
      let status = !sourceValid || !inventoryValid ? "invalid_source" : !row.usable ? "excluded" : !entity ? "unmatched" : "matched";
      if (status === "matched") {
        if (entity.materialId !== row.material_id || entity.plant !== row.plant
          || entity.rows.some(sourceRow => text(sourceRow.material_id) !== row.material_id || text(sourceRow.plant) !== row.plant)) status = "ambiguous";
        else if (entity.inventoryUnitMissing || entity.inventoryUnitConflict || !row.base_unit || unit(entity.inventoryUnit) !== unit(row.base_unit)) status = "unit_conflict";
      }
      const caseIds = status === "matched" ? cases.filter(item =>
        text(item.material_id) === entity.materialId && text(item.plant || item.source_row?.plant) === entity.plant
      ).map(item => item.case_id).filter(Boolean) : [];
      return { ...clone(row), link_status: status, case_ids: [...new Set(caseIds)], inventory_entity_key: status === "matched" ? entity.inventoryEntityKey : "",
        backup_context: root.purchaseOrders.backup?.captureContext(row, inventoryPackage, poPackage, entity, cases.filter(item => caseIds.includes(item.case_id))),
        inventory_row_keys: status === "matched" ? [...entity.rowKeys] : [],
        source: { ...poIdentity, sourceLabel: poPackage?.sourceDescriptor?.sourceLabel || "", importedAt: poPackage?.freshness?.importedAt || "", classification: poPackage?.sourceDescriptor?.classification || "user-upload" },
        inventory_source: inventoryIdentity, current_signature: currentSignature };
    });
    return { version: "po-relationship-v1", signature: currentSignature, sourceValid, inventoryValid, rows, poIdentity, inventoryIdentity };
  }
  function createReviewService({ clock = () => new Date().toISOString(), restoreFault = null } = {}) {
    let reviews = new Map(), editorEpoch = 0;
    const restorePreviews = new WeakMap();
    const feedbackEditors = new WeakMap();
    const backup = () => root.purchaseOrders.backup;
    function handoff({ model, caseRecord, actionRow, positionIds = [] } = {}) {
      if (!caseRecord?.case_id || !actionRow || !model?.sourceValid || !positionIds.length) return { status: "blocked" };
      const selected = [...new Set(positionIds)].map(id => model.rows.find(row => row.position_id === id && row.link_status === "matched" && row.case_ids.includes(caseRecord.case_id)));
      if (selected.some(row => !row)) return { status: "blocked" };
      const key = signature([model.inventoryIdentity?.datasetId, caseRecord.case_id]);
      const record = reviews.get(key) || { review_id: key, case_id: caseRecord.case_id, material_id: caseRecord.material_id,
        inventory_dataset_id: model.inventoryIdentity?.datasetId, action_row_number: actionRow.row_number,
        inventory_row_keys: selected[0].inventory_row_keys, request: "review_supply_commitment", sessionOnly: true, positions: [] };
      let added = 0;
      selected.forEach(row => {
        if (!record.positions.some(old => old.position_id === row.position_id)) {
          record.positions.push(clone(row)); added += 1;
        }
      });
      reviews.set(key, record);
      return { status: "ready", added, review: clone(record) };
    }
    function list(model) {
      return [...reviews.values()].map(record => ({ ...clone(record), positions: record.positions.map(row => ({
        ...clone(row), decision: clone(row.decision || emptyDecision()), source_status: sourceState(model, record, row),
        decision_source_states: versionSourceStates(model, record, row),
        currently_documented: sourceState(model, record, row) === "current" && row.decision?.work_state === "documented",
        review_state: sourceState(model, record, row) === "current" ? "current" : "stale"
      })) }));
    }
    function beginDecision({ model, reviewId, positionId, recheck = false } = {}) {
      const record = reviews.get(reviewId), row = record?.positions.find(item => item.position_id === positionId);
      if (!row) return { status: "blocked", errors: ["position_missing"] };
      const current = currentPosition(model, record, row), state = sourceState(model, record, row);
      if (recheck && !current) return { status: "blocked", errors: ["unassignable"] };
      const source = recheck ? current : row;
      return { status: "ready", editor: { review_id: reviewId, position_id: positionId, case_id: record.case_id, source_status: state,
        record_version: row.decision_version || 0, editor_epoch: editorEpoch, prior_binding: sourceToken(row), edit_binding: sourceToken(source),
        requires_confirmation: recheck && state !== "current", recheck, source_snapshot: clone(source), current_source: current ? clone(current) : null, previous_source: clone(row),
        values: clone(row.decision || emptyDecision()), history: clone(row.decision_history || []), feedback: clone(row.feedback || []), version_source_states: versionSourceStates(model, record, row) } };
    }
    function saveDecision({ model, editor, input = {}, confirmed = false } = {}) {
      const record = reviews.get(editor?.review_id), row = record?.positions.find(item => item.position_id === editor?.position_id);
      if (!row) return { status: "blocked", errors: ["position_missing"] };
      if (editor.editor_epoch !== editorEpoch || (row.decision_version || 0) !== editor.record_version || sourceToken(row) !== editor.prior_binding) return { status: "blocked", errors: ["edit_conflict"] };
      const current = currentPosition(model, record, row);
      if (!current) return { status: "blocked", errors: ["unassignable"] };
      if (sourceToken(current) !== editor.edit_binding) return { status: "blocked", errors: ["source_changed"] };
      const changedSource = sourceToken(row) !== sourceToken(current);
      if (changedSource && (!editor.recheck || confirmed !== true)) return { status: "blocked", errors: ["recheck_required"] };
      const { decision, errors } = validateDecision(input, current);
      if (errors.length) return { status: "blocked", errors };
      const old = row.decision || emptyDecision();
      const content = value => ({ ...value, updated_at: "", documented_at: "" });
      if (!changedSource && signature(content(old)) === signature(content(decision))) return { status: "ready", unchanged: true };
      const history = clone(row.decision_history || []);
      if (old.work_state === "documented") history.push({ decision: clone(old), source: clone({ ...row, decision: undefined, decision_history: undefined, backup_record: undefined, feedback: undefined }), version: row.decision_version,
        ...(row.backup_record ? { backup_version: { version: row.backup_record.version, decision: clone(old), accepted: clone(row.backup_record.accepted) } } : {}) });
      decision.updated_at = clock();
      decision.documented_at = decision.work_state === "documented" ? decision.updated_at : "";
      // Editing work never mutates package/source fields. Rebinding is an explicit reviewed transition.
      const next = { ...clone(current), decision, decision_version: (row.decision_version || 0) + 1, decision_history: history, ...(row.feedback ? { feedback: clone(row.feedback) } : {}) };
      record.positions[record.positions.indexOf(row)] = next;
      return { status: "ready", unchanged: false, decision: clone(decision) };
    }
    async function beginFeedback({ model, reviewId, positionId, version, correctsId = "" } = {}) {
      const record = reviews.get(reviewId), row = record?.positions.find(item => item.position_id === positionId);
      if (!row) return { status: "blocked", errors: ["position_missing"] };
      try {
        const token = signature(row), epoch = editorEpoch, item = await backup().entry(record, row);
        // Validate the stored historical identity, not today's possibly absent PO source.
        await backup().encode([item], clock());
        const target = await backup().feedbackTarget(item, version), old = item.feedback.find(report => report.id === correctsId);
        if (correctsId && (!old || signature(old.target) !== signature(target) || item.feedback.some(report => report.corrects_id === correctsId))) throw new Error("backup_feedback_invalid");
        if (epoch !== editorEpoch || signature(reviews.get(reviewId)?.positions.find(item => item.position_id === positionId) || null) !== token) throw new Error("edit_conflict");
        const historical = backup().documentedVersions(item).find(old => old.version === version);
        const historicalSource = sourceForVersion(row, version);
        if (!historicalSource) throw new Error("backup_feedback_invalid");
        const current = currentPosition(model, record, historicalSource);
        const editor = { review_id: reviewId, position_id: positionId, target, historical: clone(historical), identity: clone(item.identity),
          source_status: sourceState(model, record, historicalSource), current_source: current ? clone(current) : null,
          values: { ...Object.fromEntries(FEEDBACK_FIELDS.map(key => [key, old?.[key] || ""])), corrects_id: correctsId, correction_reason: "" } };
        feedbackEditors.set(editor, { reviewId, positionId, token, epoch, target: clone(target), correctsId, direction: historical.decision.direction });
        return { status: "ready", editor };
      } catch (error) { return { status: "blocked", errors: [error.message === "edit_conflict" ? "edit_conflict" : "feedback_identity_invalid"] }; }
    }
    function saveFeedback({ editor, input = {} } = {}) {
      const pending = feedbackEditors.get(editor);
      if (!pending) return { status: "blocked", errors: ["edit_conflict"] };
      const checked = validateFeedback({ ...input, corrects_id: pending.correctsId }, pending.direction);
      if (checked.errors.length) return { status: "blocked", errors: checked.errors };
      const content = signature(checked.values);
      const record = reviews.get(pending.reviewId), row = record?.positions.find(item => item.position_id === pending.positionId);
      if (!row || pending.epoch !== editorEpoch) return { status: "blocked", errors: ["edit_conflict"] };
      // Repeated submit of one successful editor operation is idempotent, never a second report.
      if (pending.saved) return content === pending.content ? { status: "ready", unchanged: true, id: pending.saved } : { status: "blocked", errors: ["edit_conflict"] };
      if (signature(row) !== pending.token) return { status: "blocked", errors: ["edit_conflict"] };
      if ((row.feedback || []).length >= 500 || [...reviews.values()].reduce((n,r) => n+r.positions.reduce((s,p) => s+(p.feedback || []).length,0),0) >= 10000) return { status: "blocked", errors: ["backup_limit"] };
      const id = global.crypto.randomUUID(), recordedAt = new Date(clock()).toISOString();
      const report = { id, target: clone(pending.target), ...checked.values, recorded_at: recordedAt };
      row.feedback = [...(row.feedback || []), report];
      pending.saved = id; pending.content = content;
      return { status: "ready", id };
    }
    const stateToken = () => signature([...reviews.entries()]);
    const modelToken = model => signature(model);
    async function portableEntries() {
      const entries = [];
      for (const record of reviews.values()) for (const row of record.positions) entries.push(await backup().entry(record, row));
      return entries.sort((a, b) => a.id.localeCompare(b.id));
    }
    async function createBackup() {
      const before = stateToken(), entries = await portableEntries();
      const json = await backup().encode(entries, clock());
      if (stateToken() !== before) throw new Error("backup_preview_changed");
      return { json, counts: backupCounts(entries) };
    }
    function backupCounts(entries) {
      return { total: entries.length, documented: entries.filter(item => item.decision?.work_state === "documented").length,
        drafts: entries.filter(item => item.decision?.work_state !== "documented").length, history: entries.reduce((n, item) => n + item.history.length, 0) };
    }
    async function resolveEntry(item, model) {
      if (!model?.sourceValid || !model.inventoryValid) return { state: "unassignable" };
      const identity = item.identity;
      const rows = model.rows.filter(row => row.purchase_order === identity.purchase_order && row.purchase_order_item === identity.purchase_order_item && text(row.source_system) === identity.source_system);
      if (rows.length !== 1) return { state: "unassignable" };
      const row = rows[0];
      if (row.link_status !== "matched" || row.material_id !== identity.material_id || row.plant !== identity.plant) return { state: "unassignable" };
      const cases = row.backup_context?.cases.filter(candidate => candidate.key === identity.case_key) || [];
      if (cases.length !== 1 || !row.case_ids.includes(cases[0].case_id)) return { state: "unassignable" };
      const caseContext = cases[0];
      let current;
      try { current = await backup().accepted(row, caseContext.case_id); } catch { return { state: "unassignable" }; }
      const identical = signature(current.proof) === signature(item.accepted.proof) && signature(current.values) === signature(item.accepted.values);
      // Imported currency/currentness flags never participate in this decision.
      const valid = item.decision?.work_state !== "documented" || !validateDecision(item.decision, row).errors.length;
      return { state: identical && valid ? "current" : "stale", row, caseContext };
    }
    async function previewRestore({ json, model, reassociate = false } = {}) {
      try {
        const before = stateToken(), sources = modelToken(model), entries = await backup().decode(json), existing = await portableEntries();
        const locations = [];
        for (const record of reviews.values()) for (const row of record.positions) locations.push({ record, row, item: await backup().entry(record, row) });
        const summaries = [], plans = [];
        for (const incoming of entries) {
          let item = incoming;
          const matches = locations.filter(location => location.item.id === item.id), resolved = await resolveEntry(item, model);
          // Additive feedback union only on exactly the same decision history. Never erase local reports (including v1 imports).
          let feedbackConflict = false;
          const withoutFeedback = value => ({ ...value, feedback: [] });
          if (matches.length === 1 && signature(withoutFeedback(matches[0].item)) === signature(withoutFeedback(item))) {
            const merged = clone(matches[0].item.feedback);
            for (const report of item.feedback) {
              const old = merged.find(old => old.id === report.id);
              if (old && signature(old) !== signature(report)) feedbackConflict = true;
              if (!old) merged.push(clone(report));
            }
            item = { ...item, feedback: merged };
            try { await backup().validateFeedback(item); } catch { feedbackConflict = true; }
          }
          const same = matches.length === 1 && signature(matches[0].item) === signature(item);
          const operationalCollision = resolved.row && locations.some(location => location.item.id !== item.id
            && location.record.inventory_dataset_id === model.inventoryIdentity.datasetId && location.record.case_id === resolved.caseContext.case_id
            && location.row.position_id === resolved.row.position_id);
          const sameBasis = matches.length === 1 && signature(withoutFeedback(matches[0].item)) === signature(withoutFeedback(item));
          const state = feedbackConflict || operationalCollision || (matches.length && !sameBasis) ? "conflict" : same && !reassociate ? "identical" : resolved.state;
          summaries.push({ id: item.id, order: item.identity.purchase_order, position: item.identity.purchase_order_item, material: item.identity.material_id, plant: item.identity.plant, state, source_state: resolved.state });
          plans.push({ item, resolved, existing: matches[0], skip: state === "identical" || state === "conflict" });
        }
        if (!summaries.some(item => item.state === "conflict")) {
          const combined = [...existing.filter(old => !plans.some(plan => plan.item.id === old.id)), ...plans.map(plan => plan.item)];
          await backup().encode(combined, clock());
        }
        if (before !== stateToken() || sources !== modelToken(model) || signature(existing) !== signature(await portableEntries())) throw new Error("backup_preview_changed");
        const preview = Object.freeze({ status: summaries.some(item => item.state === "conflict") ? "conflict" : "ready", counts: backupCounts(entries), rows: summaries });
        restorePreviews.set(preview, { before, sources, plans });
        return preview;
      } catch (error) { return { status: "blocked", errors: [error.message.startsWith("backup_") ? error.message : "backup_structure_invalid"] }; }
    }
    async function previewReassociation(model) {
      return previewRestore({ json: (await createBackup()).json, model, reassociate: true });
    }
    function applyRestore({ preview, model, confirmed = false } = {}) {
      const pending = restorePreviews.get(preview);
      if (!pending || preview.status !== "ready" || confirmed !== true) return { status: "blocked", errors: ["backup_confirmation_required"] };
      restorePreviews.delete(preview);
      if (pending.before !== stateToken() || pending.sources !== modelToken(model)) return { status: "blocked", errors: ["backup_preview_changed"] };
      const previous = reviews;
      try {
        const next = new Map(clone([...reviews.entries()])); let added = 0;
        for (const plan of pending.plans) {
          if (plan.skip) continue;
          const { item, resolved } = plan;
          if (plan.existing) {
            const old = next.get(plan.existing.record.review_id);
            old.positions = old.positions.filter(row => row.position_id !== plan.existing.row.position_id);
            if (!old.positions.length) next.delete(old.review_id);
          }
          const attached = resolved.state !== "unassignable", caseId = attached ? resolved.caseContext.case_id : "";
          const datasetId = attached ? model.inventoryIdentity.datasetId : "";
          const key = attached ? signature([datasetId, caseId]) : "restored:" + item.id;
          const record = next.get(key) || { review_id: key, case_id: caseId, material_id: item.identity.material_id, inventory_dataset_id: datasetId,
            action_row_number: attached ? resolved.caseContext.action_row_number : null, inventory_row_keys: attached ? clone(resolved.row.inventory_row_keys) : [],
            request: "review_supply_commitment", sessionOnly: true, positions: [] };
          const row = resolved.state === "current" ? clone(resolved.row) : backup().restoredRow(item);
          if (record.positions.some(old => old.position_id === row.position_id)) throw new Error("backup_conflict");
          row.backup_record = clone(item);
          if (Object.prototype.hasOwnProperty.call(item, "decision")) row.decision = clone(item.decision);
          row.decision_version = item.version;
          row.feedback = clone(item.feedback);
          row.decision_history = item.history.map(old => ({ version: old.version, decision: clone(old.decision), source: backup().restoredRow(item, old.accepted), backup_version: clone(old) }));
          record.positions.push(row); next.set(key, record); added++;
        }
        if (!added) return { status: "ready", unchanged: true, added: 0 };
        reviews = next;
        if (global.__OBSOLIQ_TEST_MODE__ === true && typeof restoreFault === "function") restoreFault();
        editorEpoch++;
        return { status: "ready", added };
      } catch {
        reviews = previous;
        return { status: "blocked", errors: ["backup_apply_failed"] };
      }
    }
    return Object.freeze({ handoff, list, beginDecision, saveDecision, beginFeedback, saveFeedback, createBackup, previewRestore, previewReassociation, applyRestore,
      snapshot: () => clone([...reviews.entries()]), restore: snapshot => { const next = new Map((snapshot || []).map(([k,v]) => [k,clone(v)])); reviews = next; editorEpoch++; } });
  }
  function caseEvidence(model, caseId) {
    const rows = model.rows.filter(row => row.link_status === "matched" && row.case_ids.includes(caseId));
    return { version: "po-package-evidence-v1", state: rows.length ? "concrete" : "no_case_evidence",
      evidenceSource: rows.length ? "purchase_orders_package" : "none", standalonePackageImportSupported: true,
      evidence: rows.map(row => ({ key: "purchase_order_item", value: row.purchase_order + " / " + row.purchase_order_item,
        positionId: row.position_id, sourcePackageId: row.source.packageId, sourceRevision: row.source.revision,
        sourceRowIndex: row.source_row_index, mappingSignature: row.source.mapping, policySignature: row.source.policy })) };
  }
  function exportReviews(reviews, actionRows = [], datasetId = "") {
    return reviews.flatMap(review => review.positions.map(row => ({
      review_id: review.review_id, case_id: review.case_id, action_row_number: review.action_row_number,
      action_status: datasetId === review.inventory_dataset_id ? actionRows.find(action => action.row_number === review.action_row_number)?.status || "" : "",
      review_state: row.review_state, request: review.request, position_id: row.position_id,
      decision_direction: row.decision?.direction || "", decision_reason: row.decision?.reason || "", decision_work_state: row.decision?.work_state || "open",
      decision_owner: row.decision?.owner || "", review_date: row.decision?.review_date || "", requested_reduction_quantity: row.decision?.reduction_quantity ?? null,
      requested_reduction_unit: row.decision?.direction === "request_reduction" ? row.base_unit : "", requested_delivery_date: row.decision?.requested_delivery_date || "",
      evidence_type: row.decision?.evidence_type || "", evidence_reference: row.decision?.evidence_reference || "", evidence_date: row.decision?.evidence_date || "",
      decision_updated_at: row.decision?.updated_at || "", decision_documented_at: row.decision?.documented_at || "", source_status: row.source_status,
      currently_documented: row.currently_documented === true, decision_version: row.decision_version || 0,
      documented_history: JSON.stringify((row.decision_history || []).map(entry => ({ ...entry, source: { ...entry.source, backup_context: undefined } }))), export_scope: "All session PO review positions, including stale decisions and prior documented versions",
      purchase_order: row.purchase_order, purchase_order_item: row.purchase_order_item,
      material_id: row.material_id, plant: row.plant, open_quantity: row.open_quantity, base_unit: row.base_unit,
      delivery_date: row.delivery_date, delivery_date_status: row.delivery_date_status,
      supplier: row.supplier, buyer: row.buyer, item_status: row.item_status, open_value: row.open_value, value_status: row.value_status, source_currency: row.source_currency,
      source_package_id: row.source.packageId, source_revision: row.source.revision, source_row_index: row.source_row_index,
      source_file: row.source.sourceLabel, source_classification: row.source.classification, source_mapping_signature: row.source.mapping,
      source_policy_signature: row.source.policy, inventory_package_id: row.inventory_source?.packageId,
      inventory_revision: row.inventory_source?.revision, inventory_entity_key: row.inventory_entity_key,
      constraints: "No cancellable quantity or savings calculated; check future demand, supplier commitment, cancellation terms and supply safety.",
      session_only: true
    })));
  }
  function exportFeedback(reviews) {
    return reviews.flatMap(record => record.positions.flatMap(row => (row.feedback || []).map(report => {
      const old = row.decision_version === report.target.decision_version ? { decision: row.decision, source: row, backup_version: row.backup_record }
        : (row.decision_history || []).find(old => old.version === report.target.decision_version);
      const acceptedSource = old?.backup_version?.accepted?.source || old?.source?.source || {};
      return {
      review_id: record.review_id, case_id: record.case_id, position_id: row.position_id, purchase_order: row.purchase_order,
      purchase_order_item: row.purchase_order_item, material_id: row.material_id, plant: row.plant,
      decision_version: report.target.decision_version, entry_id: report.target.entry_id, decision_signature: report.target.decision_signature,
      documented_direction: old?.decision?.direction || "", documented_reason: old?.decision?.reason || "", documented_at: old?.decision?.documented_at || "",
      requested_reduction_quantity: old?.decision?.reduction_quantity ?? null, requested_delivery_date: old?.decision?.requested_delivery_date || "",
      accepted_source_package_id: acceptedSource.packageId || "", accepted_source_revision: acceptedSource.revision ?? null,
      historical_source_status: row.decision_source_states?.[report.target.decision_version] || "unassignable",
      ...Object.fromEntries(Object.entries(report).filter(([key]) => key !== "target")),
      correction_state: row.feedback.some(next => next.corrects_id === report.id) ? "superseded" : "recorded",
      current_source_status: row.source_status, export_scope: "All session human reports; one row per report; no financial amounts",
      constraints: "Reported, not verified implementation. Recorded reference is not authenticated evidence. No savings or action-status change."
    }; })));
  }
  root.purchaseOrders.reviewService = Object.freeze({ buildModel, validSource, packageBinding, createReviewService, caseEvidence, exportReviews, exportFeedback, validateDecision, validateFeedback, feedbackKinds, FEEDBACK_FIELDS, DECISION_TYPES, WORK_STATES });
})(window);
