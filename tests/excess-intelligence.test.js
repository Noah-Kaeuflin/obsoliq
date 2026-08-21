(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function relationshipFixture() {
    return {
      status: "executed",
      eligibleInventoryRowCount: 2,
      matchedInventoryRowCount: 2,
      exactMatchCount: 1,
      fallbackMatchCount: 1,
      unmatchedCount: 0,
      ambiguousCount: 0,
      invalidKeyCount: 0,
      conflictCount: 0,
      matchRate: 1,
      matches: [
        {
          inventoryRowKey: "INV-1",
          materialMasterRowKey: "MM-1",
          materialMasterSourceRowIndex: 7,
          matchType: "exact_material_plant",
          materialMasterPackageId: "PKG-MM",
          materialMasterPackageRevision: 2,
          materialMasterDatasetId: "DS-MM"
        },
        {
          inventoryRowKey: "INV-2",
          materialMasterRowKey: "MM-2",
          materialMasterSourceRowIndex: 8,
          matchType: "material_unique_fallback",
          materialMasterPackageId: "PKG-MM",
          materialMasterPackageRevision: 2,
          materialMasterDatasetId: "DS-MM"
        }
      ],
      unmatched: [],
      ambiguous: [],
      invalidKeys: [],
      conflicts: []
    };
  }

  test("AP 16.3a Excess engines create net cases, owner context, scores and scenarios without mutating rows", async assert => {
    const app = await helpers.loadProductionApp();
    const sourceRows = [
      {
        inventory_row_key: "INV-1",
        row_number: 1,
        material_id: "MAT-1045",
        material_description: "Pressure sensor",
        plant: "DE01",
        profit_center: "PC-200",
        primary_category: "excess",
        excess_value: 100000,
        net_excess_value: 65000,
        recovery_potential: 65000,
        stock_value: 160000,
        owner_function: "Material Planning",
        mrp_controller: "MRP-04",
        priority: "High",
        confidence: "High",
        status: "Open"
      },
      {
        inventory_row_key: "INV-2",
        row_number: 2,
        material_id: "MAT-2040",
        material_description: "Seal kit",
        plant: "DE02",
        profit_center: "PC-500",
        primary_category: "planned_healthy",
        excess_value: 0,
        recovery_potential: 0,
        stock_value: 3000,
        owner_function: "No direct owner",
        status: "Open"
      }
    ];
    const rowsBefore = JSON.stringify(sourceRows);
    const model = app.ObsoliQ.application.excessAnalysisService.buildExcessPageModel({
      rows: sourceRows,
      datasetMeta: { datasetId: "DS-INV", packageId: "PKG-INV", revision: 1 },
      relationshipResult: relationshipFixture(),
      enrichmentDiagnostics: { conflictCount: 0, conflicts: [] },
      enrichmentProvenance: {
        "INV-1": {
          matchType: "exact_material_plant",
          materialMasterPackageId: "PKG-MM",
          materialMasterPackageRevision: 2,
          materialMasterDatasetId: "DS-MM",
          materialMasterSourceRowIndex: 7,
          fields: { mrp_controller: { source: "material_master" } },
          confirmedFields: {}
        }
      }
    });

    assert.equal(JSON.stringify(sourceRows), rowsBefore, "Excess analysis must not mutate source rows");
    assert.equal(model.summary.caseCount, 1, "Only excess-relevant rows should become cases");
    assert.equal(model.summary.grossExcessValue, 100000, "Gross excess should preserve the source excess value");
    assert.equal(model.summary.netAddressableExcessValue, 65000, "Net addressable excess should use the already deduplicated net value");
    assert.equal(model.summary.overlapValue, 35000, "Overlap should explain gross-to-net difference");
    assert.equal(model.cases[0].owner_reference, "MRP-04", "Owner reference should use planner context");
    assert.equal(model.cases[0].owner_source, "material_master", "Owner source should expose Material Master context");
    assert.ok(model.cases[0].excess_opportunity_score > 0, "Opportunity score should be generated");
    assert.ok(model.cases[0].scenarios.some(item => item.scenario_id === "excess_reduction_percent" && item.available), "Reduction scenario should be available");
  });

  test("AP 16.3a Relationship quality classifies complete, limited and critical states", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.data.packageRelationshipQualityEngine;
    const complete = engine.relationshipQuality({
      relationshipResult: relationshipFixture(),
      enrichmentDiagnostics: { conflictCount: 0 }
    });
    const limited = engine.relationshipQuality({
      relationshipResult: { ...relationshipFixture(), matchedInventoryRowCount: 16, eligibleInventoryRowCount: 20, matchRate: 0.8 },
      enrichmentDiagnostics: { conflictCount: 0 }
    });
    const critical = engine.relationshipQuality({
      relationshipResult: { ...relationshipFixture(), matchedInventoryRowCount: 8, eligibleInventoryRowCount: 20, matchRate: 0.4 },
      enrichmentDiagnostics: { conflictCount: 3 }
    });
    assert.equal(complete.status, "complete", "High match quality should be complete");
    assert.equal(limited.status, "limited", "Intermediate quality should be limited");
    assert.equal(critical.status, "critical", "Low match quality should be critical");
    assert.equal(engine.evaluateInventoryMaterialMasterQuality({
      relationshipResult: { ...relationshipFixture(), matchedInventoryRowCount: 18, eligibleInventoryRowCount: 20, matchRate: 0.9, ambiguousCount: 1 },
      enrichmentDiagnostics: { conflictCount: 0 }
    }).status, "limited", "Preferred API should expose the same MVP relationship-quality thresholds");
    assert.equal(engine.thresholdVersion, "mvp-1", "Relationship quality should expose the threshold version");
  });

  test("AP 16.3a Material Master enrichment does not import owner_function but Owner Context can use approved reference fields", async assert => {
    const app = await helpers.loadProductionApp();
    const enrichmentEngine = app.ObsoliQ.data.packageEnrichmentEngine;
    const ownerEngine = app.ObsoliQ.actions.actionOwnerContextEngine;
    assert.equal(enrichmentEngine.fieldIsApproved("owner_function"), false, "owner_function must remain protected from Material Master enrichment");
    assert.equal(enrichmentEngine.fieldIsApproved("mrp_controller"), true, "MRP Controller remains an approved context field");

    const context = ownerEngine.buildActionOwnerContext({
      row: { owner_function: "Material Planning", mrp_controller: "MRP-77" },
      ownerFunction: "Material Planning",
      enrichmentProvenance: {
        matchType: "exact_material_plant",
        fields: { mrp_controller: { source: "material_master" } }
      }
    });
    assert.equal(context.owner_reference, "MRP-77", "Owner reference should use approved context fields");
    assert.equal(context.owner_source, "material_master", "Owner source should be transparent");
    assert.equal(context.owner_assignment_confidence, "High", "Exact Material + Plant context should be high confidence");
  });
})();
