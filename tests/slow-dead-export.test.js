(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function caseRecord(index, overrides = {}) {
    return {
      case_id: `SLOW-DEAD::EXPORT::ENTITY-${index}`,
      inventory_entity_key: `material:0000${index}|plant:P${index}`,
      inventory_row_keys: [`INV-${index}-A`, `INV-${index}-B`],
      material_id: `0000${index}`,
      material_description: `Export fixture ${index}`,
      plant: `P${index}`,
      profit_center: `PC-${index}`,
      program: `PRG-${index}`,
      owner_function: "Supply Chain",
      owner_reference: "Planner A",
      condition_code: index === 1 ? "dead_stock_candidate" : "slow_moving_candidate",
      evidence_strength: "high",
      condition_confidence: "high",
      stock_value: 12000 + index,
      stock_quantity: 8 + index,
      stock_unit: "EA",
      currency: "EUR",
      positive_evidence: [{ code: "dead_stock_evidence", message: "No consumption", value: { monthsSince: 24, net12: 0 } }],
      counter_evidence: [{ code: "no_explicit_strategic_reserve", message: "No reserve flag" }],
      limitation_codes: [],
      missing_evidence: ["finance_review_context"],
      root_cause_candidates: [{ root_cause_code: "demand_discontinuity", label: "Demand discontinuity", confidence: "medium" }],
      recovery_case_eligibility: { eligibility: "reviewable_case_candidate", reason_codes: ["inventory_exposure_exists"] },
      action_eligibility: [{ action_code: "DISPOSAL_REVIEW", label: "Disposal review", eligibility_status: "review_required", required_data_packages: ["finance"] }],
      required_data_packages: ["finance"],
      independent_dead_stock_signal: index === 1,
      strategic_reserve_signal: false,
      provenance: {
        service_model_version: "slow-dead-recovery-case-service-v1",
        runtime_model_version: "slow-dead-runtime-state-v1",
        condition_model_version: "slow-dead-condition-v1",
        condition_policy_version: "slow-dead-condition-policy-v1",
        root_cause_model_version: "slow-dead-root-cause-v1",
        action_eligibility_version: "slow-dead-action-eligibility-v1",
        relationshipMatchType: "exact_material_plant",
        relationshipSignature: "rel-sig-export",
        relationshipModelVersion: "relationship-v1",
        historicalMetricModelVersion: "historical-metrics-v1",
        caseInputSignature: "case-input-export",
        evaluatedAt: "2026-08-23T10:00:00.000Z",
        inventoryPackage: {
          packageId: "inventory-package-export",
          packageType: "inventory",
          datasetId: "dataset-export",
          revision: 2
        },
        historyPackage: {
          packageId: "history-package-export",
          packageType: "consumption_history",
          datasetId: "history-export",
          revision: 1
        }
      },
      ...overrides
    };
  }

  function columnIndex(exportData, key) {
    return exportData.columns.indexOf(key);
  }

  test("AP 16.4d.2 Export builder writes one deterministic row per Recovery Case with provenance", async assert => {
    const app = await helpers.loadProductionApp();
    const builder = app.ObsoliQ.slowDead.exportBuilder;
    const cases = [caseRecord(1), caseRecord(2, { stock_value: 0 })];
    const exportData = builder.buildSlowDeadExportRows({
      cases,
      conditionLabel: code => `Label:${code}`
    });

    assert.equal(exportData.rows.length, 2, "Export should keep one row per supplied Case");
    assert.equal(exportData.rows[0][columnIndex(exportData, "material_id")], "00001", "Material IDs with leading zeros should remain text identities");
    assert.equal(exportData.rows[0][columnIndex(exportData, "condition_label")], "Label:dead_stock_candidate", "Condition label should be supplied by presentation");
    assert.equal(exportData.rows[1][columnIndex(exportData, "inventory_exposure_value")], "", "Missing exposure should stay unavailable, not false zero");
    assert.ok(String(exportData.rows[0][columnIndex(exportData, "positive_evidence")]).includes("dead_stock_evidence"), "Positive evidence should be serialized");
    assert.ok(String(exportData.rows[0][columnIndex(exportData, "action_eligibility")]).includes("DISPOSAL_REVIEW"), "Action eligibility should be serialized");
    assert.equal(exportData.rows[0][columnIndex(exportData, "condition_model_version")], "slow-dead-condition-v1", "Condition model provenance should be exported");
    assert.equal(exportData.rows[0][columnIndex(exportData, "history_package_revision")], 1, "Package revision provenance should be exported");
  });

  test("AP 16.4d.2 Export can use filtered Case models and existing spreadsheet sanitization", async assert => {
    const app = await helpers.loadSampleApp();
    const builder = app.ObsoliQ.slowDead.exportBuilder;
    const pageModel = app.ObsoliQ.slowDead.pageModel;
    const cases = [
      caseRecord(1, { material_description: "=HYPERLINK(\"bad\")" }),
      caseRecord(2, { condition_code: "strategic_reserve" })
    ];
    const model = pageModel.createSlowDeadPageModel({
      runtimeState: { status: "available", result: { status: "available", cases } },
      filters: { condition: "dead_stock_candidate" }
    });
    const exportData = builder.buildSlowDeadExportRows({ cases: model.filteredCases });

    assert.equal(exportData.rows.length, 1, "Filtered export source should include only filtered Cases");
    assert.equal(exportData.rows[0][columnIndex(exportData, "condition_code")], "dead_stock_candidate", "Filtered export should keep the selected Condition");
    assert.equal(app.__obsoliqTestBridge.sanitizeSpreadsheetCellForTest("=HYPERLINK(\"bad\")"), "'=HYPERLINK(\"bad\")", "Existing export path should protect spreadsheet formula injection");
  });
})();
