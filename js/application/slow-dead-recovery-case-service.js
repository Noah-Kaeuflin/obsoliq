(function registerSlowDeadRecoveryCaseService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const SERVICE_MODEL_VERSION = "slow-dead-recovery-case-service-v1";
  const RUNTIME_MODEL_VERSION = "slow-dead-recovery-case-runtime-v1";

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function sumNumbers(rows = [], key) {
    return rows.reduce((total, row) => total + (finiteNumber(row?.[key]) || 0), 0);
  }

  function firstMeaningful(rows = [], keys = []) {
    for (const row of rows) {
      for (const key of keys) {
        const value = row?.[key];
        if (value !== null && value !== undefined && normalizeText(value)) return value;
      }
    }
    return "";
  }

  function boolLike(value) {
    if (value === true) return true;
    if (value === false || value === null || value === undefined) return false;
    return ["true", "yes", "y", "1", "ja", "x"].includes(normalizeText(value).toLowerCase());
  }

  function rowKey(row = {}, index = 0) {
    return String(row.inventory_row_key || row.inventoryRowKey || `INV-${row.__sourceRowIndex || row.row_number || index + 1}`);
  }

  function packageRevision(packageRecord = {}) {
    return Number(packageRecord?.revision || packageRecord?.packageRevision || 0) || 0;
  }

  function packageIdentity(packageRecord = {}) {
    return {
      packageId: packageRecord?.packageId || "",
      packageType: packageRecord?.packageType || "",
      datasetId: packageRecord?.datasetId || "",
      revision: packageRevision(packageRecord)
    };
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function runtimeResult(runtime = null) {
    return runtime?.result || runtime || null;
  }

  function runtimeStatus(runtime = null) {
    return runtime?.status
      || runtime?.historicalMetricsRuntimeStatus
      || runtime?.result?.status
      || runtime?.result?.historicalMetricsRuntimeStatus
      || "unavailable";
  }

  function entityArray(input = {}, relationshipResult = {}) {
    if (Array.isArray(input.inventoryEntities)) return cloneData(input.inventoryEntities);
    if (input.inventoryEntitiesByKey && typeof input.inventoryEntitiesByKey === "object") return Object.values(cloneData(input.inventoryEntitiesByKey));
    if (relationshipResult.inventoryEntitiesByKey && typeof relationshipResult.inventoryEntitiesByKey === "object") return Object.values(cloneData(relationshipResult.inventoryEntitiesByKey));
    return [];
  }

  function rowIndex(rows = []) {
    const index = new Map();
    rows.forEach((row, position) => index.set(rowKey(row, position), row));
    return index;
  }

  function rowsForEntity(entity = {}, rowsByKey = new Map()) {
    if (Array.isArray(entity.rows) && entity.rows.length) return cloneData(entity.rows);
    return (entity.rowKeys || [])
      .map(key => rowsByKey.get(key))
      .filter(Boolean)
      .map(row => cloneData(row));
  }

  function relationshipDiagnosticsByEntity(relationshipResult = {}) {
    const index = {};
    (relationshipResult.unmatchedInventoryEntities || []).forEach(item => {
      index[item.inventoryEntityKey] = { relationshipState: "unmatched", reason: item.reason || "unmatched" };
    });
    (relationshipResult.ambiguousRelationships || []).forEach(item => {
      index[item.inventoryEntityKey] = { relationshipState: "ambiguous", reason: item.reason || "ambiguous" };
    });
    (relationshipResult.invalidKeyRelationships || []).forEach(item => {
      index[item.inventoryEntityKey] = { relationshipState: "invalid_key", reason: item.reason || "invalid_key" };
    });
    return index;
  }

  function relationshipEvidenceFor(entity = {}, relationshipResult = {}) {
    const match = relationshipResult.matchesByInventoryEntityKey?.[entity.inventoryEntityKey] || null;
    if (match) return cloneData(match);
    return relationshipDiagnosticsByEntity(relationshipResult)[entity.inventoryEntityKey] || {
      relationshipState: "unmatched",
      reason: "relationship_missing"
    };
  }

  function inventoryEvidenceFor(entity = {}, rows = []) {
    const stockQuantity = finiteNumber(entity.stockQuantity);
    return {
      inventory_entity_key: entity.inventoryEntityKey || "",
      inventory_row_keys: [...(entity.rowKeys || rows.map(rowKey))],
      material_id: entity.materialId || firstMeaningful(rows, ["material_id", "material"]),
      material_description: firstMeaningful(rows, ["material_description", "description", "material_text"]),
      plant: entity.plant || firstMeaningful(rows, ["plant", "profit_center"]),
      profit_center: firstMeaningful(rows, ["profit_center", "plant"]),
      program: firstMeaningful(rows, ["program", "group", "material_group"]),
      stock_quantity: stockQuantity !== null ? stockQuantity : sumNumbers(rows, "stock_quantity"),
      stock_unit: entity.inventoryUnit || firstMeaningful(rows, ["base_unit", "inventory_unit", "stock_unit"]),
      stock_value: sumNumbers(rows, "stock_value"),
      currency: firstMeaningful(rows, ["currency", "currency_code"]) || "EUR",
      excess_value: sumNumbers(rows, "excess_value"),
      no_need_value: sumNumbers(rows, "no_need_value"),
      no_plan_value: sumNumbers(rows, "no_plan_value"),
      bad_stock_value: sumNumbers(rows, "bad_stock_value"),
      blocked_quality_value: sumNumbers(rows, "bad_stock_value"),
      recovery_potential: sumNumbers(rows, "recovery_potential"),
      category: firstMeaningful(rows, ["category", "primary_category"]),
      planning_type: firstMeaningful(rows, ["planning_type"]),
      safety_stock_target: firstMeaningful(rows, ["safety_stock_target", "safety_stock"]),
      minimum_order_quantity: firstMeaningful(rows, ["minimum_order_quantity", "minimum_lot_size"]),
      finance_classification: firstMeaningful(rows, ["finance_classification"]),
      status_safety: firstMeaningful(rows, ["status_safety"]),
      supply_type: firstMeaningful(rows, ["supply_type"]),
      lifecycle_status: firstMeaningful(rows, ["lifecycle_status", "material_status"]),
      strategic_reserve: firstMeaningful(rows, ["strategic_reserve", "reserve_status"]),
      open_purchase_order_value: firstMeaningful(rows, ["open_purchase_order_value", "open_po_value", "purchase_order_value"]),
      purchase_order: firstMeaningful(rows, ["purchase_order", "purchase_order_number", "po_number"]),
      inventory_unit_conflict: entity.inventoryUnitConflict === true
    };
  }

  function independentSignalsFor(inventoryEvidence = {}, rows = [], externalSignals = {}) {
    return {
      noDemand: finiteNumber(inventoryEvidence.no_need_value) > 0 || boolLike(externalSignals.noDemand),
      noPlan: finiteNumber(inventoryEvidence.no_plan_value) > 0 || boolLike(externalSignals.noPlan),
      lifecycleEnding: boolLike(externalSignals.lifecycleEnding) || rows.some(row => /obsolete|discontinued|phase.?out|program.?end|auslauf|totbestand/i.test([
        row.lifecycle_status,
        row.material_status,
        row.finance_classification,
        row.status_safety
      ].join(" "))),
      strategicReserve: boolLike(externalSignals.strategicReserve) || boolLike(inventoryEvidence.strategic_reserve),
      openPurchaseOrder: Boolean(normalizeText(inventoryEvidence.purchase_order) || finiteNumber(inventoryEvidence.open_purchase_order_value) > 0 || boolLike(externalSignals.openPurchaseOrder)),
      transferDestinationConsumption: boolLike(externalSignals.transferDestinationConsumption),
      sameMaterialOtherContext: boolLike(externalSignals.sameMaterialOtherContext)
    };
  }

  function materialMasterContextFor(entity = {}, input = {}, rows = []) {
    const byEntity = input.materialMasterContextByInventoryEntityKey || {};
    const byMaterial = input.materialMasterContextByMaterialId || {};
    return cloneData(
      byEntity[entity.inventoryEntityKey]
      || byMaterial[entity.materialId]
      || rows.find(row => row.__obsoliq_enrichment)?.__obsoliq_enrichment
      || {}
    );
  }

  function ownerContextFor(entity = {}, input = {}) {
    return cloneData(input.ownerContextByInventoryEntityKey?.[entity.inventoryEntityKey] || {});
  }

  function conditionInputFor(entity = {}, input = {}, runtime = {}, relationshipResult = {}, rowsByKey = new Map()) {
    const rows = rowsForEntity(entity, rowsByKey);
    const evidence = inventoryEvidenceFor(entity, rows);
    const metric = runtime.historicalMetricsByInventoryEntityKey?.[entity.inventoryEntityKey] || input.historicalMetricsByInventoryEntityKey?.[entity.inventoryEntityKey] || {};
    return {
      inventoryEvidence: evidence,
      historicalEvidence: cloneData(metric),
      relationshipEvidence: relationshipEvidenceFor(entity, relationshipResult),
      materialMasterContext: materialMasterContextFor(entity, input, rows),
      ownerContext: ownerContextFor(entity, input),
      independentSignals: independentSignalsFor(evidence, rows, input.independentSignalsByInventoryEntityKey?.[entity.inventoryEntityKey] || {}),
      historicalRuntime: input.historicalRuntime || runtime,
      entityRows: rows
    };
  }

  function caseIdentity(datasetId, entityKey) {
    return `SLOW-DEAD::${normalizeText(datasetId) || "dataset"}::${normalizeText(entityKey)}`;
  }

  function caseFingerprint(payload = {}) {
    return `slow-dead-case:${hashText(stableJson(payload))}`;
  }

  function caseForCondition(entity = {}, conditionInput = {}, conditionResult = {}, input = {}, runtime = {}, relationshipResult = {}) {
    const inventoryEvidence = conditionInput.inventoryEvidence || {};
    const inventoryPackage = packageIdentity(input.inventoryPackage || {});
    const historyPackage = packageIdentity(input.historyPackage || {});
    const datasetId = inventoryPackage.datasetId || input.datasetId || "dataset";
    const id = caseIdentity(datasetId, entity.inventoryEntityKey);
    const fingerprintPayload = {
      id,
      entityKey: entity.inventoryEntityKey,
      conditionCode: conditionResult.condition_code,
      conditionSignature: conditionResult.condition_signature,
      inventoryPackage,
      historyPackage,
      serviceModelVersion: SERVICE_MODEL_VERSION
    };
    return {
      case_id: id,
      case_fingerprint: caseFingerprint(fingerprintPayload),
      primary_category: "slow_dead",
      condition_code: conditionResult.condition_code,
      condition_status: conditionResult.condition_status,
      evidence_strength: conditionResult.evidence_strength,
      condition_confidence: conditionResult.condition_confidence,
      inventory_entity_key: entity.inventoryEntityKey || "",
      inventory_row_keys: [...(inventoryEvidence.inventory_row_keys || entity.rowKeys || [])],
      material_id: inventoryEvidence.material_id || entity.materialId || "",
      material_description: inventoryEvidence.material_description || "",
      plant: inventoryEvidence.plant || entity.plant || "",
      profit_center: inventoryEvidence.profit_center || "",
      program: inventoryEvidence.program || "",
      stock_quantity: finiteNumber(inventoryEvidence.stock_quantity),
      stock_unit: inventoryEvidence.stock_unit || "",
      stock_value: finiteNumber(inventoryEvidence.stock_value) || 0,
      currency: inventoryEvidence.currency || "EUR",
      recovery_potential_input: finiteNumber(inventoryEvidence.recovery_potential) || 0,
      positive_evidence: cloneData(conditionResult.positive_evidence || []),
      counter_evidence: cloneData(conditionResult.counter_evidence || []),
      limitation_codes: cloneData(conditionResult.limitation_codes || []),
      missing_evidence: cloneData(conditionResult.missing_evidence || []),
      root_cause_candidates: cloneData(conditionResult.root_cause_candidates || []),
      recovery_case_eligibility: cloneData(conditionResult.recovery_case_eligibility || {}),
      action_eligibility: cloneData(conditionResult.action_eligibility || []),
      required_data_packages: cloneData(conditionResult.required_data_packages || []),
      slow_moving_drivers: cloneData(conditionResult.slow_moving_drivers || []),
      independent_dead_stock_signal: conditionResult.independent_dead_stock_signal === true,
      strategic_reserve_signal: conditionResult.strategic_reserve_signal === true,
      provenance: {
        service_model_version: SERVICE_MODEL_VERSION,
        runtime_model_version: RUNTIME_MODEL_VERSION,
        condition_model_version: conditionResult.model_versions?.condition_model || "",
        condition_policy_version: conditionResult.model_versions?.condition_policy || "",
        root_cause_model_version: conditionResult.model_versions?.root_cause_model || "",
        action_eligibility_version: conditionResult.model_versions?.action_eligibility || "",
        inventoryPackage,
        historyPackage,
        historicalMetricsInputSignature: runtime.historicalMetricsInputSignature || input.historicalRuntime?.completedInputSignature || "",
        historicalRuntimeCompletedInputSignature: input.historicalRuntime?.completedInputSignature || "",
        relationshipSignature: relationshipResult.relationshipSignature || "",
        relationshipModelVersion: relationshipResult.relationshipModelVersion || "",
        relationshipMatchType: conditionInput.relationshipEvidence?.matchType || conditionInput.relationshipEvidence?.relationshipState || "",
        historicalMetricModelVersion: runtime.historicalMetricModelVersion || "",
        inventoryRowKeys: [...(inventoryEvidence.inventory_row_keys || [])],
        caseInputSignature: input.inputSignature || "",
        evaluatedAt: input.evaluatedAt || new Date().toISOString()
      }
    };
  }

  function summaryFor(cases = [], evaluatedEntityCount = 0) {
    const conditionCounts = {};
    const evidenceStrengthCounts = {};
    const confidenceCounts = {};
    const eligibilityCounts = {};
    const stockValueByCondition = {};
    const quantityByConditionAndUnit = {};
    cases.forEach(item => {
      conditionCounts[item.condition_code] = (conditionCounts[item.condition_code] || 0) + 1;
      evidenceStrengthCounts[item.evidence_strength] = (evidenceStrengthCounts[item.evidence_strength] || 0) + 1;
      confidenceCounts[item.condition_confidence] = (confidenceCounts[item.condition_confidence] || 0) + 1;
      const eligibility = item.recovery_case_eligibility?.eligibility || "unknown";
      eligibilityCounts[eligibility] = (eligibilityCounts[eligibility] || 0) + 1;
      stockValueByCondition[item.condition_code] = (stockValueByCondition[item.condition_code] || 0) + (finiteNumber(item.stock_value) || 0);
      const quantityKey = `${item.condition_code}|${item.stock_unit || ""}`;
      quantityByConditionAndUnit[quantityKey] = (quantityByConditionAndUnit[quantityKey] || 0) + (finiteNumber(item.stock_quantity) || 0);
    });
    return {
      evaluatedEntityCount,
      caseCount: cases.length,
      conditionCounts,
      evidenceStrengthCounts,
      confidenceCounts,
      eligibilityCounts,
      stockValueByCondition,
      quantityByConditionAndUnit
    };
  }

  function serviceInputSignature(input = {}, conditionEngine = null) {
    const runtime = runtimeResult(input.historicalRuntime || {});
    const relationshipResult = input.relationshipResult || runtime.inventoryHistoryRelationshipResult || {};
    const entities = entityArray(input, relationshipResult);
    return `slow-dead-recovery-cases:${SERVICE_MODEL_VERSION}:${stableJson({
      inventoryPackage: packageIdentity(input.inventoryPackage || {}),
      historyPackage: packageIdentity(input.historyPackage || {}),
      historicalMetricsInputSignature: runtime.historicalMetricsInputSignature || input.historicalRuntime?.completedInputSignature || "",
      relationshipSignature: relationshipResult.relationshipSignature || "",
      serviceModelVersion: SERVICE_MODEL_VERSION,
      runtimeModelVersion: RUNTIME_MODEL_VERSION,
      conditionModelVersion: conditionEngine?.getModelVersion?.() || "",
      conditionPolicy: conditionEngine?.getPolicy?.() || {},
      entityKeys: entities.map(entity => entity.inventoryEntityKey).sort()
    })}`;
  }

  function createUnavailableResult(reason, input = {}, conditionEngine = null, startedAt = 0) {
    const inputSignature = serviceInputSignature(input, conditionEngine);
    return {
      status: "unavailable",
      reason,
      serviceModelVersion: SERVICE_MODEL_VERSION,
      runtimeModelVersion: RUNTIME_MODEL_VERSION,
      inputSignature,
      cases: [],
      casesById: {},
      caseIdByInventoryEntityKey: {},
      summary: summaryFor([], 0),
      diagnostics: [{ key: reason, severity: "info" }],
      evaluatedAt: input.evaluatedAt || new Date().toISOString(),
      durationMs: Math.max(0, Date.now() - startedAt)
    };
  }

  function createSlowDeadRecoveryCaseService(dependencies = {}) {
    const conditionEngine = dependencies.conditionEngine;
    if (!conditionEngine) throw new Error("Slow / Dead Recovery Case Service requires a condition engine.");

    function buildSlowDeadRecoveryCases(input = {}) {
      const startedAt = Date.now();
      const runtime = runtimeResult(input.historicalRuntime || {});
      const relationshipResult = input.relationshipResult || runtime.inventoryHistoryRelationshipResult || {};
      const inventoryRows = Array.isArray(input.inventoryRows) ? cloneData(input.inventoryRows) : [];
      const rowsByKey = rowIndex(inventoryRows);
      const entities = entityArray(input, relationshipResult);
      const runtimeState = runtimeStatus(input.historicalRuntime || runtime);
      const inputSignature = serviceInputSignature(input, conditionEngine);
      if (!entities.length) {
        return createUnavailableResult("inventory_entities_missing", { ...input, inputSignature }, conditionEngine, startedAt);
      }
      const cases = [];
      let evaluatedEntityCount = 0;
      entities.forEach(entity => {
        const conditionInput = conditionInputFor(entity, input, runtime, relationshipResult, rowsByKey);
        const stockValue = finiteNumber(conditionInput.inventoryEvidence.stock_value);
        const stockQuantity = finiteNumber(conditionInput.inventoryEvidence.stock_quantity);
        if (!(stockValue > 0 || stockQuantity > 0)) return;
        evaluatedEntityCount += 1;
        const conditionResult = conditionEngine.evaluateCondition(conditionInput);
        if (!conditionResult.condition_code) return;
        cases.push(caseForCondition(entity, conditionInput, conditionResult, { ...input, inputSignature }, runtime, relationshipResult));
      });
      const status = !["available", "limited"].includes(runtimeState)
        ? "unavailable"
        : cases.some(item => item.condition_code === "insufficient_evidence" || item.evidence_strength === "low")
          || runtimeState === "limited"
          ? "limited"
          : "available";
      const casesById = Object.fromEntries(cases.map(item => [item.case_id, item]));
      const caseIdByInventoryEntityKey = Object.fromEntries(cases.map(item => [item.inventory_entity_key, item.case_id]));
      return {
        status,
        reason: status === "unavailable" ? "historical_runtime_unavailable" : "",
        serviceModelVersion: SERVICE_MODEL_VERSION,
        runtimeModelVersion: RUNTIME_MODEL_VERSION,
        inputSignature,
        cases,
        casesById,
        caseIdByInventoryEntityKey,
        summary: summaryFor(cases, evaluatedEntityCount),
        diagnostics: status === "unavailable" ? [{ key: "historical_runtime_unavailable", severity: "info" }] : [],
        evaluatedAt: input.evaluatedAt || new Date().toISOString(),
        durationMs: Math.max(0, Date.now() - startedAt)
      };
    }

    return Object.freeze({
      version: "1",
      SERVICE_MODEL_VERSION,
      RUNTIME_MODEL_VERSION,
      buildSlowDeadRecoveryCases,
      slowDeadRecoveryCaseInputSignature: input => serviceInputSignature(input, conditionEngine),
      stableJson
    });
  }

  root.application.slowDeadRecoveryCaseService = Object.freeze({
    version: "1",
    SERVICE_MODEL_VERSION,
    RUNTIME_MODEL_VERSION,
    createSlowDeadRecoveryCaseService,
    slowDeadRecoveryCaseInputSignature: serviceInputSignature,
    stableJson
  });
})(window);
