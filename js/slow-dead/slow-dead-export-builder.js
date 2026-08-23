(function registerSlowDeadExportBuilder(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.slowDead = root.slowDead || {};

  const DEFAULT_COLUMNS = Object.freeze([
    "case_id",
    "entity_key",
    "inventory_row_keys",
    "material_id",
    "material_description",
    "plant",
    "profit_center",
    "program",
    "owner_function",
    "owner_reference",
    "owner_reference_field",
    "owner_source",
    "owner_assignment_confidence",
    "condition_code",
    "condition_label",
    "evidence_strength",
    "condition_confidence",
    "inventory_exposure_value",
    "stock_quantity",
    "base_unit",
    "currency",
    "last_consumption",
    "months_since_last_consumption",
    "net_consumption_3m",
    "net_consumption_6m",
    "net_consumption_12m",
    "average_monthly_consumption_12m",
    "active_consumption_months_12m",
    "movement_frequency_12m",
    "history_completeness",
    "history_coverage_months",
    "relationship_state",
    "positive_evidence",
    "counter_evidence",
    "limitation_codes",
    "missing_evidence",
    "root_cause_hypotheses",
    "recovery_case_eligibility",
    "recovery_case_reason_codes",
    "action_eligibility",
    "required_data_packages",
    "independent_dead_stock_signal",
    "strategic_reserve_signal",
    "service_model_version",
    "runtime_model_version",
    "condition_model_version",
    "condition_policy_version",
    "root_cause_model_version",
    "action_eligibility_version",
    "inventory_package_id",
    "inventory_package_type",
    "inventory_package_dataset_id",
    "inventory_package_revision",
    "history_package_id",
    "history_package_type",
    "history_package_dataset_id",
    "history_package_revision",
    "historical_metrics_input_signature",
    "historical_runtime_completed_input_signature",
    "relationship_signature",
    "relationship_model_version",
    "historical_metric_model_version",
    "case_input_signature",
    "evaluated_at"
  ]);

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : "";
  }

  function serializeList(value) {
    return list(value)
      .map(item => {
        if (item && typeof item === "object") {
          if (item.code || item.message) return [item.code, item.message].filter(Boolean).join(": ");
          if (item.action_code || item.label) {
            const packages = list(item.required_data_packages).length ? ` packages=${list(item.required_data_packages).join("+")}` : "";
            return [item.action_code, item.label, item.eligibility_status].filter(Boolean).join(": ") + packages;
          }
          if (item.root_cause_code || item.label) return [item.root_cause_code, item.label, item.confidence].filter(Boolean).join(": ");
          return JSON.stringify(item);
        }
        return text(item);
      })
      .filter(Boolean)
      .join(" | ");
  }

  function serializeCodes(value) {
    return list(value).map(text).filter(Boolean).join(" | ");
  }

  function packageField(packageRecord = {}, key = "") {
    if (!packageRecord || typeof packageRecord !== "object") return "";
    if (key === "revision") return finiteNumber(packageRecord.revision);
    return text(packageRecord[key]);
  }

  function evidenceMetric(caseRecord = {}, key) {
    const view = root.slowDead?.pageModel?.createCaseView?.(caseRecord) || caseRecord;
    return view[key] ?? "";
  }

  function exportValueFor(caseRecord = {}, key = "", options = {}) {
    const view = root.slowDead?.pageModel?.createCaseView?.(caseRecord) || caseRecord;
    const provenance = caseRecord.provenance || {};
    if (key === "entity_key") return text(caseRecord.inventory_entity_key);
    if (key === "inventory_row_keys") return serializeCodes(caseRecord.inventory_row_keys);
    if (key === "condition_label") return options.conditionLabel?.(caseRecord.condition_code) || text(caseRecord.condition_code);
    if (key === "inventory_exposure_value") return view.inventory_exposure_missing ? "" : finiteNumber(view.inventory_exposure_value);
    if (key === "stock_quantity") return finiteNumber(caseRecord.stock_quantity);
    if (key === "base_unit") return text(caseRecord.stock_unit || caseRecord.base_unit);
    if (key === "last_consumption") return text(evidenceMetric(caseRecord, "last_consumption"));
    if (key === "months_since_last_consumption") return finiteNumber(evidenceMetric(caseRecord, "months_since_last_consumption"));
    if (key === "net_consumption_3m") return finiteNumber(evidenceMetric(caseRecord, "net_consumption_3m"));
    if (key === "net_consumption_6m") return finiteNumber(evidenceMetric(caseRecord, "net_consumption_6m"));
    if (key === "net_consumption_12m") return finiteNumber(evidenceMetric(caseRecord, "net_consumption_12m"));
    if (key === "average_monthly_consumption_12m") return finiteNumber(evidenceMetric(caseRecord, "average_monthly_consumption_12m"));
    if (key === "active_consumption_months_12m") return finiteNumber(evidenceMetric(caseRecord, "active_consumption_months_12m"));
    if (key === "movement_frequency_12m") return finiteNumber(evidenceMetric(caseRecord, "movement_frequency_12m"));
    if (key === "history_completeness") return finiteNumber(evidenceMetric(caseRecord, "history_completeness"));
    if (key === "history_coverage_months") return finiteNumber(evidenceMetric(caseRecord, "history_coverage_months"));
    if (key === "relationship_state") return text(view.relationship_state || provenance.relationshipMatchType);
    if (key === "positive_evidence") return serializeList(caseRecord.positive_evidence);
    if (key === "counter_evidence") return serializeList(caseRecord.counter_evidence);
    if (key === "limitation_codes") return serializeCodes(caseRecord.limitation_codes);
    if (key === "missing_evidence") return serializeCodes(caseRecord.missing_evidence);
    if (key === "root_cause_hypotheses") return serializeList(caseRecord.root_cause_candidates);
    if (key === "recovery_case_eligibility") return text(caseRecord.recovery_case_eligibility?.eligibility);
    if (key === "recovery_case_reason_codes") return serializeCodes(caseRecord.recovery_case_eligibility?.reason_codes);
    if (key === "action_eligibility") return serializeList(caseRecord.action_eligibility);
    if (key === "required_data_packages") return serializeCodes(caseRecord.required_data_packages);
    if (key === "independent_dead_stock_signal") return caseRecord.independent_dead_stock_signal === true ? "true" : "false";
    if (key === "strategic_reserve_signal") return caseRecord.strategic_reserve_signal === true ? "true" : "false";
    if (key === "service_model_version") return text(provenance.service_model_version);
    if (key === "runtime_model_version") return text(provenance.runtime_model_version);
    if (key === "condition_model_version") return text(provenance.condition_model_version);
    if (key === "condition_policy_version") return text(provenance.condition_policy_version);
    if (key === "root_cause_model_version") return text(provenance.root_cause_model_version);
    if (key === "action_eligibility_version") return text(provenance.action_eligibility_version);
    if (key === "inventory_package_id") return packageField(provenance.inventoryPackage, "packageId");
    if (key === "inventory_package_type") return packageField(provenance.inventoryPackage, "packageType");
    if (key === "inventory_package_dataset_id") return packageField(provenance.inventoryPackage, "datasetId");
    if (key === "inventory_package_revision") return packageField(provenance.inventoryPackage, "revision");
    if (key === "history_package_id") return packageField(provenance.historyPackage, "packageId");
    if (key === "history_package_type") return packageField(provenance.historyPackage, "packageType");
    if (key === "history_package_dataset_id") return packageField(provenance.historyPackage, "datasetId");
    if (key === "history_package_revision") return packageField(provenance.historyPackage, "revision");
    if (key === "historical_metrics_input_signature") return text(provenance.historicalMetricsInputSignature);
    if (key === "historical_runtime_completed_input_signature") return text(provenance.historicalRuntimeCompletedInputSignature);
    if (key === "relationship_signature") return text(provenance.relationshipSignature);
    if (key === "relationship_model_version") return text(provenance.relationshipModelVersion);
    if (key === "historical_metric_model_version") return text(provenance.historicalMetricModelVersion);
    if (key === "case_input_signature") return text(provenance.caseInputSignature);
    if (key === "evaluated_at") return text(provenance.evaluatedAt || caseRecord.evaluatedAt);
    const value = caseRecord[key] ?? view[key];
    return typeof value === "number" && Number.isFinite(value) ? value : text(value);
  }

  function buildSlowDeadExportRows(input = {}) {
    const cases = list(input.cases);
    const columns = list(input.columns).length ? list(input.columns) : [...DEFAULT_COLUMNS];
    return {
      columns,
      rows: cases.map(caseRecord => columns.map(key => exportValueFor(caseRecord, key, input)))
    };
  }

  root.slowDead.exportBuilder = Object.freeze({
    version: "1",
    DEFAULT_COLUMNS,
    buildSlowDeadExportRows
  });
})(window);
