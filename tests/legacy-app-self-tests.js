/*
 * Migrated ObsoliQ legacy application self-tests.
 * Loaded only by tests/tests.html, never by the production prototype bootstrap.
 */
(function () {
function loadRemediationSelfTestDataset(headers, rows) {
  resetRemediationState();
  originalHeaders = headers;
  sourceColumnMetadata = buildSourceColumnMetadata(headers);
  rawRows = rows;
  const mapping = refreshColumnMappingStatuses(createAutomaticColumnMapping({ headers, rows, sourceColumnMetadata }));
  const datasetId = createDatasetId("self-test");
  currentDatasetMeta = {
    datasetId,
    sourceLabel: "Self-test",
    rows: rows.length,
    originalRows: rows.length,
    columns: headers.length,
    sourceType: "self-test",
    columnMapping: mapping,
    baseColumnMapping: cloneColumnMapping(mapping),
    mappingValidation: validateColumnMapping(mapping),
    correctionCount: 0,
    buildMetadata: null
  };
  const buildResult = buildCurrentInventoryDataset({
    sourceRows: rows,
    headers,
    metadata: sourceColumnMetadata,
    columnMapping: mapping,
    corrections: dataCorrections,
    options: { includeExcludedRows: false, datasetId }
  });
  commitInventoryDatasetBuild(buildResult);
  setDataQualityIssueSnapshot(detectDataQualityIssues());
  syncDataQualityIssueLedger(dataQualityIssues);
  const packageTimestamp = new Date().toISOString();
  registerCurrentInventoryPackage({
    operationType: "self_test_load",
    qualitySummary: evaluatePackageQualitySummary(packageTimestamp),
    timestamp: packageTimestamp,
    builtAt: currentDatasetMeta?.buildMetadata?.builtAt || packageTimestamp
  });
  originalDataQualitySnapshot = currentDataQualityScoreSnapshot();
}

function addSelfTestCorrection(correction) {
  createDataCorrection(correction, { rebuild: false, feedback: false });
  rebuildDatasetFromCorrections({ render: false });
}

function runColumnMappingSelfTests() {
  const mappingInput = (headers, rows) => ({
    headers,
    rows,
    sourceColumnMetadata: buildSourceColumnMetadata(headers)
  });
  const automaticMapping = (headers, rows) => createAutomaticColumnMapping(mappingInput(headers, rows));
  const auto = automaticMapping(
    ["Material Number", "MATNR", "Stock Value EUR", "No Demand Value", "Custom Segment", "Recovery Potential"],
    [{ "Material Number": "MAT-1", MATNR: "MAT-1", "Stock Value EUR": "100", "No Demand Value": "20", "Custom Segment": "A", "Recovery Potential": "999" }]
  );
  console.assert(auto.find(entry => entry.sourceColumn === "Material Number")?.proposedCanonicalField === "material_id", "Column mapping self-test failed: Material Number maps to material_id");
  console.assert(auto.find(entry => entry.sourceColumn === "MATNR")?.proposedCanonicalField === "material_id", "Column mapping self-test failed: MATNR maps to material_id");
  console.assert(auto.find(entry => entry.sourceColumn === "Stock Value EUR")?.proposedCanonicalField === "stock_value", "Column mapping self-test failed: Stock Value EUR maps to stock_value");
  console.assert(auto.find(entry => entry.sourceColumn === "No Demand Value")?.proposedCanonicalField === "direct_no_need_value", "Column mapping self-test failed: No Demand Value maps to direct_no_need_value");
  console.assert(auto.find(entry => entry.sourceColumn === "Custom Segment")?.status === "unmapped", "Column mapping self-test failed: unknown header remains unmapped");
  console.assert(auto.find(entry => entry.sourceColumn === "Recovery Potential")?.status === "protected", "Column mapping self-test failed: derived recovery field is protected");

  const noMaterial = automaticMapping(["Stock Value EUR"], [{ "Stock Value EUR": "100" }]);
  console.assert(!validateColumnMapping(noMaterial).valid, "Column mapping self-test failed: missing material_id must be invalid");
  const noStock = automaticMapping(["Material Number"], [{ "Material Number": "MAT-1" }]);
  console.assert(!validateColumnMapping(noStock).valid, "Column mapping self-test failed: missing stock_value must be invalid");
  const duplicateMaterial = automaticMapping(["Material", "Material Number", "Stock Value"], [{ Material: "MAT-1", "Material Number": "MAT-1", "Stock Value": "100" }]);
  console.assert(validateColumnMapping(duplicateMaterial).duplicateCanonicalMappings.length > 0, "Column mapping self-test failed: duplicate material mapping must be detected");
  const invalidDerived = automaticMapping(["Material", "Stock Value"], [{ Material: "MAT-1", "Stock Value": "100" }]);
  invalidDerived[0].selectedCanonicalField = "recovery_potential";
  console.assert(!validateColumnMapping(invalidDerived).valid, "Column mapping self-test failed: derived target must be invalid");

  const validWithWarnings = automaticMapping(["Material", "Stock Value", "Custom Segment"], [{ Material: "MAT-1", "Stock Value": "100", "Custom Segment": "A" }]);
  const warningResult = validateColumnMapping(validWithWarnings);
  console.assert(warningResult.valid, "Column mapping self-test failed: required fields with unknown columns should stay valid");
  console.assert(warningResult.warnings.some(warning => warning.key === "mappingNoRecoveryField"), "Column mapping self-test failed: no recovery input should warn");
  console.assert(warningResult.warnings.some(warning => warning.key === "mappingNoWorkflowField"), "Column mapping self-test failed: no workflow field should warn");

  const manualHeaders = ["Item", "Value", "Ignore Me", "Recovery Potential"];
  const manualRows = [{ Item: "MAT-0", Value: "0", "Ignore Me": "keep", "Recovery Potential": "900" }];
  const manualInput = mappingInput(manualHeaders, manualRows);
  const manualMapping = createAutomaticColumnMapping(manualInput).map(entry => {
    if (entry.sourceColumn === "Item") return { ...entry, selectedCanonicalField: "material_id", matchType: "manual", confidence: "high" };
    if (entry.sourceColumn === "Value") return { ...entry, selectedCanonicalField: "stock_value", matchType: "manual", confidence: "high" };
    return entry;
  });
  const applied = applyApprovedColumnMapping({ ...manualInput, mapping: manualMapping })[0];
  console.assert(applied.material_id === "MAT-0", "Column mapping self-test failed: manual material mapping must apply");
  console.assert(applied.stock_value === "0", "Column mapping self-test failed: manual stock mapping must preserve explicit 0");
  console.assert(applied.ignore_me === "keep", "Column mapping self-test failed: ignored source column must be preserved");
  console.assert(applied.source_recovery_potential === "900", "Column mapping self-test failed: protected derived source must be prefixed");
  console.assert(enrich(applied, 0).stock_value === 0, "Column mapping self-test failed: mapping correction should preserve explicit stock_value 0 through enrichment");

  const duplicateHeaderParsed = parseDelimited("Material,Safety Stock Target,Safety Stock Target\nMAT-1,100,200");
  console.assert(duplicateHeaderParsed.headers[1] === "Safety Stock Target", "Column mapping self-test failed: first duplicate source header key changed unexpectedly");
  console.assert(duplicateHeaderParsed.headers[2] === "Safety Stock Target__2", "Column mapping self-test failed: duplicate source header suffix missing");
  console.assert(duplicateHeaderParsed.rows[0]["Safety Stock Target"] === "100", "Column mapping self-test failed: first duplicate source value lost");
  console.assert(duplicateHeaderParsed.rows[0]["Safety Stock Target__2"] === "200", "Column mapping self-test failed: second duplicate source value lost");

  const duplicateValidation = validateColumnMapping(duplicateMaterial);
  const duplicateMetrics = mappingSummaryMetrics({ headers: ["Material", "Material Number", "Stock Value"] }, duplicateValidation);
  console.assert(duplicateMetrics.duplicateCount === 1, "Column mapping self-test failed: one duplicate target should count as one duplicate");
  console.assert(duplicateMetrics.blockingErrorCount === 0, "Column mapping self-test failed: duplicate target should not be double-counted as a separate blocking error");

  const twoDuplicateMapping = automaticMapping(
    ["Material", "Material Number", "Stock Value", "Stock Value EUR"],
    [{ Material: "MAT-1", "Material Number": "MAT-1", "Stock Value": "100", "Stock Value EUR": "100" }]
  );
  console.assert(validateColumnMapping(twoDuplicateMapping).duplicateCanonicalMappings.length === 2, "Column mapping self-test failed: two duplicate targets should be counted separately");

  const metadataMapping = automaticMapping(["Material Number", "Stock Value EUR"], [{ "Material Number": "MAT-1", "Stock Value EUR": "100" }]);
  const proposedMaterial = metadataMapping.find(entry => entry.sourceColumn === "Material Number");
  console.assert(proposedMaterial?.proposedMatchType === "alias", "Column mapping self-test failed: automatic alias metadata must be stored immutably");
  let changedMapping = metadataMapping.map(entry => entry.sourceColumn === "Material Number" ? { ...entry, selectedCanonicalField: "stock_value" } : entry);
  changedMapping = refreshColumnMappingStatuses(changedMapping);
  console.assert(changedMapping.find(entry => entry.sourceColumn === "Material Number")?.manual === true, "Column mapping self-test failed: changed automatic mapping must be manual");
  changedMapping = changedMapping.map(entry => entry.sourceColumn === "Material Number" ? { ...entry, selectedCanonicalField: "material_id" } : entry);
  changedMapping = refreshColumnMappingStatuses(changedMapping);
  const restoredMaterial = changedMapping.find(entry => entry.sourceColumn === "Material Number");
  console.assert(restoredMaterial?.manual === false, "Column mapping self-test failed: selecting the proposal again must clear manual flag");
  console.assert(restoredMaterial?.matchType === "alias", "Column mapping self-test failed: selecting the proposal again must restore alias match type");
  console.assert(restoredMaterial?.confidence === proposedMaterial?.proposedConfidence, "Column mapping self-test failed: selecting the proposal again must restore automatic confidence");

  const previousDatasetMeta = currentDatasetMeta;
  const explorerHeaders = ["Item", "Value", "Custom Segment", "Recovery Potential"];
  const explorerRows = [{ Item: "MAT-1", Value: "100", "Custom Segment": "A", "Recovery Potential": "900" }];
  const explorerMapping = automaticMapping(explorerHeaders, explorerRows).map(entry => {
    if (entry.sourceColumn === "Item") return { ...entry, selectedCanonicalField: "material_id" };
    if (entry.sourceColumn === "Value") return { ...entry, selectedCanonicalField: "stock_value" };
    return entry;
  });
  currentDatasetMeta = { columnMapping: refreshColumnMappingStatuses(explorerMapping) };
  console.assert(inventoryExplorerFieldKey("Item", 0) === "material_id", "Column mapping self-test failed: manually mapped Item must resolve to material_id");
  console.assert(inventoryExplorerFieldKey("Value", 1) === "stock_value", "Column mapping self-test failed: manually mapped Value must resolve to stock_value");
  console.assert(inventoryExplorerFieldKey("Custom Segment", 2) === "custom_segment", "Column mapping self-test failed: unknown source column must keep technical source key");
  console.assert(inventoryExplorerFieldKey("Recovery Potential", 3) === "source_recovery_potential", "Column mapping self-test failed: protected field must resolve to source_ key");
  currentDatasetMeta = previousDatasetMeta;

  const orgRows = [{ profit_center: "PC-1", plant: "" }, { profit_center: "", plant: "PL-1" }];
  const orgMapping = automaticMapping(["profit_center", "plant"], orgRows);
  console.assert(sourceGroupCompletenessPreview(orgRows, mappingSourcesForFields(orgMapping, mappingOrganizationFieldKeys)) === 100, "Column mapping self-test failed: organization completeness must use row-level OR logic");
  const recoveryRows = [{ direct_no_need_value: "10", no_plan_value: "" }, { direct_no_need_value: "", no_plan_value: "20" }];
  const recoveryMapping = automaticMapping(["direct_no_need_value", "no_plan_value"], recoveryRows);
  console.assert(sourceGroupCompletenessPreview(recoveryRows, mappingSourcesForFields(recoveryMapping, recoveryInputFieldKeys)) === 100, "Column mapping self-test failed: recovery completeness must use row-level OR logic");
  const workflowRows = [{ mrp_controller: "M1", gac_purchasing: "" }, { mrp_controller: "", gac_purchasing: "P1" }];
  const workflowMapping = automaticMapping(["mrp_controller", "gac_purchasing"], workflowRows);
  console.assert(sourceGroupCompletenessPreview(workflowRows, mappingSourcesForFields(workflowMapping, mappingWorkflowFieldKeys)) === 100, "Column mapping self-test failed: workflow completeness must use row-level OR logic");

  const previousEnrichedRows = enrichedRows;
  enrichedRows = [{ row_number: 1, status: "Open" }, { row_number: 2, status: "Open" }];
  restoreActionStatusesFromSnapshot(new Map([[1, "Implemented"], [2, "Not a status"]]));
  console.assert(enrichedRows[0].status === "Implemented" && enrichedRows[1].status === "Open", "Column mapping self-test failed: local action status restoration must keep valid statuses only");
  enrichedRows = previousEnrichedRows;
  console.assert(addEventListenerIfPresent("__missing_mapping_test__", "click", () => {}, { silent: true }) === false, "Column mapping self-test failed: missing optional DOM registration must not throw");
}

function runInventoryDataModelSelfTests() {
  const canonical = ObsoliQModules.core.canonical;
  const valueUtils = ObsoliQModules.core.valueUtils;
  console.assert(
    inventoryFieldDefinitionErrors.length === 0,
    `Inventory data model validation failed: ${inventoryFieldDefinitionErrors.join(" | ")}`
  );
  console.assert(canonical.version === "1", "Canonical module self-test failed: contract version missing");
  console.assert(canonical.normalizeMap[canonical.normalizeHeaderToken("MATNR")] === "material_id", "Canonical module self-test failed: MATNR alias");
  console.assert(canonical.normalizeMap[canonical.normalizeHeaderToken("Inventory Value")] === "stock_value", "Canonical module self-test failed: Inventory Value alias");
  console.assert(canonical.normalizeMap[canonical.normalizeHeaderToken("No Demand Value")] === "direct_no_need_value", "Canonical module self-test failed: No Demand Value alias");
  console.assert(canonical.safeImportFieldKey("recovery_potential") === "source_recovery_potential", "Canonical module self-test failed: protected recovery field prefix");
  console.assert(canonical.inventoryFieldDefinitions.recovery_potential.importable === false, "Canonical module self-test failed: derived field must remain non-importable");
  console.assert(canonical.validateInventoryFieldDefinitions(canonical.inventoryFieldDefinitions).length === 0, "Canonical module self-test failed: current definitions invalid");
  console.assert(valueUtils.version === "1", "Value-utils module self-test failed: contract version missing");
  console.assert(Object.is(valueUtils.toNumber("1.234,56"), 1234.56), "Value-utils module self-test failed: German decimal parsing");
  console.assert(Object.is(valueUtils.toNumber("1,234.56"), 1234.56), "Value-utils module self-test failed: English decimal parsing");
  console.assert(Object.is(valueUtils.toNumber("1,2 Mio."), 1200000), "Value-utils module self-test failed: Mio. parsing");
  console.assert(Object.is(valueUtils.toNumber("125 Tsd."), 125000), "Value-utils module self-test failed: Tsd. parsing");
  console.assert(Object.is(valueUtils.toNumber("-500"), -500), "Value-utils module self-test failed: negative parsing");
  console.assert(Object.is(valueUtils.toNumber("€ 12.500"), 12500), "Value-utils module self-test failed: currency parsing");
  console.assert(Object.is(valueUtils.toNumber(""), 0), "Value-utils module self-test failed: empty parsing");
  console.assert(normalizeHeader("Material Number") === "material_id", "Inventory data model self-test failed: material alias");
  console.assert(normalizeHeader("Stock Value EUR") === "stock_value", "Inventory data model self-test failed: stock-value alias");
  console.assert(normalizeHeader("No Demand Value") === "direct_no_need_value", "Inventory data model self-test failed: direct no-demand alias");
  console.assert(numericKeys.includes("stock_value"), "Inventory data model self-test failed: currency fields must be numeric");
  console.assert(numericKeys.includes("direct_no_need_value"), "Inventory data model self-test failed: direct no-demand value must be numeric");
  console.assert(moneyKeys.has("direct_no_need_value"), "Inventory data model self-test failed: direct no-demand value must be treated as money");
  console.assert(!numericKeys.includes("material_id"), "Inventory data model self-test failed: material_id must remain text");
  console.assert(!numericKeys.includes("pup_pmp"), "Inventory data model self-test failed: pup_pmp must remain text");

  const negativeDirectNoDemandRow = enrich({
    material_id: "MAT-NOD-NEG",
    stock_value: 1000,
    direct_no_need_value: -100
  }, 0);
  console.assert(negativeDirectNoDemandRow.no_need_value === 0, "Inventory data model self-test failed: negative direct no-demand must not create negative no_need_value");
  console.assert(negativeDirectNoDemandRow.recovery_potential === 0, "Inventory data model self-test failed: negative direct no-demand must not create recovery potential");

  const invalidDirectNoDemandRow = enrich({
    material_id: "MAT-NOD-INVALID",
    stock_value: 1000,
    direct_no_need_value: "abc"
  }, 0);
  console.assert(invalidDirectNoDemandRow.no_need_value === 0, "Inventory data model self-test failed: invalid direct no-demand must create no_need_value 0");
  console.assert(invalidDirectNoDemandRow.recovery_potential === 0, "Inventory data model self-test failed: invalid direct no-demand must not create recovery potential");

  const positiveDirectNoDemandRow = enrich({
    material_id: "MAT-NOD-POS",
    stock_value: 1000,
    direct_no_need_value: 50
  }, 0);
  console.assert(positiveDirectNoDemandRow.no_need_value === 50, "Inventory data model self-test failed: positive direct no-demand must contribute to no_need_value");
  console.assert(positiveDirectNoDemandRow.recovery_potential === 50, "Inventory data model self-test failed: positive direct no-demand must contribute to recovery potential");

  const combinedNoDemandRow = enrich({
    material_id: "MAT-NOD-COMBINED",
    stock_value: 100,
    direct_no_need_value: 50,
    no_need_conso_value: 20
  }, 0);
  console.assert(combinedNoDemandRow.no_need_value === 70, "Inventory data model self-test failed: direct and bucketed no-demand values must aggregate");
  console.assert(combinedNoDemandRow.recovery_potential === 70, "Inventory data model self-test failed: aggregated no-demand value should create recovery potential");

  const cappedDirectNoDemandRow = enrich({
    material_id: "MAT-NOD-CAPPED",
    stock_value: 60,
    direct_no_need_value: 50,
    no_need_conso_value: 20
  }, 0);
  console.assert(cappedDirectNoDemandRow.no_need_value === 70, "Inventory data model self-test failed: no_need_value should retain gross no-demand input before cap");
  console.assert(cappedDirectNoDemandRow.recovery_potential === 60, "Inventory data model self-test failed: recovery potential must remain capped by stock value");

  const explicitZeroStockRow = enrich({
    material_id: "MAT-STOCK-ZERO",
    stock_value: 0,
    stock_quantity: 10,
    standard_price: 5
  }, 0);
  console.assert(explicitZeroStockRow.stock_value === 0, "Inventory data model self-test failed: explicit stock_value 0 must not be overwritten by fallback");

  const emptyStockFallbackRow = enrich({
    material_id: "MAT-STOCK-FALLBACK",
    stock_value: "",
    stock_quantity: 10,
    standard_price: 5
  }, 0);
  console.assert(emptyStockFallbackRow.stock_value === 50, "Inventory data model self-test failed: missing stock_value should fall back to quantity times standard price");

  const existingStockRow = enrich({
    material_id: "MAT-STOCK-EXISTING",
    stock_value: 25,
    stock_quantity: 10,
    standard_price: 5
  }, 0);
  console.assert(existingStockRow.stock_value === 25, "Inventory data model self-test failed: existing stock_value must not be overwritten by fallback");

  console.assert(opportunityColumnKeys.some(([key]) => key === "direct_no_need_value"), "Inventory data model self-test failed: direct no-demand value must be present in recovery opportunity exports");
  console.assert(actionExportColumnKeys.some(([key]) => key === "direct_no_need_value"), "Inventory data model self-test failed: direct no-demand value must be present in action exports");
  console.assert(opportunityColumns().find(([key]) => key === "direct_no_need_value")?.[1].includes(activeCurrency().code), "Inventory data model self-test failed: direct no-demand export label must include currency code");
  console.assert(actionExportColumns().find(([key]) => key === "direct_no_need_value")?.[1].includes(activeCurrency().code), "Inventory data model self-test failed: direct no-demand action export label must include currency code");

  const protectedParsed = buildParsedSourceDataset(
    ["Material", "Recovery Potential", "Status"],
    [["0000123", "999", "Implemented"]]
  );
  const protectedMapping = createAutomaticColumnMapping({
    headers: protectedParsed.headers,
    rows: protectedParsed.rows,
    sourceColumnMetadata: protectedParsed.sourceColumnMetadata
  });
  const protectedRow = applyApprovedColumnMapping({
    headers: protectedParsed.headers,
    rows: protectedParsed.rows,
    mapping: protectedMapping,
    sourceColumnMetadata: protectedParsed.sourceColumnMetadata
  })[0];
  console.assert(protectedRow.material_id === "0000123", "Inventory data model self-test failed: leading zeros must be preserved");
  console.assert(protectedRow.recovery_potential === undefined, "Inventory data model self-test failed: derived recovery field must be protected");
  console.assert(protectedRow.source_recovery_potential === "999", "Inventory data model self-test failed: protected source recovery field must be retained");
  console.assert(protectedRow.status === undefined, "Inventory data model self-test failed: derived status field must be protected");
  console.assert(protectedRow.source_status === "Implemented", "Inventory data model self-test failed: protected source status must be retained");

  console.assert(
    enrichInventoryRow({ material_id: "MAT-1", profit_center: "PC-1", __sourceRowIndex: 8 }, 0).inventory_row_key === "MAT-1::PC-1",
    "Inventory data model self-test failed: material/profit-center row key"
  );
  console.assert(
    enrichInventoryRow({ material_id: "MAT-1", profit_center: "", __sourceRowIndex: 8 }, 0).inventory_row_key === "MAT-1::ROW-8",
    "Inventory data model self-test failed: material/row-number fallback key"
  );

  const pupPmpRow = enrich({
    material_id: "MAT-PUP",
    stock_value: 100,
    pup_pmp: "PMP"
  }, 0);
  console.assert(
    pupPmpRow.pup_pmp === "PMP",
    "Inventory data model self-test failed: pup_pmp text value must be preserved"
  );

  const pupTextRow = enrich({
    material_id: "MAT-PUP-2",
    stock_value: 100,
    pup_pmp: "PUP"
  }, 0);
  console.assert(
    pupTextRow.pup_pmp === "PUP",
    "Inventory data model self-test failed: pup_pmp PUP value must be preserved"
  );

  const profitCenterRow = enrich({
    material_id: "MAT-1",
    profit_center: "PC-1",
    plant: "PLANT-1",
    stock_value: 100
  }, 0);
  console.assert(
    profitCenterRow.inventory_row_key === "MAT-1::PC-1",
    "Inventory data model self-test failed: source profit center must be used in row key"
  );

  const plantOnlyRow = enrich({
    material_id: "MAT-2",
    plant: "PLANT-1",
    stock_value: 100
  }, 1);
  console.assert(
    plantOnlyRow.profit_center === "PLANT-1",
    "Inventory data model self-test failed: plant fallback must remain available operationally"
  );
  console.assert(
    plantOnlyRow.inventory_row_key === "MAT-2::ROW-2",
    "Inventory data model self-test failed: plant must not replace profit center in row key"
  );

  const divisionOnlyRow = enrich({
    material_id: "MAT-3",
    div: "DIV-1",
    stock_value: 100
  }, 2);
  console.assert(
    divisionOnlyRow.profit_center === "DIV-1",
    "Inventory data model self-test failed: division fallback must remain available operationally"
  );
  console.assert(
    divisionOnlyRow.inventory_row_key === "MAT-3::ROW-3",
    "Inventory data model self-test failed: division must not replace profit center in row key"
  );

  const unassignedRow = enrich({
    stock_value: 100
  }, 3);
  console.assert(
    unassignedRow.inventory_row_key === "UNASSIGNED::ROW-4",
    "Inventory data model self-test failed: missing material fallback row key"
  );

  const aliasCollisionErrors = validateInventoryFieldDefinitions({
    ...inventoryFieldDefinitions,
    synthetic_alias_collision: {
      label: { de: "Synthetischer Alias-Konflikt", en: "Synthetic Alias Collision" },
      type: "text",
      requirement: "optional",
      analysis_group: "context",
      importable: true,
      aliases: ["Material Number"]
    }
  });
  console.assert(
    aliasCollisionErrors.some(error => error.includes("Alias")),
    "Inventory data model self-test failed: duplicate aliases must be detected"
  );

  const previousLanguage = currentLanguage;
  currentLanguage = "de";
  console.assert(getColumnDisplayLabel("material_id") === "Material", "Inventory data model self-test failed: German material label");
  console.assert(getColumnDisplayLabel("material_description") === "Materialbeschreibung", "Inventory data model self-test failed: German material description label");
  console.assert(getColumnDisplayLabel("stock_value") === "Bestandswert", "Inventory data model self-test failed: German stock-value label");
  console.assert(getColumnDisplayLabel("pup_pmp") === "pup_pmp", "Inventory data model self-test failed: unknown Explorer labels must keep the original column name");
  console.assert(getColumnDisplayLabel("availability") === "availability", "Inventory data model self-test failed: availability must keep the original column name without Explorer label");
  currentLanguage = "en";
  console.assert(getColumnDisplayLabel("material_id") === "Material", "Inventory data model self-test failed: English material label");
  console.assert(getColumnDisplayLabel("stock_value") === "Inventory Value", "Inventory data model self-test failed: English stock-value label");
  console.assert(getColumnDisplayLabel("availability") === "availability", "Inventory data model self-test failed: English original-column fallback");
  currentLanguage = previousLanguage;
}

function runDataQualityCalibrationSelfTests() {
  const notReadyCap = applyPilotReadinessScoreCap(95, { key: "pilotNotReady" });
  const limitedCap = applyPilotReadinessScoreCap(95, { key: "pilotLimited" });
  const readyCap = applyPilotReadinessScoreCap(95, { key: "pilotReady" });

  console.assert(notReadyCap.score <= 49, "Data Quality calibration self-test failed: Not ready score must be capped at 49");
  console.assert(limitedCap.score <= 74, "Data Quality calibration self-test failed: Limited pilot score must be capped at 74");
  console.assert(readyCap.score === 95, "Data Quality calibration self-test failed: Ready for pilot should not cap high scores");

  const readyCoverage = { required: { detected: 2, total: 2 } };
  const missingCoverage = { required: { detected: 1, total: 2 } };
  const analysisReadyContent = {
    materialCompleteness: 100,
    stockValueCompleteness: 100,
    stockValueNumericValidity: 100,
    requiredCompleteness: 100,
    organizationIdentifierDetected: true,
    organizationalAssignmentCompleteness: 100,
    recoveryFieldsDetected: 1,
    workflowFieldsDetected: 0,
    workflowAssignmentCompleteness: 0
  };
  const analysisReady = analysisReadinessFor(readyCoverage, analysisReadyContent);
  console.assert(analysisReady.key === "analysisReady", "Data Quality calibration self-test failed: required fields should support analysis readiness");
  console.assert(
    analysisReadinessFor(missingCoverage, analysisReadyContent).key === "analysisNotReady",
    "Data Quality calibration self-test failed: missing required fields must not be analysis-ready"
  );
  console.assert(
    workflowReadinessFor(analysisReady, analysisReadyContent).key === "workflowLimited",
    "Data Quality calibration self-test failed: missing workflow owner fields should be workflow-limited while analysis-ready"
  );
  console.assert(
    workflowReadinessFor(analysisReady, { ...analysisReadyContent, workflowFieldsDetected: 1, workflowAssignmentCompleteness: 90 }).key === "workflowReady",
    "Data Quality calibration self-test failed: workflow fields with high completeness should be workflow-ready"
  );

  const normalizationDiagnostics = buildRecoveryInputNormalizationDiagnostics([{
    material_id: "MAT-DQ",
    direct_no_need_value: "-10",
    no_need_conso_value: "abc",
    excess_value: ""
  }]);
  console.assert(normalizationDiagnostics.checkedCells === 3, "Data Quality calibration self-test failed: recovery normalization checked-cell count");
  console.assert(normalizationDiagnostics.negativeValues === 1, "Data Quality calibration self-test failed: negative recovery inputs should be counted");
  console.assert(normalizationDiagnostics.invalidValues === 1, "Data Quality calibration self-test failed: invalid recovery inputs should be counted");
  console.assert(normalizationDiagnostics.emptyValues === 1, "Data Quality calibration self-test failed: empty recovery inputs should be counted");
  console.assert(normalizationDiagnostics.examples.length === 2, "Data Quality calibration self-test failed: recovery normalization examples should include negative and invalid inputs");
}

function runDataQualityRemediationSelfTests() {
  const snapshot = snapshotRemediationRuntimeState();
  try {
    currentLanguage = "en";

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Profit Center", "No Demand Value"],
      [
        { Material: "MAT-1", "Stock Value": "1000", "Profit Center": "PC-1", "No Demand Value": "250" },
        { Material: "MAT-1", "Stock Value": "1000", "Profit Center": "PC-1", "No Demand Value": "250" }
      ]
    );
    const exactDuplicate = dataQualityIssues.find(issue => issue.issueType === "exact_duplicate");
    console.assert(Boolean(exactDuplicate), "Data remediation self-test failed: exact duplicate group missing");
    console.assert(enrichedRows.length === 2, "Data remediation self-test failed: exact duplicate must not be removed automatically");
    addSelfTestCorrection({
      issueId: exactDuplicate.issueId,
      sourceRowIndexes: [2],
      correctionType: "exclude_exact_duplicate",
      reason: "Self-test exact duplicate"
    });
    console.assert(enrichedRows.length === 1, "Data remediation self-test failed: explicit duplicate exclusion should reduce active row count");
    dataCorrections = dataCorrections.map(correction => ({ ...correction, status: "undone" }));
    rebuildDatasetFromCorrections({ render: false });
    console.assert(enrichedRows.length === 2, "Data remediation self-test failed: undo should restore excluded duplicate");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Profit Center", "No Demand Value"],
      [
        { Material: "MAT-1", "Stock Value": "1000", "Profit Center": "PC-1", "No Demand Value": "250" },
        { Material: "MAT-1", "Stock Value": "500", "Profit Center": "PC-1", "No Demand Value": "100" }
      ]
    );
    const duplicateCandidate = dataQualityIssues.find(issue => issue.issueType === "duplicate_key_candidate");
    console.assert(Boolean(duplicateCandidate), "Data remediation self-test failed: duplicate-key candidate missing");
    console.assert(enrichedRows.length === 2, "Data remediation self-test failed: duplicate-key candidates must remain active");
    console.assert(!dataQualityIssues.some(issue => issue.title === "Confirmed double booking"), "Data remediation self-test failed: candidate must not be labeled confirmed double booking");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Plant"],
      [
        { Material: "", "Stock Value": "1000", Plant: "PL-1" },
        { Material: "MAT-2", "Stock Value": "", Plant: "PL-1" }
      ]
    );
    console.assert(dataQualityIssues.some(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("material_id")), "Data remediation self-test failed: missing material issue missing");
    console.assert(dataQualityIssues.some(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("stock_value")), "Data remediation self-test failed: missing stock-value issue missing");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Plant"],
      [
        { Material: "", "Stock Value": "1000", Plant: "PL-1" },
        { Material: "MAT-2", "Stock Value": "abc", Plant: "PL-1" },
        { Material: "###", "Stock Value": "500", Plant: "PL-1" }
      ]
    );
    const stableBefore = new Map(dataQualityIssues.map(issue => [`${issue.issueType}:${(issue.canonicalFields || []).join(",")}`, issue.issueId]));
    const invalidNumeric = dataQualityIssues.find(issue => issue.issueType === "invalid_numeric_value" && issue.canonicalFields.includes("stock_value"));
    addSelfTestCorrection({
      issueKey: invalidNumeric.issueKey,
      issueId: invalidNumeric.issueId,
      issueType: invalidNumeric.issueType,
      sourceRowIndex: 2,
      sourceRowIndexes: [2],
      sourceColumn: "Stock Value",
      canonicalField: "stock_value",
      correctionType: "replace_source_value",
      correctedValue: "200",
      reason: "Self-test stable issue identity"
    });
    const stableAfter = new Map(dataQualityIssues.map(issue => [`${issue.issueType}:${(issue.canonicalFields || []).join(",")}`, issue.issueId]));
    console.assert(stableAfter.get("missing_required_value:material_id") === stableBefore.get("missing_required_value:material_id"), "Data remediation self-test failed: unrelated missing-material issue identity changed");
    console.assert(stableAfter.get("invalid_identifier:material_id") === stableBefore.get("invalid_identifier:material_id"), "Data remediation self-test failed: unrelated invalid-identifier issue identity changed");

    console.assert(!transactionEvidenceProfile(["Material Document", "Movement Type", "Stock Value"]).sufficient, "Data remediation self-test failed: transaction evidence must require document item/posting date");
    console.assert(transactionEvidenceProfile(["Material Document", "Posting Date", "Movement Type", "Quantity"]).sufficient, "Data remediation self-test failed: complete transaction evidence contract not recognized");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "MAT-PREVIEW", "Stock Value": "10000" }]
    );
    const previewIssue = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    const previewCorrections = [
      {
        issueKey: previewIssue.issueKey,
        issueId: previewIssue.issueId,
        issueType: previewIssue.issueType,
        sourceRowIndex: 1,
        sourceRowIndexes: [1],
        canonicalField: "plant",
        correctionType: "fill_missing_canonical_value",
        correctedValue: "DE01",
        status: "active"
      },
      {
        issueKey: previewIssue.issueKey,
        issueId: previewIssue.issueId,
        issueType: previewIssue.issueType,
        sourceRowIndex: 1,
        sourceRowIndexes: [1],
        canonicalField: "excess_value",
        correctionType: "fill_missing_canonical_value",
        correctedValue: "5000",
        status: "active"
      }
    ];
    const previewValues = withTemporaryDatasetForPreview({
      sourceRows: rawRows,
      corrections: previewCorrections,
      decisions: issueDecisions,
      mapping: currentDatasetMeta.columnMapping
    }, () => ({
      plant: normalizedRow(1)?.plant,
      excess: normalizedRow(1)?.excess_value
    }));
    console.assert(previewValues.plant === "DE01", "Data remediation self-test failed: canonical plant preview missing");
    console.assert(previewValues.excess === "5000", "Data remediation self-test failed: canonical excess preview missing");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Factory"],
      [{ Material: "MAT-FACTORY", "Stock Value": "1000", Factory: "DE01" }]
    );
    const previewMapping = mappingWithDraftChanges(currentDatasetMeta.columnMapping, [{
      sourceColumn: "Factory",
      canonicalField: "plant",
      correctionType: "mapping_change"
    }]);
    const mappedPreviewValue = withTemporaryDatasetForPreview({
      sourceRows: rawRows,
      corrections: dataCorrections,
      decisions: issueDecisions,
      mapping: previewMapping
    }, () => normalizedRow(1)?.plant);
    console.assert(mappedPreviewValue === "DE01", "Data remediation self-test failed: Factory -> Plant preview missing");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "No Demand Value"],
      [
        { Material: "MAT-1", "Stock Value": "abc", "No Demand Value": "-250" }
      ]
    );
    const invalidStock = dataQualityIssues.find(issue => issue.issueType === "invalid_numeric_value" && issue.canonicalFields.includes("stock_value"));
    const negativeRecovery = dataQualityIssues.find(issue => issue.issueType === "negative_recovery_input");
    console.assert(Boolean(invalidStock), "Data remediation self-test failed: invalid stock-value issue missing");
    console.assert(Boolean(negativeRecovery), "Data remediation self-test failed: negative recovery issue missing");
    addSelfTestCorrection({
      issueId: invalidStock.issueId,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      sourceColumn: "Stock Value",
      canonicalField: "stock_value",
      correctionType: "replace_value",
      originalValue: "abc",
      correctedValue: "1000",
      reason: "Self-test numeric replacement"
    });
    console.assert(rawRows[0]["Stock Value"] === "abc", "Data remediation self-test failed: rawRows must remain immutable");
    console.assert(applyDataCorrectionsToRawRows(rawRows, dataCorrections, { mutateExcluded: false }).rows[0]["Stock Value"] === "1000", "Data remediation self-test failed: corrected working row missing replacement");
    console.assert(originalDataQualitySnapshot && typeof originalDataQualitySnapshot.score === "number", "Data remediation self-test failed: original score snapshot missing");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Plant", "Material Description"],
      [
        { Material: "MAT-1", "Stock Value": "1000", Plant: "PL-1", "Material Description": "Part A" },
        { Material: "MAT-1", "Stock Value": "500", Plant: "PL-1", "Material Description": "Part Alpha" }
      ]
    );
    console.assert(dataQualityIssues.some(issue => issue.issueType === "inconsistent_master_data"), "Data remediation self-test failed: inconsistent master-data issue missing");

    const sourceColumn = sourceColumnForCanonicalField("material_description");
    addSelfTestCorrection({
      issueId: "DQ-SELF",
      sourceRowIndex: 2,
      sourceRowIndexes: [2],
      sourceColumn,
      canonicalField: "material_description",
      correctionType: "replace_value",
      originalValue: "Part Alpha",
      correctedValue: "Part A",
      reason: "Self-test mapping-compatible correction"
    });
    const activeBeforeMappingChange = activeDataCorrections().length;
    markIncompatibleCorrectionsStale();
    console.assert(activeDataCorrections().length === activeBeforeMappingChange, "Data remediation self-test failed: compatible correction should remain active");
    originalHeaders = ["Material", "Stock Value", "Plant"];
    markIncompatibleCorrectionsStale();
    console.assert(dataCorrections.some(correction => correction.status === "stale"), "Data remediation self-test failed: incompatible correction should become stale");
  } finally {
    restoreRemediationRuntimeState(snapshot);
  }
}

function runUniversalMissingDataRemediationSelfTests() {
  const snapshot = snapshotRemediationRuntimeState();
  try {
    currentLanguage = "en";

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "MAT-1", "Stock Value": "1000" }]
    );
    const missingOrg = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    console.assert(Boolean(missingOrg), "Universal missing-data self-test failed: missing organization issue missing");
    addSelfTestCorrection({
      issueId: missingOrg.issueId,
      issueType: missingOrg.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      canonicalField: "plant",
      correctionType: "fill_missing_canonical_value",
      resolutionMethod: "manual_value",
      correctedValue: "DE01",
      reason: "Self-test canonical plant override"
    });
    console.assert(rawRows[0].Plant === undefined, "Universal missing-data self-test failed: rawRows must not gain fake Plant column");
    console.assert(normalizedRow(1).plant === "DE01", "Universal missing-data self-test failed: canonical plant override missing");
    console.assert(enrichedRow(1).profit_center === "DE01", "Universal missing-data self-test failed: enrich fallback should use canonical plant");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Plant"],
      [{ Material: "MAT-1", "Stock Value": "1000", Plant: "" }]
    );
    const missingCell = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    addSelfTestCorrection({
      issueId: missingCell.issueId,
      issueType: missingCell.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      sourceColumn: "Plant",
      canonicalField: "plant",
      correctionType: "fill_source_value",
      resolutionMethod: "manual_value",
      correctedValue: "DE01",
      reason: "Self-test source missing cell"
    });
    console.assert(applyDataCorrectionsToRawRows(rawRows, dataCorrections, { mutateExcluded: false }).rows[0].Plant === "DE01", "Universal missing-data self-test failed: source missing cell not corrected in working row");
    console.assert(!dataQualityIssues.some(issue => issue.issueType === "missing_organizational_assignment"), "Universal missing-data self-test failed: source missing cell issue should resolve");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Factory"],
      [{ Material: "MAT-1", "Stock Value": "1000", Factory: "DE01" }]
    );
    const unmappedOrg = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    console.assert(unmappedOrg?.missingCause === "source_column_unmapped", "Universal missing-data self-test failed: unmapped source column cause missing");
    console.assert(applyColumnMappingFromRemediation({
      issueId: unmappedOrg.issueId,
      issueType: unmappedOrg.issueType,
      sourceColumn: "Factory",
      canonicalField: "plant",
      correctionType: "mapping_change",
      resolutionMethod: "map_source_column"
    }, { render: false, feedback: false }), "Universal missing-data self-test failed: direct remediation mapping failed");
    console.assert(normalizedRow(1).plant === "DE01", "Universal missing-data self-test failed: direct mapping did not populate canonical plant");
    console.assert(!dataQualityIssues.some(issue => issue.issueType === "missing_organizational_assignment"), "Universal missing-data self-test failed: direct mapping should resolve organization issue");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "", "Stock Value": "1000" }]
    );
    const missingMaterial = dataQualityIssues.find(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("material_id"));
    addSelfTestCorrection({
      issueId: missingMaterial.issueId,
      issueType: missingMaterial.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      canonicalField: "material_id",
      correctionType: "fill_missing_canonical_value",
      resolutionMethod: "manual_value",
      correctedValue: "0000123",
      reason: "Self-test leading zero material"
    });
    console.assert(normalizedRow(1).material_id === "0000123", "Universal missing-data self-test failed: leading zeros not preserved");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "MAT-1", "Stock Value": "" }]
    );
    const missingStock = dataQualityIssues.find(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("stock_value"));
    addSelfTestCorrection({
      issueId: missingStock.issueId,
      issueType: missingStock.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      canonicalField: "stock_value",
      correctionType: "fill_missing_canonical_value",
      resolutionMethod: "manual_value",
      correctedValue: "0",
      reason: "Self-test explicit zero stock value"
    });
    console.assert(normalizedRow(1).stock_value === "0", "Universal missing-data self-test failed: explicit zero not preserved in normalized row");
    console.assert(enrichedRow(1).stock_value === 0, "Universal missing-data self-test failed: explicit zero not accepted in enriched row");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [
        { Material: "MAT-1", "Stock Value": "1000" },
        { Material: "MAT-2", "Stock Value": "2000" },
        { Material: "MAT-3", "Stock Value": "3000" }
      ]
    );
    const multiOrg = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    ["DE01", "DE02", "FR01"].forEach((value, index) => {
      addSelfTestCorrection({
        issueId: multiOrg.issueId,
        issueType: multiOrg.issueType,
        sourceRowIndex: index + 1,
        sourceRowIndexes: [index + 1],
        canonicalField: "plant",
        correctionType: "fill_missing_canonical_value",
        resolutionMethod: "manual_value",
        correctedValue: value,
        reason: "Self-test row-specific plant values"
      });
    });
    console.assert(normalizedRow(1).plant === "DE01" && normalizedRow(2).plant === "DE02" && normalizedRow(3).plant === "FR01", "Universal missing-data self-test failed: row-specific values not preserved");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      Array.from({ length: 10 }, (_, index) => ({ Material: `MAT-${index + 1}`, "Stock Value": String((index + 1) * 100) }))
    );
    const partialOrg = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    addSelfTestCorrection({
      issueId: partialOrg.issueId,
      issueType: partialOrg.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1, 2, 3, 4, 5, 6],
      canonicalField: "plant",
      correctionType: "fill_missing_canonical_value",
      resolutionMethod: "manual_value",
      correctedValue: "DE01",
      reason: "Self-test partial plant resolution"
    });
    const partialIssue = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    console.assert(partialIssue?.status === "partially_resolved", "Universal missing-data self-test failed: partial issue status missing");
    console.assert(issueResolutionProgress(partialIssue).resolved === 6 && issueResolutionProgress(partialIssue).total === 10, "Universal missing-data self-test failed: partial progress should be 6 / 10");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "MAT-1", "Stock Value": "1000" }]
    );
    const acceptOrg = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    createIssueDecision(acceptOrg, "accepted_missing", {
      sourceRowIndexes: [1],
      canonicalFields: ["plant"],
      reason: "Self-test accept missing",
      rebuild: false,
      feedback: false
    });
    rebuildDatasetFromCorrections({ render: false });
    const acceptedIssue = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    console.assert(acceptedIssue?.status === "accepted_missing", "Universal missing-data self-test failed: accepted missing status missing");
    console.assert(!hasContentValue(normalizedRow(1).plant), "Universal missing-data self-test failed: accepted missing must remain empty");
    console.assert(buildIssueLogRows().some(row => row.includes("accepted_missing")), "Universal missing-data self-test failed: accepted missing not traceable in issue log");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "MAT-1", "Stock Value": "1000" }]
    );
    const exportOrg = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    addSelfTestCorrection({
      issueId: exportOrg.issueId,
      issueType: exportOrg.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      canonicalField: "plant",
      correctionType: "fill_missing_canonical_value",
      resolutionMethod: "manual_value",
      correctedValue: "DE01",
      reason: "Self-test corrected export"
    });
    const correctedExport = correctedRawRowsForExport();
    console.assert(correctedExport[0].includes("Plant"), "Universal missing-data self-test failed: corrected export should append Plant");
    console.assert(correctedExport[0].includes("obsoliq_corrected") && correctedExport[0].includes("obsoliq_source_row_index"), "Universal missing-data self-test failed: corrected export metadata missing");
  } finally {
    restoreRemediationRuntimeState(snapshot);
  }
}

function runDataQualityIssueLedgerSelfTests() {
  const snapshot = snapshotRemediationRuntimeState();
  try {
    currentLanguage = "en";

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Profit Center", "No Demand Value"],
      [
        { Material: "MAT-1", "Stock Value": "1000", "Profit Center": "PC-1", "No Demand Value": "250" },
        { Material: "MAT-1", "Stock Value": "1000", "Profit Center": "PC-1", "No Demand Value": "250" }
      ]
    );
    const initialOpen = remediationSummaryStats(dataQualityIssues).open;
    const exactDuplicate = dataQualityIssues.find(issue => issue.issueType === "exact_duplicate");
    console.assert(Boolean(exactDuplicate), "Issue ledger self-test failed: exact duplicate missing");
    console.assert(defaultCorrectionDraft(exactDuplicate) === null, "Issue ledger self-test failed: exact duplicate must not preselect exclusion");
    addSelfTestCorrection({
      issueKey: exactDuplicate.issueKey,
      issueId: exactDuplicate.issueId,
      issueType: exactDuplicate.issueType,
      sourceRowIndexes: [2],
      correctionType: "exclude_exact_duplicate",
      reason: "Ledger duplicate exclusion"
    });
    let ledgerEntry = ledgerEntryForIssueKey(exactDuplicate.issueKey);
    console.assert(ledgerEntry?.currentStatus === "corrected" && ledgerEntry.currentlyDetected === false, "Issue ledger self-test failed: excluded duplicate should be corrected in ledger");
    console.assert(remediationSummaryStats(dataQualityIssues).corrected === 1, "Issue ledger self-test failed: resolved issue metric should count corrected disappeared issue");
    dataCorrections = dataCorrections.map(correction => ({ ...correction, status: "undone" }));
    rebuildDatasetFromCorrections({ render: false });
    ledgerEntry = ledgerEntryForIssueKey(exactDuplicate.issueKey);
    console.assert(ledgerEntry?.currentStatus === "open" && ledgerEntry.currentlyDetected === true, "Issue ledger self-test failed: undo should reopen duplicate issue");

    const allFieldHtml = renderAllSourceFieldComparison(dataQualityIssues.find(issue => issue.issueType === "exact_duplicate"));
    console.assert((allFieldHtml.match(/<tr/g) || []).length >= originalHeaders.length + 1, "Issue ledger self-test failed: full source comparison must include all source columns");

    const keptIssue = dataQualityIssues.find(issue => issue.issueType === "exact_duplicate");
    createIssueDecision(keptIssue, "kept_as_valid", {
      sourceRowIndexes: keptIssue.sourceRowIndexes,
      reason: "Ledger keep valid",
      correctedValue: t("keepBothAsValidPositions"),
      rebuild: false,
      feedback: false
    });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(remediationSummaryStats(dataQualityIssues).acceptedExceptions === 1, "Issue ledger self-test failed: keep valid should count as accepted exception");
    console.assert(remediationSummaryStats(dataQualityIssues).corrected === 0, "Issue ledger self-test failed: keep valid must not count as corrected");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Profit Center", "Division", "Program"],
      [
        { Material: "MAT-2", "Stock Value": "1000", "Profit Center": "PC-2", Division: "02", Program: "PROG-A" },
        { Material: "MAT-2", "Stock Value": "500", "Profit Center": "PC-2", Division: "02", Program: "PROG-A" }
      ]
    );
    const duplicateCandidate = dataQualityIssues.find(issue => issue.issueType === "duplicate_key_candidate");
    const comparison = sourceValueComparison(duplicateCandidate);
    const matchingHtml = renderMatchingValuesTable(duplicateCandidate);
    console.assert(comparison.matching.length > 0 && matchingHtml.includes(sourceDisplayLabel(comparison.matching[0].column)), "Issue ledger self-test failed: possible duplicate matching values should come from comparison output");
    createIssueDecision(duplicateCandidate, "reviewed", {
      sourceRowIndexes: duplicateCandidate.sourceRowIndexes,
      reason: "Ledger reviewed",
      rebuild: false,
      feedback: false
    });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(remediationSummaryStats(dataQualityIssues).open > 0, "Issue ledger self-test failed: reviewed issue should remain unresolved");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "MAT-3", "Stock Value": "1000" }]
    );
    const missingOrg = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    createIssueDecision(missingOrg, "accepted_missing", {
      sourceRowIndexes: missingOrg.sourceRowIndexes,
      canonicalFields: missingOrg.canonicalFields,
      reason: "Ledger accept missing",
      correctedValue: t("acceptedMissing"),
      rebuild: false,
      feedback: false
    });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(remediationSummaryStats(dataQualityIssues).acceptedExceptions === 1, "Issue ledger self-test failed: accepted missing should count as accepted exception");
    console.assert(remediationSummaryStats(dataQualityIssues).corrected === 0, "Issue ledger self-test failed: accepted missing must not count as corrected");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "MAT-4", "Stock Value": "1000" }]
    );
    console.assert(renderRemediationScoreComparison(buildDataQualityModel()) === "", "Issue ledger self-test failed: score comparison should be hidden before remediation");
    const scoreIssue = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    addSelfTestCorrection({
      issueKey: scoreIssue.issueKey,
      issueId: scoreIssue.issueId,
      issueType: scoreIssue.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      canonicalField: "plant",
      correctionType: "fill_missing_canonical_value",
      resolutionMethod: "manual_value",
      correctedValue: "DE01",
      reason: "Ledger score comparison"
    });
    console.assert(renderRemediationScoreComparison(buildDataQualityModel()).includes("remediation-score-strip"), "Issue ledger self-test failed: score comparison should appear after remediation");
    resetAllDataCorrections();
    console.assert(remediationSummaryStats(dataQualityIssues).open === initialOpen || remediationSummaryStats(dataQualityIssues).corrected === 0, "Issue ledger self-test failed: reset should clear corrected metrics");
  } finally {
    restoreRemediationRuntimeState(snapshot);
  }
}

function runRemediationLifecycleHardeningSelfTests() {
  const snapshot = snapshotRemediationRuntimeState();
  try {
    currentLanguage = "en";

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Factory"],
      [{ Material: "MAT-FAC", "Stock Value": "1000", Factory: "DE01" }]
    );
    const orgIssue = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    console.assert(Boolean(orgIssue), "AP 14.3.1.6 self-test failed: organization issue missing before mapping");
    console.assert(applyColumnMappingFromRemediation({
      issueKey: orgIssue.issueKey,
      issueId: orgIssue.issueId,
      issueType: orgIssue.issueType,
      sourceColumn: "Factory",
      canonicalField: "plant",
      correctionType: "mapping_change",
      resolutionMethod: "map_source_column"
    }, { render: false, feedback: false }), "AP 14.3.1.6 self-test failed: remediation mapping did not apply");
    let orgEntry = ledgerEntryForIssueKey(orgIssue.issueKey);
    console.assert(orgEntry?.currentStatus === "corrected" && orgEntry.resolutionType === "mapping_change", "AP 14.3.1.6 self-test failed: mapping resolution not reflected in ledger");
    console.assert(remediationSummaryStats(dataQualityIssues).corrected === 1, "AP 14.3.1.6 self-test failed: mapping-only resolution should count as resolved");
    console.assert(remediationSummaryStats(dataQualityIssues).correctedRows === 0, "AP 14.3.1.6 self-test failed: mapping-only resolution must not count corrected rows");
    undoLastRemediationAction({ feedback: false });
    orgEntry = ledgerEntryForIssueKey(orgIssue.issueKey);
    console.assert(sourceColumnForCanonicalField("plant") !== "Factory", "AP 14.3.1.6 self-test failed: undo did not restore previous mapping");
    console.assert(orgEntry?.currentStatus === "open" && orgEntry.currentlyDetected === true, "AP 14.3.1.6 self-test failed: undo did not reopen mapping-resolved issue");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Factory"],
      [{ Material: "MAT-FULL", "Stock Value": "1000", Factory: "DE02" }]
    );
    const fullAssistantIssue = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    pendingUploadContext = {
      fileName: "Self-test",
      sourceLabel: "Self-test",
      sourceType: "self-test",
      headers: originalHeaders,
      rows: rawRows,
      sourceColumnMetadata,
      automaticMapping: createAutomaticColumnMapping({ headers: originalHeaders, rows: rawRows, sourceColumnMetadata }),
      approvedMapping: mappingWithDraftChanges(currentDatasetMeta.columnMapping, [{ sourceColumn: "Factory", canonicalField: "plant" }]),
      baseColumnMapping: cloneColumnMapping(currentDatasetMeta.baseColumnMapping),
      preserveActionStatus: true,
      preserveRemediation: true,
      statusSnapshot: actionStatusSnapshotForCurrentRows()
    };
    console.assert(continueUploadWithMapping(pendingUploadContext.approvedMapping), "AP 14.3.1.6 self-test failed: full mapping assistant apply failed");
    let fullEntry = ledgerEntryForIssueKey(fullAssistantIssue.issueKey);
    console.assert(fullEntry?.currentStatus === "corrected" && fullEntry.resolutionType === "mapping_change", "AP 14.3.1.6 self-test failed: full mapping assistant resolution not reconciled");
    undoLastRemediationAction();
    fullEntry = ledgerEntryForIssueKey(fullAssistantIssue.issueKey);
    console.assert(fullEntry?.currentStatus === "open" && fullEntry.currentlyDetected === true, "AP 14.3.1.6 self-test failed: full mapping assistant undo did not reopen issue");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Factory"],
      [{ Material: "MAT-RESET", "Stock Value": "", Factory: "DE03" }]
    );
    const resetOrg = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    const resetStock = dataQualityIssues.find(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("stock_value"));
    applyColumnMappingFromRemediation({
      issueKey: resetOrg.issueKey,
      issueId: resetOrg.issueId,
      issueType: resetOrg.issueType,
      sourceColumn: "Factory",
      canonicalField: "plant",
      correctionType: "mapping_change",
      resolutionMethod: "map_source_column"
    }, { render: false, feedback: false });
    createDataCorrection({
      issueKey: resetStock.issueKey,
      issueId: resetStock.issueId,
      issueType: resetStock.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      sourceColumn: "Stock Value",
      canonicalField: "stock_value",
      correctionType: "fill_source_value",
      correctedValue: "1000",
      reason: "Lifecycle reset"
    }, { rebuild: false, feedback: false });
    createIssueDecision(resetOrg, "reviewed", { rebuild: false, feedback: false });
    rebuildDatasetFromCorrections({ render: false });
    resetAllRemediation();
    console.assert(activeDataCorrections().length === 0 && activeIssueDecisions().length === 0 && activeRemediationActions().length === 0, "AP 14.3.1.6 self-test failed: reset did not clear active remediation state");
    console.assert(sourceColumnForCanonicalField("plant") !== "Factory", "AP 14.3.1.6 self-test failed: reset did not restore base mapping");
    console.assert(remediationSummaryStats(dataQualityIssues).corrected === 0, "AP 14.3.1.6 self-test failed: reset did not clear resolved metrics");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "MAT-HIST", "Stock Value": "" }]
    );
    const missingStock = dataQualityIssues.find(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("stock_value"));
    createDataCorrection({
      issueKey: missingStock.issueKey,
      issueId: missingStock.issueId,
      issueType: missingStock.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      sourceColumn: "Stock Value",
      canonicalField: "stock_value",
      correctionType: "fill_source_value",
      correctedValue: "1250",
      reason: "Historical issue"
    }, { rebuild: false, feedback: false });
    rebuildDatasetFromCorrections({ render: false });
    const historicalEntry = ledgerEntryForIssueKey(missingStock.issueKey);
    console.assert(historicalEntry?.currentStatus === "corrected" && historicalEntry.currentlyDetected === false, "AP 14.3.1.6 self-test failed: corrected missing stock issue not historical");
    const historicalIssue = issueForReview(missingStock.issueId);
    console.assert(issueIsHistorical(historicalIssue) && renderHistoricalIssueDetail(historicalIssue).includes(t("historicalIssueReadOnly")), "AP 14.3.1.6 self-test failed: historical issue not reviewable");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [
        { Material: "MAT-INV-1", "Stock Value": "abc" },
        { Material: "MAT-INV-2", "Stock Value": "def" },
        { Material: "MAT-INV-3", "Stock Value": "ghi" }
      ]
    );
    let invalidIssue = dataQualityIssues.find(issue => issue.issueType === "invalid_numeric_value" && issue.canonicalFields.includes("stock_value"));
    [1, 2].forEach(rowIndex => addSelfTestCorrection({
      issueKey: invalidIssue.issueKey,
      issueId: invalidIssue.issueId,
      issueType: invalidIssue.issueType,
      sourceRowIndex: rowIndex,
      sourceRowIndexes: [rowIndex],
      sourceColumn: "Stock Value",
      canonicalField: "stock_value",
      correctionType: "replace_source_value",
      correctedValue: String(rowIndex * 100),
      reason: "Multi-row invalid"
    }));
    invalidIssue = dataQualityIssues.find(issue => issue.issueType === "invalid_numeric_value" && issue.canonicalFields.includes("stock_value"));
    console.assert(invalidIssue?.status === "partially_resolved" && issueResolutionState(invalidIssue).resolvedRows === 2, "AP 14.3.1.6 self-test failed: multi-row invalid issue did not remain partial");
    addSelfTestCorrection({
      issueKey: invalidIssue.issueKey,
      issueId: invalidIssue.issueId,
      issueType: invalidIssue.issueType,
      sourceRowIndex: 3,
      sourceRowIndexes: [3],
      sourceColumn: "Stock Value",
      canonicalField: "stock_value",
      correctionType: "replace_source_value",
      correctedValue: "300",
      reason: "Multi-row invalid final"
    });
    let invalidEntry = ledgerEntryForIssueKey(invalidIssue.issueKey);
    console.assert(invalidEntry?.currentStatus === "corrected" && invalidEntry.currentlyDetected === false, "AP 14.3.1.6 self-test failed: all invalid rows should resolve issue");
    undoLastRemediationAction();
    invalidIssue = dataQualityIssues.find(issue => issue.issueType === "invalid_numeric_value" && issue.canonicalFields.includes("stock_value"));
    console.assert(invalidIssue?.status === "partially_resolved" && issueResolutionState(invalidIssue).resolvedRows === 2, "AP 14.3.1.6 self-test failed: undo did not restore partial invalid state");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Excess Value"],
      [
        { Material: "MAT-NEG-1", "Stock Value": "100", "Excess Value": "-10" },
        { Material: "MAT-NEG-2", "Stock Value": "100", "Excess Value": "-20" },
        { Material: "MAT-NEG-3", "Stock Value": "100", "Excess Value": "-30" }
      ]
    );
    let negativeIssue = dataQualityIssues.find(issue => issue.issueType === "negative_recovery_input");
    [1, 2].forEach(rowIndex => addSelfTestCorrection({
      issueKey: negativeIssue.issueKey,
      issueId: negativeIssue.issueId,
      issueType: negativeIssue.issueType,
      sourceRowIndex: rowIndex,
      sourceRowIndexes: [rowIndex],
      sourceColumn: "Excess Value",
      canonicalField: "excess_value",
      correctionType: "replace_source_value",
      correctedValue: "0",
      reason: "Negative recovery partial"
    }));
    negativeIssue = dataQualityIssues.find(issue => issue.issueType === "negative_recovery_input");
    console.assert(negativeIssue?.status === "partially_resolved" && issueResolutionState(negativeIssue).resolvedRows === 2, "AP 14.3.1.6 self-test failed: negative recovery issue should remain partial");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Material Description"],
      [
        { Material: "MAT-MD", "Stock Value": "100", "Material Description": "Valve" },
        { Material: "MAT-MD", "Stock Value": "100", "Material Description": "Valve Rev B" },
        { Material: "MAT-MD", "Stock Value": "100", "Material Description": "Valve Rev C" }
      ]
    );
    let masterIssue = dataQualityIssues.find(issue => issue.issueType === "inconsistent_master_data");
    const descriptionColumn = sourceColumnForCanonicalField("material_description");
    addSelfTestCorrection({
      issueKey: masterIssue.issueKey,
      issueId: masterIssue.issueId,
      issueType: masterIssue.issueType,
      sourceRowIndex: 2,
      sourceRowIndexes: [2],
      sourceColumn: descriptionColumn,
      canonicalField: "material_description",
      correctionType: "replace_source_value",
      correctedValue: "Valve",
      reason: "Partial master data"
    });
    masterIssue = dataQualityIssues.find(issue => issue.issueType === "inconsistent_master_data");
    console.assert(Boolean(masterIssue) && masterIssue.status === "partially_resolved", "AP 14.3.1.6 self-test failed: inconsistent master data resolved too early");
    addSelfTestCorrection({
      issueKey: masterIssue.issueKey,
      issueId: masterIssue.issueId,
      issueType: masterIssue.issueType,
      sourceRowIndex: 3,
      sourceRowIndexes: [3],
      sourceColumn: descriptionColumn,
      canonicalField: "material_description",
      correctionType: "replace_source_value",
      correctedValue: "Valve",
      reason: "Final master data"
    });
    const masterEntry = ledgerEntryForIssueKey(masterIssue.issueKey);
    console.assert(masterEntry?.currentStatus === "corrected" && masterEntry.currentlyDetected === false, "AP 14.3.1.6 self-test failed: consistent master data not marked corrected after violation disappeared");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Plant"],
      [
        { Material: "MAT-DUP", "Stock Value": "100", Plant: "DE01" },
        { Material: "MAT-DUP", "Stock Value": "100", Plant: "DE01" },
        { Material: "MAT-DUP", "Stock Value": "100", Plant: "DE01" },
        { Material: "MAT-DUP", "Stock Value": "100", Plant: "DE01" }
      ]
    );
    let exactDuplicate = dataQualityIssues.find(issue => issue.issueType === "exact_duplicate");
    console.assert(exactDuplicate?.sourceRowIndexes.length === 4, "AP 14.3.1.6 self-test failed: 4-row exact duplicate group missing");
    console.assert((renderDuplicateResolutionControls(exactDuplicate).match(/name="remediationExactDuplicateDecision"/g) || []).length === 5, "AP 14.3.1.6 self-test failed: exact duplicate controls do not expose four keeper options plus keep-all");
    addSelfTestCorrection({
      issueKey: exactDuplicate.issueKey,
      issueId: exactDuplicate.issueId,
      issueType: exactDuplicate.issueType,
      sourceRowIndexes: [1, 2, 4],
      correctionType: "exclude_exact_duplicate",
      correctedValue: "Keep row 3",
      reason: "4-row duplicate"
    });
    let duplicateEntry = ledgerEntryForIssueKey(exactDuplicate.issueKey);
    console.assert(enrichedRows.length === 1 && duplicateEntry?.currentStatus === "corrected", "AP 14.3.1.6 self-test failed: 4-row duplicate exclusion did not leave one active row");
    undoLastRemediationAction();
    exactDuplicate = dataQualityIssues.find(issue => issue.issueType === "exact_duplicate");
    console.assert(enrichedRows.length === 4 && exactDuplicate?.status === "open", "AP 14.3.1.6 self-test failed: undo did not restore exact duplicate group");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Profit Center"],
      [
        { Material: "MAT-CAND", "Stock Value": "100", "Profit Center": "PC-1" },
        { Material: "MAT-CAND", "Stock Value": "200", "Profit Center": "PC-1" }
      ]
    );
    const candidate = dataQualityIssues.find(issue => issue.issueType === "duplicate_key_candidate");
    const openBeforeReviewed = remediationSummaryStats(dataQualityIssues).open;
    console.assert(defaultCorrectionDraft(candidate) === null, "AP 14.3.1.6 self-test failed: duplicate candidate must not have default decision");
    createIssueDecision(candidate, "reviewed", { sourceRowIndexes: candidate.sourceRowIndexes, rebuild: false, feedback: false });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(remediationSummaryStats(dataQualityIssues).open === openBeforeReviewed && remediationSummaryStats(dataQualityIssues).acceptedExceptions === 0, "AP 14.3.1.6 self-test failed: reviewed candidate should remain unresolved");
    createIssueDecision(candidate, "kept_as_valid", { sourceRowIndexes: candidate.sourceRowIndexes, rebuild: false, feedback: false });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(remediationSummaryStats(dataQualityIssues).acceptedExceptions === 1, "AP 14.3.1.6 self-test failed: keep as valid should count as accepted exception");
    undoLastRemediationAction();
    console.assert(remediationSummaryStats(dataQualityIssues).acceptedExceptions === 0, "AP 14.3.1.6 self-test failed: undo keep-valid should restore accepted exception metric");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [
        { Material: "Valve  Body", "Stock Value": "100" },
        { Material: "Valve Body", "Stock Value": "100" }
      ]
    );
    const normalizedDuplicate = dataQualityIssues.find(issue => issue.issueType === "exact_duplicate");
    const normalizedComparison = sourceValueComparison(normalizedDuplicate);
    console.assert(Boolean(normalizedDuplicate) && normalizedComparison.differing.length === 0, "AP 14.3.1.6 self-test failed: duplicate detection and comparison normalization differ");
  } finally {
    restoreRemediationRuntimeState(snapshot);
  }
}

function runRemediationLifecycleSemanticsCompletionSelfTests() {
  const snapshot = snapshotRemediationRuntimeState();
  try {
    currentLanguage = "en";

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Profit Center"],
      [
        { Material: "MAT-CAND", "Stock Value": "100", "Profit Center": "PC-1" },
        { Material: "MAT-CAND", "Stock Value": "200", "Profit Center": "PC-1" }
      ]
    );
    let candidate = dataQualityIssues.find(issue => issue.issueType === "duplicate_key_candidate");
    createIssueDecision(candidate, "reviewed", { sourceRowIndexes: candidate.sourceRowIndexes, rebuild: false, feedback: false });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(dataQualityIssues.find(issue => issue.issueKey === candidate.issueKey)?.status === "reviewed", "AP 14.3.1.7 self-test failed: reviewed candidate should remain reviewed before correction");
    createDataCorrection({
      issueKey: candidate.issueKey,
      issueId: candidate.issueId,
      issueType: candidate.issueType,
      sourceRowIndex: 2,
      sourceRowIndexes: [2],
      correctionType: "exclude_row",
      correctedValue: "Exclude row 2",
      reason: "Reviewed then corrected"
    }, { rebuild: false, feedback: false });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(ledgerEntryForIssueKey(candidate.issueKey)?.currentStatus === "corrected", "AP 14.3.1.7 self-test failed: later row exclusion should supersede reviewed decision");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Plant"],
      [{ Material: "MAT-MISS", "Stock Value": "", Plant: "DE01" }]
    );
    let missingStock = dataQualityIssues.find(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("stock_value"));
    createIssueDecision(missingStock, "accepted_missing", {
      sourceRowIndexes: missingStock.sourceRowIndexes,
      canonicalFields: missingStock.canonicalFields,
      correctedValue: t("acceptedMissing"),
      rebuild: false,
      feedback: false
    });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(dataQualityIssues.find(issue => issue.issueKey === missingStock.issueKey)?.status === "accepted_missing", "AP 14.3.1.7 self-test failed: accepted missing status missing");
    createDataCorrection({
      issueKey: missingStock.issueKey,
      issueId: missingStock.issueId,
      issueType: missingStock.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      sourceColumn: "Stock Value",
      canonicalField: "stock_value",
      correctionType: "fill_source_value",
      correctedValue: "12500",
      reason: "Accepted then corrected"
    }, { rebuild: false, feedback: false });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(ledgerEntryForIssueKey(missingStock.issueKey)?.currentStatus === "corrected", "AP 14.3.1.7 self-test failed: later real value should supersede accepted missing");
    console.assert(remediationSummaryStats(dataQualityIssues).acceptedExceptions === 0, "AP 14.3.1.7 self-test failed: accepted exception metric should drop after correction");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [
        { Material: "MAT-MIX-1", "Stock Value": "" },
        { Material: "MAT-MIX-2", "Stock Value": "" }
      ]
    );
    let mixedIssue = dataQualityIssues.find(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("stock_value"));
    createDataCorrection({
      issueKey: mixedIssue.issueKey,
      issueId: mixedIssue.issueId,
      issueType: mixedIssue.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      sourceColumn: "Stock Value",
      canonicalField: "stock_value",
      correctionType: "fill_source_value",
      correctedValue: "100",
      reason: "Mixed correction"
    }, { rebuild: false, feedback: false });
    createIssueDecision(mixedIssue, "accepted_missing", {
      sourceRowIndexes: [2],
      canonicalFields: mixedIssue.canonicalFields,
      correctedValue: t("acceptedMissing"),
      rebuild: false,
      feedback: false
    });
    rebuildDatasetFromCorrections({ render: false });
    console.assert(ledgerEntryForIssueKey(mixedIssue.issueKey)?.currentStatus === "accepted_exception", "AP 14.3.1.7 self-test failed: mixed corrected/accepted group should be accepted_exception");
    console.assert(remediationSummaryStats(dataQualityIssues).corrected === 0, "AP 14.3.1.7 self-test failed: mixed accepted group must not count as corrected");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Factory"],
      [{ Material: "MAT-STALE", "Stock Value": "1000", Factory: "" }]
    );
    const factoryToPlant = mappingWithDraftChanges(currentDatasetMeta.columnMapping, [{ sourceColumn: "Factory", canonicalField: "plant" }]);
    setCurrentColumnMapping(factoryToPlant);
    createDataCorrection({
      issueKey: "stale-source-test",
      issueId: "DQ-STALE",
      issueType: "missing_organizational_assignment",
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      sourceColumn: "Factory",
      canonicalField: "plant",
      correctionType: "fill_source_value",
      correctedValue: "DE01",
      reason: "Stale mapping compatibility"
    }, { rebuild: false, feedback: false });
    const correctionId = dataCorrections[dataCorrections.length - 1].correctionId;
    const factoryToProfitCenter = mappingWithDraftChanges(currentDatasetMeta.columnMapping, [{ sourceColumn: "Factory", canonicalField: "profit_center" }]);
    setCurrentColumnMapping(factoryToProfitCenter);
    rebuildDatasetFromCorrections({ render: false });
    console.assert(dataCorrections.find(correction => correction.correctionId === correctionId)?.status === "stale", "AP 14.3.1.7 self-test failed: source correction should become stale after remapping to another canonical field");
    setCurrentColumnMapping(factoryToPlant);
    rebuildDatasetFromCorrections({ render: false });
    console.assert(dataCorrections.find(correction => correction.correctionId === correctionId)?.status === "active", "AP 14.3.1.7 self-test failed: stale correction should reactivate when original mapping returns");
    dataCorrections = dataCorrections.map(correction => correction.correctionId === correctionId ? { ...correction, status: "undone" } : correction);
    setCurrentColumnMapping(factoryToProfitCenter);
    rebuildDatasetFromCorrections({ render: false });
    setCurrentColumnMapping(factoryToPlant);
    rebuildDatasetFromCorrections({ render: false });
    console.assert(dataCorrections.find(correction => correction.correctionId === correctionId)?.status === "undone", "AP 14.3.1.7 self-test failed: explicitly undone correction must not reactivate");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Material Description"],
      [
        { Material: "MAT-MD-KEEP", "Stock Value": "100", "Material Description": "Valve" },
        { Material: "MAT-MD-KEEP", "Stock Value": "100", "Material Description": "Valve Rev B" }
      ]
    );
    const masterIssue = dataQualityIssues.find(issue => issue.issueType === "inconsistent_master_data");
    const openBefore = remediationSummaryStats(dataQualityIssues).open;
    createIssueDecision(masterIssue, "accepted_exception", {
      sourceRowIndexes: masterIssue.sourceRowIndexes,
      canonicalFields: masterIssue.canonicalFields,
      correctedValue: t("keepDifferingValuesAsValid"),
      rebuild: false,
      feedback: false
    });
    rebuildDatasetFromCorrections({ render: false });
    const acceptedMaster = dataQualityIssues.find(issue => issue.issueKey === masterIssue.issueKey);
    console.assert(acceptedMaster?.status === "accepted_exception", "AP 14.3.1.7 self-test failed: accepted master-data variation status missing");
    console.assert(remediationSummaryStats(dataQualityIssues).open === openBefore - 1 && remediationSummaryStats(dataQualityIssues).acceptedExceptions === 1, "AP 14.3.1.7 self-test failed: accepted master-data variation metrics wrong");
    undoLastRemediationAction();
    console.assert(dataQualityIssues.find(issue => issue.issueKey === masterIssue.issueKey)?.status === "open", "AP 14.3.1.7 self-test failed: undo accepted variation should reopen issue");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Factory"],
      [
        { Material: "MAT-MAP-1", "Stock Value": "1000", Factory: "DE01" },
        { Material: "MAT-MAP-2", "Stock Value": "abc", Factory: "DE02" }
      ]
    );
    const mapOrg = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    const mapInvalid = dataQualityIssues.find(issue => issue.issueType === "invalid_numeric_value");
    applyColumnMappingFromRemediation({
      issueKey: mapOrg.issueKey,
      issueId: mapOrg.issueId,
      issueType: mapOrg.issueType,
      sourceColumn: "Factory",
      canonicalField: "plant",
      correctionType: "mapping_change",
      resolutionMethod: "map_source_column"
    }, { render: false, feedback: false });
    const mappingAction = activeMappingChangeActions().slice(-1)[0];
    console.assert(mappingAction?.payload?.resolvedIssueKeys?.includes(mapOrg.issueKey), "AP 14.3.1.7 self-test failed: mapping action should record actually resolved issue");
    console.assert(!mappingAction?.payload?.resolvedIssueKeys?.includes(mapInvalid.issueKey), "AP 14.3.1.7 self-test failed: mapping action should not claim unrelated issue resolved");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value"],
      [{ Material: "MAT-REOPEN", "Stock Value": "" }]
    );
    const reopenIssue = dataQualityIssues.find(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("stock_value"));
    createDataCorrection({
      issueKey: reopenIssue.issueKey,
      issueId: reopenIssue.issueId,
      issueType: reopenIssue.issueType,
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      sourceColumn: "Stock Value",
      canonicalField: "stock_value",
      correctionType: "fill_source_value",
      correctedValue: "900",
      reason: "Reopen test"
    }, { rebuild: false, feedback: false });
    rebuildDatasetFromCorrections({ render: false });
    const resolvedEntry = ledgerEntryForIssueKey(reopenIssue.issueKey);
    rebuildDatasetFromCorrections({ render: false });
    console.assert(!ledgerEntryForIssueKey(reopenIssue.issueKey)?.reopenedAt, "AP 14.3.1.7 self-test failed: normal rebuild must not set reopenedAt");
    undoLastRemediationAction();
    const reopenedEntry = ledgerEntryForIssueKey(reopenIssue.issueKey);
    console.assert(resolvedEntry?.currentStatus === "corrected" && reopenedEntry?.reopenedAt, "AP 14.3.1.7 self-test failed: undo should set reopenedAt");
  } finally {
    restoreRemediationRuntimeState(snapshot);
  }
}

function runDirtySampleDataSelfTests() {
  const expectations = window.sampleDataQualityExpectations;
  if (!window.sampleCsv || !expectations) return;
  const snapshot = snapshotRemediationRuntimeState();
  try {
    currentLanguage = "en";
    const rawLines = window.sampleCsv.trim().split(/\r?\n/);
    const rawCounts = rawLines.map(line => line.split(",").length);
    const expectedColumnCount = rawCounts[0];
    console.assert(
      rawCounts.every(count => count === expectedColumnCount),
      "Dirty sample self-test failed: inconsistent CSV column count"
    );

    const parsed = parseDelimited(window.sampleCsv);
    console.assert(parsed.headers.includes("Factory"), "Dirty sample self-test failed: Factory source column missing");
    console.assert(parsed.rows.length >= 100, "Dirty sample self-test failed: sample row count should remain approximately 100");
    console.assert(parsed.rows.length <= 105, "Dirty sample self-test failed: only deliberate demo rows should be appended");
    const materialCount = new Set(parsed.rows.map(row => row.Material).filter(value => /^MAT-/.test(String(value || "")))).size;
    console.assert(materialCount >= 98, "Dirty sample self-test failed: distinct material numbers should remain approximately preserved");

    loadRemediationSelfTestDataset(parsed.headers, parsed.rows);
    const issueTypes = new Set(dataQualityIssues.map(issue => issue.issueType));
    (expectations.expectedIssueTypes || []).forEach(issueType => {
      console.assert(issueTypes.has(issueType), `Dirty sample self-test failed: expected issue type missing: ${issueType}`);
    });
    console.assert(dataQualityIssues.length >= expectations.minimumOpenIssues, "Dirty sample self-test failed: expected minimum issue count not reached");

    const missingMaterial = dataQualityIssues.find(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("material_id"));
    const missingStock = dataQualityIssues.find(issue => issue.issueType === "missing_required_value" && issue.canonicalFields.includes("stock_value"));
    const missingOrganization = dataQualityIssues.find(issue => issue.issueType === "missing_organizational_assignment");
    const missingWorkflow = dataQualityIssues.find(issue => issue.issueType === "missing_workflow_assignment");
    const missingRecovery = dataQualityIssues.find(issue => issue.issueType === "missing_recovery_input");
    const invalidStock = dataQualityIssues.find(issue => issue.issueType === "invalid_numeric_value" && issue.canonicalFields.includes("stock_value"));
    const negativeRecovery = dataQualityIssues.find(issue => issue.issueType === "negative_recovery_input");
    const invalidMaterial = dataQualityIssues.find(issue => issue.issueType === "invalid_identifier");
    const exactDuplicate = dataQualityIssues.find(issue => issue.issueType === "exact_duplicate");
    const duplicateCandidate = dataQualityIssues.find(issue => issue.issueType === "duplicate_key_candidate");
    const inconsistentMasterData = dataQualityIssues.find(issue => issue.issueType === "inconsistent_master_data");

    console.assert(missingMaterial?.sourceRowIndexes.includes(8), "Dirty sample self-test failed: missing material row 8 not detected");
    console.assert(missingStock?.sourceRowIndexes.includes(15), "Dirty sample self-test failed: blank stock value row 15 must remain a source Data Quality issue");
    console.assert(missingOrganization?.sourceRowIndexes.some(rowIndex => [24, 29].includes(Number(rowIndex))), "Dirty sample self-test failed: organization demo rows missing");
    console.assert(missingWorkflow?.sourceRowIndexes.includes(36), "Dirty sample self-test failed: workflow demo row 36 missing");
    console.assert(missingRecovery?.sourceRowIndexes.includes(45), "Dirty sample self-test failed: recovery demo row 45 missing");
    console.assert(invalidStock?.sourceRowIndexes.includes(56), "Dirty sample self-test failed: invalid stock-value row 56 missing");
    console.assert(negativeRecovery?.sourceRowIndexes.includes(66), "Dirty sample self-test failed: negative recovery row 66 missing");
    console.assert(invalidMaterial?.sourceRowIndexes.includes(76), "Dirty sample self-test failed: invalid material row 76 missing");
    console.assert(exactDuplicate?.sourceRowIndexes.includes(98) && exactDuplicate?.sourceRowIndexes.includes(101), "Dirty sample self-test failed: exact duplicate rows 98/101 missing");
    console.assert(duplicateCandidate?.sourceRowIndexes.includes(86) && duplicateCandidate?.sourceRowIndexes.includes(102), "Dirty sample self-test failed: duplicate-key candidate rows 86/102 missing");
    console.assert(inconsistentMasterData?.sourceRowIndexes.includes(86) && inconsistentMasterData?.sourceRowIndexes.includes(102), "Dirty sample self-test failed: inconsistent master data rows 86/102 missing");

    const model = buildDataQualityModel();
    console.assert(model.score < 90, "Dirty sample self-test failed: dirty sample should not look near-perfect");
    console.assert(model.pilotReadiness?.key !== "pilotReady", "Dirty sample self-test failed: dirty sample should not start as fully pilot-ready");
    console.assert(model.actionableUnknownColumns?.length === 1, "Dirty sample self-test failed: actionable source column count should be 1");
    console.assert(model.preservedContextColumns?.length >= 20, "Dirty sample self-test failed: preserved source context should remain secondary");
    console.assert(model.unknownColumnDetails.some(column => column.sourceColumn === "Factory" && column.classKey === "mappingCandidate"), "Dirty sample self-test failed: Factory should be classified as a mapping candidate");
    console.assert(classifyUnknownSourceColumn("Needs 12-24 month EUR").classKey === "preservedContext", "Dirty sample self-test failed: preserved source-context columns should be classified separately");
    console.assert(applyColumnMappingFromRemediation({
      issueId: missingOrganization.issueId,
      issueType: missingOrganization.issueType,
      sourceColumn: "Factory",
      canonicalField: "plant",
      correctionType: "mapping_change",
      resolutionMethod: "map_source_column"
    }, { render: false, feedback: false }), "Dirty sample self-test failed: Factory -> Plant remediation mapping failed");
    console.assert(normalizedRow(29).plant === "DE-MUC-01", "Dirty sample self-test failed: Factory mapping did not populate Plant for row 29");
  } finally {
    restoreRemediationRuntimeState(snapshot);
  }
}

function runArchitectureStabilizationSelfTests() {
  const filterSnapshot = cloneFilterDefaults(filterState);
  const runtimeSnapshot = snapshotRemediationRuntimeState();
  const currentViewSnapshot = currentView;
  const currentCurrencySnapshot = currentCurrency;
  const actionSnapshot = remediationActions.map(action => ({
    ...action,
    payload: { ...(action.payload || {}) },
    issueKeys: [...(action.issueKeys || [])],
    issueIds: [...(action.issueIds || [])]
  }));
  function traceRenderCalls(callback) {
    const calls = {
      globalChrome: 0,
      overview: 0,
      actions: 0,
      inventory: 0,
      dataQuality: 0,
      currentView: 0,
      presentation: 0,
      dataset: 0
    };
    const originals = {
      renderGlobalChrome,
      renderOverview,
      renderActions,
      renderInventoryExplorer,
      renderDataQuality,
      renderCurrentView,
      renderAfterPresentationChange,
      renderAfterDatasetChange
    };
    renderGlobalChrome = function tracedGlobalChrome() { calls.globalChrome += 1; };
    renderOverview = function tracedOverview() { calls.overview += 1; };
    renderActions = function tracedActions() { calls.actions += 1; };
    renderInventoryExplorer = function tracedInventoryExplorer() { calls.inventory += 1; };
    renderDataQuality = function tracedDataQuality() { calls.dataQuality += 1; };
    renderCurrentView = function tracedCurrentView(...args) {
      calls.currentView += 1;
      return originals.renderCurrentView(...args);
    };
    renderAfterPresentationChange = function tracedPresentationChange(...args) {
      calls.presentation += 1;
      return originals.renderAfterPresentationChange(...args);
    };
    renderAfterDatasetChange = function tracedDatasetChange(...args) {
      calls.dataset += 1;
      return originals.renderAfterDatasetChange(...args);
    };
    try {
      callback(calls);
    } finally {
      renderGlobalChrome = originals.renderGlobalChrome;
      renderOverview = originals.renderOverview;
      renderActions = originals.renderActions;
      renderInventoryExplorer = originals.renderInventoryExplorer;
      renderDataQuality = originals.renderDataQuality;
      renderCurrentView = originals.renderCurrentView;
      renderAfterPresentationChange = originals.renderAfterPresentationChange;
      renderAfterDatasetChange = originals.renderAfterDatasetChange;
    }
    return calls;
  }
  try {
    updateFilterState("overview", {
      search: "MAT-OVERVIEW",
      profitCenter: "PC-100",
      program: "Program-A",
      category: "excess"
    });
    updateFilterState("actions", {
      priority: "High",
      status: "Open",
      ownerFunction: "Procurement",
      decisionType: "reduce",
      confidence: "high"
    });
    resetFilterState("actions");
    console.assert(getFilterState("overview").search === "MAT-OVERVIEW", "AP 15.1 self-test failed: action reset cleared overview search");
    console.assert(getFilterState("overview").profitCenter === "PC-100", "AP 15.1 self-test failed: action reset cleared overview profit center");
    console.assert(filterState.priority === "all" && filterState.status === "all", "AP 15.1 self-test failed: action reset did not restore action filters");

    const previousCommonSearch = filterState.search;
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      updateFilterState("actions", { search: "MAT-SHOULD-NOT-BE-WRITTEN", priority: "High" });
      console.assert(filterState.search === previousCommonSearch, "AP 15.2 self-test failed: action filter update mutated common search");
      console.assert(getFilterState("actions").search === undefined, "AP 15.2 self-test failed: action filter getter exposed non-action search");
      const overviewSnapshot = getFilterState("overview");
      overviewSnapshot.search = "MUTATED-SNAPSHOT";
      console.assert(filterState.overview.search !== "MUTATED-SNAPSHOT", "AP 15.2 self-test failed: overview filter getter returned mutable state");
      updateFilterState("__unknown_scope__", { search: "MAT-SHOULD-NOT-BE-WRITTEN" });
      console.assert(filterState.search === previousCommonSearch, "AP 15.2 self-test failed: unknown scope mutated root filter state");
    } finally {
      console.warn = originalWarn;
    }
    resetFilterState("actions");

    updateDataQualityFilterState("status", "mapped");
    updateDataQualityFilterState("column", "Factory");
    updateDataQualityFilterState("note", "manual");
    console.assert(filterState.dataQualityStatus === "mapped", "AP 15.1 self-test failed: Data Quality status filter state not updated");
    console.assert(filterState.dataQualityColumn === "Factory", "AP 15.1 self-test failed: Data Quality column filter state not updated");
    console.assert(filterState.dataQualityNote === "manual", "AP 15.1 self-test failed: Data Quality note filter state not updated");
    resetFilterState("dataQuality");
    console.assert(!hasActiveFilters("dataQuality"), "AP 15.1 self-test failed: Data Quality filters did not reset without legacy controls");
    updateFilterState("remediation", {
      remediationType: "all",
      remediationSeverity: "all",
      remediationStatus: "all",
      remediationQuick: "critical",
      remediationSearch: "",
      remediationField: "",
      remediationMaterial: "",
      remediationCorrected: "all"
    });
    console.assert(hasActiveFilters("remediation"), "AP 15.2 self-test failed: remediation quick filter was not recognized as active");
    resetFilterState("remediation");
    console.assert(!hasActiveFilters("remediation"), "AP 15.2 self-test failed: remediation filters did not reset");

    const testAction = registerRemediationAction({
      datasetId: currentDatasetId() || "AP15-SELFTEST-DATASET",
      actionType: "correction",
      issueKey: "AP15-SELFTEST",
      issueId: "AP15-SELFTEST",
      payload: { correctionId: "AP15-CORRECTION" }
    });
    console.assert(activeRemediationActions().some(action => action.actionId === testAction.actionId), "AP 15.1 self-test failed: remediation action was not registered on current action stack");
    markRemediationActionInactive(testAction.actionId);
    console.assert(!activeRemediationActions().some(action => action.actionId === testAction.actionId), "AP 15.1 self-test failed: remediation action was not deactivated by current action stack");
    const legacyUndoName = ["undoLegacyCorrection", "OrDecision"].join("");
    console.assert(typeof globalThis[legacyUndoName] === "undefined", "AP 15.1 self-test failed: old undo fallback still exists");

    updateFilterState("overview", { search: "MAT-OVERVIEW" });
    filterState.advancedInventory.__selfTest = "in-stock";
    resetOverviewFilters({ render: false });
    console.assert(filterState.advancedInventory.__selfTest === "in-stock", "AP 15.1.1 self-test failed: overview reset cleared inventory filters");
    filterState.remediationSeverity = "critical";
    clearFilters({ scope: "inventory", render: false });
    console.assert(filterState.remediationSeverity === "critical", "AP 15.1.1 self-test failed: inventory reset cleared remediation filters");
    clearFilters({ render: false });
    console.assert(!hasActiveFilters("overview") && !hasActiveFilters("actions") && !hasActiveFilters("inventory") && !hasActiveFilters("dataQuality"), "AP 15.1.1 self-test failed: full dataset reset did not clear filter scopes");

    enrichedRows = [
      { row_number: 1, material_id: "MAT-OV-1", material_description: "Valve", profit_center: "PC-A", program: "P1", program_short: "P1", category: "Excess Stock", primary_category: "excess", status: "Open", recovery_potential: 100, stock_value: 200 },
      { row_number: 2, material_id: "MAT-OV-2", material_description: "Sensor", profit_center: "PC-B", program: "P2", program_short: "P2", category: "No Need Stock", primary_category: "no_demand", status: "Open", recovery_potential: 50, stock_value: 100 }
    ];
    updateFilterState("overview", { search: "", profitCenter: "PC-A", program: "all", category: "all" });
    console.assert(getOverviewRows().length === 1, "AP 15.1.1 self-test failed: overview filter did not create subset");
    console.assert(getDataQualityRows().length === 2, "AP 15.1.1 self-test failed: Data Quality inherited Overview filter state");

    currentView = "dashboard";
    let calls = traceRenderCalls(() => renderCurrentView());
    console.assert(calls.overview === 1 && calls.actions === 0 && calls.inventory === 0 && calls.dataQuality === 0 && calls.dataset === 0, "AP 15.1.1 self-test failed: overview render boundary not isolated");

    currentView = "inventory";
    calls = traceRenderCalls(() => renderCurrentView());
    console.assert(calls.inventory === 1 && calls.overview === 0 && calls.actions === 0 && calls.dataQuality === 0 && calls.dataset === 0, "AP 15.1.1 self-test failed: inventory render boundary not isolated");

    currentView = "check";
    calls = traceRenderCalls(() => renderCurrentView());
    console.assert(calls.dataQuality === 1 && calls.overview === 0 && calls.actions === 0 && calls.inventory === 0 && calls.dataset === 0, "AP 15.1.1 self-test failed: Data Quality render boundary not isolated");

    currentView = "actions";
    calls = traceRenderCalls(() => updateActionStatus(1, "Implemented"));
    console.assert(calls.actions === 1 && calls.globalChrome === 1 && calls.dataset === 0 && calls.inventory === 0 && calls.dataQuality === 0, "AP 15.1.1 self-test failed: action status used dataset-wide rendering");

    currentView = "dashboard";
    calls = traceRenderCalls(() => updateCurrency("USD"));
    console.assert(calls.presentation === 1 && calls.dataset === 0 && calls.overview === 1, "AP 15.1.1 self-test failed: currency change used dataset rendering");

    calls = traceRenderCalls(() => renderAfterDatasetChange());
    console.assert(calls.dataset === 1 && calls.overview === 1 && calls.actions === 0 && calls.inventory === 0 && calls.dataQuality === 0, "AP 15.1.1 self-test failed: dataset render did not isolate hidden dirty views");

    let loadTraceResult = false;
    calls = traceRenderCalls(() => {
      loadTraceResult = loadDataset(
      ["Material", "Stock Value", "Profit Center"],
      [{ Material: "MAT-LOAD", "Stock Value": "100", "Profit Center": "PC-LOAD" }],
      "AP 15.1.1 Self-test",
      { sourceType: "self-test" }
      );
    });
    console.assert(loadTraceResult === true && calls.dataset === 1, "AP 15.1.1 self-test failed: dataset load did not report success or rendered more than once");
  } finally {
    Object.keys(filterState).forEach(key => delete filterState[key]);
    Object.assign(filterState, filterSnapshot);
    restoreRemediationRuntimeState(runtimeSnapshot);
    currentView = currentViewSnapshot;
    currentCurrency = currentCurrencySnapshot;
    saveSettings();
    remediationActions = actionSnapshot;
  }
}

function runCodeHealthHotfixSelfTests() {
  const filterSnapshot = cloneFilterDefaults(filterState);
  const enrichedSnapshot = enrichedRows;
  const activeIssueSnapshot = activeRemediationIssueId;
  const currentViewSnapshot = currentView;
  const schedulerSnapshot = {
    token: remediationPreviewSchedulerState.token,
    runCount: remediationPreviewSchedulerState.runCount
  };
  const controlIds = [
    "overviewGlobalSearch",
    "overviewGlobalProfitCenter",
    "overviewGlobalProgram",
    "overviewGlobalCategory"
  ];
  const controlSnapshots = controlIds.map(id => {
    const control = $(id);
    return control
      ? { id, innerHTML: control.innerHTML, value: control.value }
      : { id, innerHTML: "", value: "" };
  });
  try {
    ["de", "en"].forEach(language => {
      ["correctedValue", "fieldType", "close", "resetFilters", "enterCorrectedValue", "applyCorrection", "applyDecision"].forEach(key => {
        console.assert(Boolean(translations[language]?.[key]), `AP 15.3.1 self-test failed: missing translation ${language}.${key}`);
      });
    });

    console.assert(defaultCorrectionDraft(null) === null, "AP 15.3.1 self-test failed: defaultCorrectionDraft(null) did not return null");
    console.assert(defaultCorrectionDraft(undefined) === null, "AP 15.3.1 self-test failed: defaultCorrectionDraft(undefined) did not return null");

    const rowA = { row_number: 1, material_id: "MAT-A", material_description: "Valve", profit_center: "PC-A", program: "P-A", program_short: "P-A", category: "excess", primary_category: "excess" };
    const rowB = { row_number: 2, material_id: "MAT-B", material_description: "Sensor", profit_center: "PC-B", program: "P-B", program_short: "P-B", category: "no_demand", primary_category: "no_demand" };
    enrichedRows = [rowA, rowB];
    updateFilterState("overview", { search: "", profitCenter: "PC-A", program: "all", category: "all" });
    refreshOverviewFilterOptions();
    console.assert($("overviewGlobalProfitCenter")?.value === "PC-A", "AP 15.3.1 self-test failed: existing Overview Profit Center was not preserved in UI");
    console.assert(getFilterState("overview").profitCenter === "PC-A", "AP 15.3.1 self-test failed: existing Overview Profit Center was not preserved in state");
    console.assert(getOverviewRows().length === 1 && getOverviewRows()[0].profit_center === "PC-A", "AP 15.3.1 self-test failed: Overview filter did not return PC-A subset");
    enrichedRows = [rowB];
    refreshOverviewFilterOptions();
    console.assert($("overviewGlobalProfitCenter")?.value === "all", "AP 15.3.1 self-test failed: disappeared Overview Profit Center did not reset UI to all");
    console.assert(getFilterState("overview").profitCenter === "all", "AP 15.3.1 self-test failed: disappeared Overview Profit Center did not reset state to all");
    console.assert(getOverviewRows().length === 1 && getOverviewRows()[0].profit_center === "PC-B", "AP 15.3.1 self-test failed: Overview remained invisibly filtered after option disappeared");

    console.assert(sanitizeSpreadsheetCell('=HYPERLINK("https://example.com")').startsWith("'=HYPERLINK"), "AP 15.3.1 self-test failed: HYPERLINK formula was not neutralized");
    console.assert(sanitizeSpreadsheetCell("+SUM(A1:A2)") === "'+SUM(A1:A2)", "AP 15.3.1 self-test failed: plus formula was not neutralized");
    console.assert(String(sanitizeSpreadsheetCell("-CMD|' /C calc'!A0")).startsWith("'-CMD"), "AP 15.3.1 self-test failed: minus command-like formula was not neutralized");
    console.assert(sanitizeSpreadsheetCell("@SUM(A1:A2)") === "'@SUM(A1:A2)", "AP 15.3.1 self-test failed: at formula was not neutralized");
    console.assert(sanitizeSpreadsheetCell("\t=SUM(A1:A2)") === "'\t=SUM(A1:A2)", "AP 15.3.1 self-test failed: leading tab formula was not neutralized");
    console.assert(sanitizeSpreadsheetCell("\r=SUM(A1:A2)") === "'\r=SUM(A1:A2)", "AP 15.3.1 self-test failed: leading carriage-return formula was not neutralized");
    console.assert(sanitizeSpreadsheetCell("-500") === "-500", "AP 15.3.1 self-test failed: negative numeric text was sanitized unnecessarily");
    console.assert(sanitizeSpreadsheetCell("+500") === "+500", "AP 15.3.1 self-test failed: positive numeric text was sanitized unnecessarily");
    console.assert(sanitizeSpreadsheetCell("-500+100") === "'-500+100", "AP 15.3.1 self-test failed: numeric-looking expression was not neutralized");
    console.assert(sanitizeSpreadsheetCell("Valve Body") === "Valve Body", "AP 15.3.1 self-test failed: normal text was changed unnecessarily");
    console.assert(csvCellText('Valve "A"') === '"Valve ""A"""', "AP 15.3.1 self-test failed: CSV quote escaping changed");
    console.assert(csvCellText("+SUM(A1:A2)") === '"\'+SUM(A1:A2)"', "AP 15.3.1 self-test failed: CSV formula protection did not run before quoting");

    const modal = $("remediationIssueModal");
    const wasModalActive = modal?.classList.contains("active");
    const originalRenderPreview = renderRemediationModalPreview;
    const timers = [];
    let previewRuns = 0;
    const fakeSetTimer = callback => {
      const timer = { callback, cancelled: false };
      timers.push(timer);
      return timer;
    };
    const fakeClearTimer = timer => {
      if (timer) timer.cancelled = true;
    };
    try {
      if (modal) modal.classList.add("active");
      activeRemediationIssueId = "AP15-3-1-SELFTEST";
      renderRemediationModalPreview = function tracedRemediationPreview() {
        previewRuns += 1;
      };
      scheduleRemediationPreviewUpdate({ setTimer: fakeSetTimer, clearTimer: fakeClearTimer });
      scheduleRemediationPreviewUpdate({ setTimer: fakeSetTimer, clearTimer: fakeClearTimer });
      scheduleRemediationPreviewUpdate({ setTimer: fakeSetTimer, clearTimer: fakeClearTimer });
      timers.forEach(timer => {
        if (!timer.cancelled) timer.callback();
      });
      console.assert(previewRuns === 1, "AP 15.3.1 self-test failed: rapid preview input did not collapse to one run");
      scheduleRemediationPreviewUpdate({ immediate: true, setTimer: fakeSetTimer, clearTimer: fakeClearTimer });
      console.assert(previewRuns === 2, "AP 15.3.1 self-test failed: immediate preview change did not run");
      scheduleRemediationPreviewUpdate({ setTimer: fakeSetTimer, clearTimer: fakeClearTimer });
      cancelScheduledRemediationPreview();
      timers.forEach(timer => {
        if (!timer.cancelled) timer.callback();
      });
      console.assert(previewRuns === 2, "AP 15.3.1 self-test failed: cancelled preview still ran");
    } finally {
      renderRemediationModalPreview = originalRenderPreview;
      if (modal && !wasModalActive) modal.classList.remove("active");
    }

    if (typeof Storage !== "undefined" && Storage.prototype?.setItem) {
      const originalSetItem = Storage.prototype.setItem;
      const originalWarn = console.warn;
      try {
        console.warn = () => {};
        Storage.prototype.setItem = function throwBlockedStorage() {
          throw new Error("storage disabled self-test");
        };
        saveSettings();
        console.assert(true, "AP 15.3.1 self-test failed: saveSettings should tolerate blocked localStorage");
      } finally {
        Storage.prototype.setItem = originalSetItem;
        console.warn = originalWarn;
      }
    }
  } finally {
    cancelScheduledRemediationPreview();
    remediationPreviewSchedulerState.token = schedulerSnapshot.token;
    remediationPreviewSchedulerState.runCount = schedulerSnapshot.runCount;
    remediationPreviewSchedulerState.cancelTimer = clearTimeout;
    enrichedRows = enrichedSnapshot;
    activeRemediationIssueId = activeIssueSnapshot;
    currentView = currentViewSnapshot;
    Object.keys(filterState).forEach(key => delete filterState[key]);
    Object.assign(filterState, filterSnapshot);
    controlSnapshots.forEach(snapshot => {
      const control = $(snapshot.id);
      if (control) {
        control.innerHTML = snapshot.innerHTML;
        control.value = snapshot.value;
      }
    });
  }
}

function runDatasetBuilderIntegrationSafetyGateSelfTests() {
  const snapshot = snapshotRemediationRuntimeState();
  try {
    const headers = ["Material", "Factory", "Stock Value", "No Demand Value"];
    const rows = [
      { Material: "MAT-1", Factory: "", "Stock Value": "100", "No Demand Value": "40" }
    ];
    const metadata = buildSourceColumnMetadata(headers);
    const baseMapping = refreshColumnMappingStatuses(createAutomaticColumnMapping({ headers, rows, sourceColumnMetadata: metadata }));
    const factoryToPlant = mappingWithDraftChanges(baseMapping, [{ sourceColumn: "Factory", canonicalField: "plant" }]);
    const factoryToProfitCenter = mappingWithDraftChanges(baseMapping, [{ sourceColumn: "Factory", canonicalField: "profit_center" }]);
    const correction = {
      correctionId: "AP1541-CORR-A",
      datasetId: "DS-A",
      status: "active",
      correctionType: "replace_source_value",
      sourceColumn: "Factory",
      sourceColumnId: "Factory",
      sourceKey: "Factory",
      sourceIndex: 1,
      originalHeader: "Factory",
      sourceRowIndexes: [1],
      canonicalField: "plant",
      canonicalFieldAtCreation: "plant",
      mappingTargetAtCreation: "plant",
      correctedValue: "DE01"
    };
    const contextA = datasetCorrectionContext({ datasetId: "DS-A", sourceRows: rows, headers, sourceColumnMetadata: metadata, columnMapping: factoryToPlant });
    const contextB = datasetCorrectionContext({ datasetId: "DS-B", sourceRows: rows, headers, sourceColumnMetadata: metadata, columnMapping: factoryToPlant });
    console.assert(correctionCompatible(correction, contextA), "AP 15.4.1 self-test failed: Dataset A correction should be compatible with Dataset A");
    console.assert(!correctionCompatible(correction, contextB), "AP 15.4.1 self-test failed: Dataset A correction leaked into Dataset B");
    console.assert(!correctionCompatible(correction, { ...contextA, columnMapping: factoryToProfitCenter }), "AP 15.4.1 self-test failed: remapped source correction should become incompatible");
    console.assert(correctionCompatible(correction, contextA), "AP 15.4.1 self-test failed: correction should become compatible again when mapping returns");

    const buildA = buildInventoryDataset({
      sourceRows: rows,
      headers,
      sourceColumnMetadata: metadata,
      columnMapping: factoryToPlant,
      corrections: activeCompatibleDataCorrections([correction], contextA),
      options: { datasetId: "DS-A" }
    });
    const buildB = buildInventoryDataset({
      sourceRows: rows,
      headers,
      sourceColumnMetadata: metadata,
      columnMapping: factoryToPlant,
      corrections: activeCompatibleDataCorrections([correction], contextB),
      options: { datasetId: "DS-B" }
    });
    console.assert(buildA.normalizedRows[0].plant === "DE01", "AP 15.4.1 self-test failed: Dataset A correction was not applied");
    console.assert(buildB.normalizedRows[0].plant !== "DE01", "AP 15.4.1 self-test failed: Dataset B received Dataset A correction");

    const duplicateHeaders = ["Material", "Safety Stock Target", "Safety Stock Target__2", "Stock Value"];
    const duplicateMetadata = [
      { sourceKey: "Material", originalHeader: "Material", sourceIndex: 0, duplicateIndex: 1, duplicateCount: 1 },
      { sourceKey: "Safety Stock Target", originalHeader: "Safety Stock Target", sourceIndex: 1, duplicateIndex: 1, duplicateCount: 2 },
      { sourceKey: "Safety Stock Target__2", originalHeader: "Safety Stock Target", sourceIndex: 2, duplicateIndex: 2, duplicateCount: 2 },
      { sourceKey: "Stock Value", originalHeader: "Stock Value", sourceIndex: 3, duplicateIndex: 1, duplicateCount: 1 }
    ];
    const duplicateRows = [{ Material: "MAT-DUP", "Safety Stock Target": "10", "Safety Stock Target__2": "20", "Stock Value": "100" }];
    const duplicateCorrection = {
      correctionId: "AP1541-DUP",
      datasetId: "DS-DUP",
      status: "active",
      correctionType: "replace_source_value",
      sourceColumn: "Safety Stock Target__2",
      sourceColumnId: "Safety Stock Target__2",
      sourceKey: "Safety Stock Target__2",
      sourceIndex: 2,
      sourceRowIndexes: [1],
      canonicalField: "safety_stock_target",
      canonicalFieldAtCreation: "safety_stock_target",
      mappingTargetAtCreation: "safety_stock_target",
      correctedValue: "99"
    };
    const duplicateSourceResult = applySourceCorrections({
      sourceRows: duplicateRows,
      headers: duplicateHeaders,
      corrections: [duplicateCorrection],
      includeExcludedRows: true
    });
    console.assert(duplicateSourceResult.rows[0]["Safety Stock Target"] === "10", "AP 15.4.1 self-test failed: first duplicate source column changed");
    console.assert(duplicateSourceResult.rows[0]["Safety Stock Target__2"] === "99", "AP 15.4.1 self-test failed: second duplicate source column did not change");
    console.assert(duplicateMetadata[1].originalHeader === duplicateMetadata[2].originalHeader, "AP 15.4.1 self-test failed: duplicate header metadata was not preserved");

    const sourceSnapshot = JSON.stringify(rows);
    const mappingSnapshot = JSON.stringify(factoryToPlant);
    const correctionSnapshot = JSON.stringify([correction]);
    const metadataResult = buildInventoryDataset({
      sourceRows: rows,
      headers,
      sourceColumnMetadata: metadata,
      columnMapping: factoryToPlant,
      corrections: [correction],
      options: { datasetId: "DS-A" }
    });
    console.assert(JSON.stringify(rows) === sourceSnapshot, "AP 15.4.1 self-test failed: source rows mutated");
    console.assert(JSON.stringify(factoryToPlant) === mappingSnapshot, "AP 15.4.1 self-test failed: mapping mutated");
    console.assert(JSON.stringify([correction]) === correctionSnapshot, "AP 15.4.1 self-test failed: correction mutated");
    console.assert(Object.isFrozen(metadataResult.buildMetadata), "AP 15.4.1 self-test failed: build metadata is not frozen");
    console.assert(metadataResult.buildMetadata.builderVersion && metadataResult.buildMetadata.mappingSignature, "AP 15.4.1 self-test failed: build metadata missing version or mapping signature");
    console.assert(metadataResult.buildMetadata.appliedCorrectionIds.includes("AP1541-CORR-A"), "AP 15.4.1 self-test failed: build metadata missing applied correction id");

    loadRemediationSelfTestDataset(headers, rows);
    const firstDatasetId = currentDatasetMeta.datasetId;
    console.assert(Boolean(firstDatasetId), "AP 15.4.1 self-test failed: current dataset has no datasetId");
    console.assert(currentDatasetMeta.buildMetadata?.builderVersion, "AP 15.4.1 self-test failed: currentDatasetMeta lacks full build metadata");
    const draft = {
      correctionType: "replace_source_value",
      sourceColumn: "Factory",
      sourceColumnId: "Factory",
      sourceKey: "Factory",
      sourceIndex: 1,
      sourceRowIndexes: [1],
      canonicalField: "plant",
      canonicalFieldAtCreation: "plant",
      mappingTargetAtCreation: "plant",
      correctedValue: "DE01"
    };
    const beforePreview = JSON.stringify({
      meta: currentDatasetMeta,
      normalizedRows,
      enrichedRows,
      dataCorrections,
      dataQualityIssues,
      excludedSourceRows: [...excludedSourceRows]
    });
    const preview = previewDataCorrectionImpact(draft);
    const afterPreview = JSON.stringify({
      meta: currentDatasetMeta,
      normalizedRows,
      enrichedRows,
      dataCorrections,
      dataQualityIssues,
      excludedSourceRows: [...excludedSourceRows]
    });
    console.assert(beforePreview === afterPreview, "AP 15.4.1 self-test failed: preview mutated live dataset state");

    const previewBuild = buildCurrentInventoryDataset({
      corrections: [...dataCorrections, { ...draft, correctionId: "AP1541-PREVIEW", datasetId: firstDatasetId, status: "active" }],
      options: { includeExcludedRows: false, datasetId: firstDatasetId }
    });
    const appliedCorrection = createDataCorrection(draft, { rebuild: false, feedback: false });
    const applyBuild = buildCurrentInventoryDataset({
      corrections: [...dataCorrections.filter(item => item.correctionId !== appliedCorrection.correctionId), { ...appliedCorrection, status: "active" }],
      options: { includeExcludedRows: false, datasetId: firstDatasetId }
    });
    console.assert(JSON.stringify(previewBuild.analyticalRows) === JSON.stringify(applyBuild.analyticalRows), "AP 15.4.1 self-test failed: Preview and Apply analytical rows diverged");

    loadRemediationSelfTestDataset(headers, rows);
    console.assert(currentDatasetMeta.datasetId !== firstDatasetId, "AP 15.4.1 self-test failed: new dataset load did not receive a new datasetId");
  } finally {
    restoreRemediationRuntimeState(snapshot);
  }
}

function runDatasetIdentityIntegrityPackageSelfTests() {
  const snapshot = snapshotRemediationRuntimeState();
  try {
    const headers = ["Material", "Factory", "Stock Value", "Excess Value"];
    const rows = [
      { Material: "MAT-1", Factory: "", "Stock Value": "100", "Excess Value": "30" },
      { Material: "MAT-2", Factory: "DE02", "Stock Value": "200", "Excess Value": "20" }
    ];
    loadRemediationSelfTestDataset(headers, rows);
    const datasetId = currentDatasetMeta.datasetId;
    const metadata = sourceColumnMetadata;
    const baseMapping = currentDatasetMeta.columnMapping;
    const factoryToPlant = mappingWithDraftChanges(baseMapping, [{ sourceColumn: "Factory", canonicalField: "plant" }]);
    setCurrentColumnMapping(factoryToPlant);
    const context = datasetCorrectionContext({ datasetId, sourceRows: rawRows, headers: originalHeaders, sourceColumnMetadata: metadata, columnMapping: factoryToPlant });

    const legacyCorrection = {
      correctionId: "CORR-LEGACY",
      datasetId: "",
      status: "active",
      correctionType: "replace_source_value",
      sourceColumn: "Factory",
      sourceColumnId: "Factory",
      sourceKey: "Factory",
      sourceIndex: 1,
      sourceRowIndexes: [1],
      canonicalField: "plant",
      canonicalFieldAtCreation: "plant",
      mappingTargetAtCreation: "plant",
      correctedValue: "DE01"
    };
    dataCorrections = [legacyCorrection];
    const migratedFirstCall = activeCompatibleDataCorrectionsForCurrentDataset();
    console.assert(migratedFirstCall.length === 1, "AP 15.4.2 self-test failed: legacy correction not compatible on first call");
    console.assert(dataCorrections[0].datasetId === datasetId, "AP 15.4.2 self-test failed: legacy correction did not receive current datasetId");
    const unrelatedLegacy = migrateLegacyCorrectionsToCurrentDataset([{ ...legacyCorrection, datasetId: "", sourceRowIndexes: [99] }], context);
    console.assert(!unrelatedLegacy[0].datasetId, "AP 15.4.2 self-test failed: unrelated legacy correction was migrated");

    const groupedMissingRow = { ...legacyCorrection, correctionId: "CORR-GROUPED", datasetId, sourceRowIndexes: [1, 99] };
    console.assert(!correctionCompatible(groupedMissingRow, context), "AP 15.4.2 self-test failed: grouped correction with missing row was accepted");
    let missingContextFailed = false;
    try {
      correctionCompatible({ ...legacyCorrection, datasetId });
    } catch {
      missingContextFailed = true;
    }
    console.assert(missingContextFailed, "AP 15.4.2 self-test failed: correctionCompatible accepted missing explicit context");

    dataCorrections = [];
    remediationActions = [];
    issueDecisions = [];
    remediationHistory = [];
    const correction = createDataCorrection({ ...legacyCorrection, datasetId, correctionId: undefined }, { rebuild: false, feedback: false });
    const correctionAction = remediationActions.find(action => action.payload?.correctionId === correction.correctionId);
    console.assert(correction.datasetId === correctionAction?.datasetId && correctionAction.datasetId === correctionAction.payload.datasetId, "AP 15.4.2 self-test failed: correction/action/payload datasetId mismatch");

    const issue = {
      datasetId,
      issueKey: "ISSUE-X",
      issueId: "DQ-X",
      issueType: "missing_required_value",
      sourceRowIndexes: [1],
      canonicalFields: ["plant"],
      status: "open"
    };
    const decision = createIssueDecision(issue, "reviewed", { rebuild: false, feedback: false });
    const decisionAction = remediationActions.find(action => action.payload?.decisionId === decision.decisionId);
    console.assert(decision.datasetId === decisionAction?.datasetId && decisionAction.datasetId === decisionAction.payload.datasetId, "AP 15.4.2 self-test failed: decision/action/payload datasetId mismatch");

    const mappingAction = registerMappingChangeAction({
      previousMapping: baseMapping,
      nextMapping: factoryToPlant,
      issueKey: issue.issueKey,
      issueId: issue.issueId,
      previousIssues: [issue],
      currentIssues: []
    });
    console.assert(mappingAction?.datasetId === datasetId && mappingAction.payload.datasetId === datasetId, "AP 15.4.2 self-test failed: mapping action datasetId mismatch");

    const otherAction = registerRemediationAction({
      datasetId: "DS-B",
      actionId: "REM-DS-B",
      actionType: "issue_decision",
      issueKey: "ISSUE-X",
      issueId: "DQ-X",
      payload: { decisionId: "DEC-DS-B", datasetId: "DS-B" }
    });
    issueDecisions.push({ decisionId: "DEC-DS-B", datasetId: "DS-B", issueKey: "ISSUE-X", issueId: "DQ-X", decisionType: "reviewed", status: "active" });
    console.assert(!activeRemediationActions("", datasetId).some(action => action.actionId === otherAction.actionId), "AP 15.4.2 self-test failed: remediation action leaked across datasets");
    console.assert(!activeIssueDecisions(issueDecisions, datasetId).some(item => item.datasetId === "DS-B"), "AP 15.4.2 self-test failed: issue decision leaked across datasets");

    remediationHistory = [
      { datasetId, action: "reviewed", actionId: "REM-A" },
      { datasetId: "DS-B", action: "reviewed", actionId: "REM-B" }
    ];
    console.assert(remediationHistoryForDataset(datasetId).length === 1, "AP 15.4.2 self-test failed: remediation history not dataset-scoped");

    dataQualityIssueLedger = new Map();
    dataQualityIssueLedger.set(datasetScopedIssueKey("DS-A", "ISSUE-X"), { datasetId: "DS-A", datasetScopedIssueKey: datasetScopedIssueKey("DS-A", "ISSUE-X"), issueKey: "ISSUE-X", issueId: "DQ-A", currentStatus: "corrected", currentlyDetected: true });
    dataQualityIssueLedger.set(datasetScopedIssueKey("DS-B", "ISSUE-X"), { datasetId: "DS-B", datasetScopedIssueKey: datasetScopedIssueKey("DS-B", "ISSUE-X"), issueKey: "ISSUE-X", issueId: "DQ-B", currentStatus: "open", currentlyDetected: true });
    console.assert(dataQualityIssueLedger.size === 2 && ledgerEntries("DS-B").length === 1 && ledgerEntryForIssueKey("ISSUE-X", "DS-B").issueId === "DQ-B", "AP 15.4.2 self-test failed: same issueKey collided across datasets");

    currentDatasetMeta = { ...currentDatasetMeta, datasetId: "DS-B" };
    issueDecisions = [
      { decisionId: "DEC-A", datasetId: "DS-A", issueKey: "ISSUE-X", issueId: "DQ-X", decisionType: "reviewed", status: "active" },
      { decisionId: "DEC-B", datasetId: "DS-B", issueKey: "ISSUE-X", issueId: "DQ-X", decisionType: "reviewed", status: "active" }
    ];
    remediationActions = [
      { actionId: "REM-A", datasetId: "DS-A", actionType: "issue_decision", issueKey: "ISSUE-X", issueId: "DQ-X", createdAt: "2026-08-17T14:30:00.000Z", active: true, payload: { datasetId: "DS-A", decisionId: "DEC-A" } },
      { actionId: "REM-B", datasetId: "DS-B", actionType: "issue_decision", issueKey: "ISSUE-X", issueId: "DQ-X", createdAt: "2026-08-17T14:25:00.000Z", active: true, payload: { datasetId: "DS-B", decisionId: "DEC-B" } }
    ];
    undoLastRemediationAction({ rebuild: false, feedback: false });
    console.assert(issueDecisions.find(item => item.decisionId === "DEC-B")?.status === "undone", "AP 15.4.2 self-test failed: current-dataset undo did not undo DS-B action");
    console.assert(issueDecisions.find(item => item.decisionId === "DEC-A")?.status === "active", "AP 15.4.2 self-test failed: current-dataset undo affected DS-A action");

    const oldMeta = { datasetId: "DS-OLD", buildMetadata: { activeRowCount: 777 }, rows: 777, columnMapping: baseMapping };
    currentDatasetMeta = oldMeta;
    const buildResult = buildInventoryDataset({
      sourceRows: rows,
      headers,
      sourceColumnMetadata: metadata,
      columnMapping: factoryToPlant,
      corrections: [],
      options: { datasetId: "DS-NEW", buildTimestamp: "2026-08-17T00:00:00.000Z" }
    });
    const nextMeta = { ...oldMeta, datasetId: "DS-NEW", buildMetadata: buildResult.buildMetadata };
    commitInventoryDatasetBuild(buildResult, null, nextMeta);
    console.assert(oldMeta.datasetId === "DS-OLD" && oldMeta.buildMetadata.activeRowCount === 777, "AP 15.4.2 self-test failed: old dataset meta was mutated");
    console.assert(currentDatasetMeta.datasetId === "DS-NEW" && currentDatasetMeta.buildMetadata.datasetId === "DS-NEW", "AP 15.4.2 self-test failed: atomic dataset meta commit missing datasetId");
    try {
      buildResult.buildMetadata.appliedCorrectionIds.push("CORR-X");
    } catch {
      // Frozen metadata arrays may throw.
    }
    console.assert(!buildResult.buildMetadata.appliedCorrectionIds.includes("CORR-X"), "AP 15.4.2 self-test failed: nested buildMetadata arrays are mutable");

    loadRemediationSelfTestDataset(headers, rows);
    setCurrentColumnMapping(factoryToPlant);
    const previewDatasetId = currentDatasetMeta.datasetId;
    const draft = {
      correctionType: "replace_source_value",
      sourceColumn: "Excess Value",
      sourceColumnId: "Excess Value",
      sourceKey: "Excess Value",
      sourceIndex: 3,
      sourceRowIndexes: [1],
      canonicalField: "excess_value",
      canonicalFieldAtCreation: "excess_value",
      mappingTargetAtCreation: "excess_value",
      correctedValue: "80"
    };
    const liveSnapshot = JSON.stringify({
      rawRows,
      originalHeaders,
      sourceColumnMetadata,
      normalizedRows,
      enrichedRows,
      currentDatasetMeta,
      dataCorrections,
      issueDecisions,
      remediationActions,
      remediationHistory,
      dataQualityIssueLedger: [...dataQualityIssueLedger.entries()],
      excludedSourceRows: [...excludedSourceRows]
    });
    const preview = previewDataCorrectionImpact(draft);
    const afterPreviewSnapshot = JSON.stringify({
      rawRows,
      originalHeaders,
      sourceColumnMetadata,
      normalizedRows,
      enrichedRows,
      currentDatasetMeta,
      dataCorrections,
      issueDecisions,
      remediationActions,
      remediationHistory,
      dataQualityIssueLedger: [...dataQualityIssueLedger.entries()],
      excludedSourceRows: [...excludedSourceRows]
    });
    console.assert(liveSnapshot === afterPreviewSnapshot, "AP 15.4.2 self-test failed: preview mutated live state or ledger");
    const previewBuild = buildCurrentInventoryDataset({
      corrections: [...dataCorrections, { ...draft, correctionId: "CORR-PREVIEW", datasetId: previewDatasetId, status: "active" }],
      options: { datasetId: previewDatasetId, buildTimestamp: "2026-08-17T00:00:00.000Z" }
    });
    const applied = createDataCorrection(draft, { rebuild: false, feedback: false });
    const applyBuild = buildCurrentInventoryDataset({
      corrections: dataCorrections.map(item => item.correctionId === applied.correctionId ? { ...item, status: "active" } : item),
      options: { datasetId: previewDatasetId, buildTimestamp: "2026-08-17T00:00:00.000Z" }
    });
    console.assert(JSON.stringify(previewBuild.normalizedRows) === JSON.stringify(applyBuild.normalizedRows), "AP 15.4.2 self-test failed: Preview and committed Apply normalized rows diverged");
    console.assert(JSON.stringify(previewBuild.analyticalRows) === JSON.stringify(applyBuild.analyticalRows), "AP 15.4.2 self-test failed: Preview and committed Apply analytical rows diverged");
    console.assert(preview.after.recoveryPotential === sum(applyBuild.analyticalRows, "recovery_potential"), "AP 15.4.2 self-test failed: Preview recovery result differs from Apply");

    const nonCurrentHeaders = ["Material", "Factory", "Stock Value", "Excess Value"];
    const nonCurrentRows = [{ Material: "MAT-A", Factory: "", "Stock Value": "100", "Excess Value": "30" }];
    const nonCurrentMetadata = buildSourceColumnMetadata(nonCurrentHeaders);
    const nonCurrentMapping = mappingWithDraftChanges(
      refreshColumnMappingStatuses(createAutomaticColumnMapping({ headers: nonCurrentHeaders, rows: nonCurrentRows, sourceColumnMetadata: nonCurrentMetadata })),
      [{ sourceColumn: "Factory", canonicalField: "plant" }]
    );
    const contextDsA = datasetCorrectionContext({
      datasetId: "DS-A",
      sourceRows: nonCurrentRows,
      headers: nonCurrentHeaders,
      sourceColumnMetadata: nonCurrentMetadata,
      columnMapping: nonCurrentMapping
    });
    const contextDsB = datasetCorrectionContext({
      datasetId: "DS-B",
      sourceRows: nonCurrentRows,
      headers: nonCurrentHeaders,
      sourceColumnMetadata: nonCurrentMetadata,
      columnMapping: nonCurrentMapping
    });
    const dsACorrection = {
      correctionId: "CORR-DS-A",
      datasetId: "DS-A",
      status: "active",
      correctionType: "replace_source_value",
      sourceColumn: "Factory",
      sourceColumnId: "Factory",
      sourceKey: "Factory",
      sourceIndex: 1,
      sourceRowIndexes: [1],
      canonicalField: "plant",
      canonicalFieldAtCreation: "plant",
      mappingTargetAtCreation: "plant",
      correctedValue: "DE01"
    };
    const dsAAction = {
      actionId: "REM-DS-A",
      datasetId: "DS-A",
      actionType: "correction",
      issueKey: "ISSUE-A",
      issueId: "DQ-A",
      active: true,
      payload: { datasetId: "DS-A", correctionId: "CORR-DS-A", sourceRowIndexes: [1] }
    };
    const dsAValidityBuild = buildInventoryDataset({
      sourceRows: nonCurrentRows,
      headers: nonCurrentHeaders,
      sourceColumnMetadata: nonCurrentMetadata,
      columnMapping: nonCurrentMapping,
      corrections: [dsACorrection],
      options: { datasetId: "DS-A", buildTimestamp: "2026-08-17T00:00:00.000Z" }
    });
    const dsBValidityBuild = buildInventoryDataset({
      sourceRows: nonCurrentRows,
      headers: nonCurrentHeaders,
      sourceColumnMetadata: nonCurrentMetadata,
      columnMapping: nonCurrentMapping,
      corrections: [],
      options: { datasetId: "DS-B", buildTimestamp: "2026-08-17T00:00:00.000Z" }
    });
    const dsAValidityRuntime = explicitDatasetRuntimeContext({
      datasetId: "DS-A",
      correctionContext: contextDsA,
      normalizedRows: dsAValidityBuild.normalizedRows,
      enrichedRows: decorateActionRows(dsAValidityBuild.analyticalRows),
      corrections: [dsACorrection],
      decisions: [],
      remediationActions: [dsAAction],
      excludedSourceRows: dsAValidityBuild.excludedSourceRows,
      issueLedger: new Map(),
      recoveryValidationErrors: dsAValidityBuild.recoveryValidationErrors,
      recoveryInputNormalizationDiagnostics: dsAValidityBuild.recoveryInputNormalizationDiagnostics,
      buildMetadata: dsAValidityBuild.buildMetadata
    });
    const dsBValidityRuntime = explicitDatasetRuntimeContext({
      datasetId: "DS-B",
      correctionContext: contextDsB,
      normalizedRows: dsBValidityBuild.normalizedRows,
      enrichedRows: decorateActionRows(dsBValidityBuild.analyticalRows),
      corrections: [],
      decisions: [],
      remediationActions: [],
      excludedSourceRows: dsBValidityBuild.excludedSourceRows,
      issueLedger: new Map(),
      recoveryValidationErrors: dsBValidityBuild.recoveryValidationErrors,
      recoveryInputNormalizationDiagnostics: dsBValidityBuild.recoveryInputNormalizationDiagnostics,
      buildMetadata: dsBValidityBuild.buildMetadata
    });
    currentDatasetMeta = { ...(currentDatasetMeta || {}), datasetId: "DS-B" };
    dataCorrections = [dsACorrection];
    remediationActions = [dsAAction];
    console.assert(remediationActionStillValid(dsAAction, { runtimeContext: dsAValidityRuntime }), "AP 15.4.2.1 self-test failed: non-current DS-A action was invalidated by active DS-B");
    console.assert(!remediationActionStillValid(dsAAction, { runtimeContext: dsBValidityRuntime }), "AP 15.4.2.1 self-test failed: DS-A action validated against DS-B context");

    const dsARuntimeHeaders = ["Material", "Factory", "Stock Value", "Excess Value"];
    const dsARuntimeRows = [
      { Material: "MAT-DS-A-1", Factory: "", "Stock Value": "100", "Excess Value": "30" },
      { Material: "MAT-DS-A-2", Factory: "", "Stock Value": "200", "Excess Value": "20" }
    ];
    const dsARuntimeMetadata = buildSourceColumnMetadata(dsARuntimeHeaders);
    const dsARuntimeMapping = mappingWithDraftChanges(
      refreshColumnMappingStatuses(createAutomaticColumnMapping({ headers: dsARuntimeHeaders, rows: dsARuntimeRows, sourceColumnMetadata: dsARuntimeMetadata })),
      [{ sourceColumn: "Factory", canonicalField: "plant" }]
    );
    const dsARuntimeCorrection = { ...dsACorrection, issueKey: "ISSUE-SAME", issueId: "DQ-DS-A", sourceRowIndexes: [1] };
    const dsARuntimeCorrectionContext = datasetCorrectionContext({
      datasetId: "DS-A",
      sourceRows: dsARuntimeRows,
      headers: dsARuntimeHeaders,
      sourceColumnMetadata: dsARuntimeMetadata,
      columnMapping: dsARuntimeMapping
    });
    const dsABuild = buildInventoryDataset({
      sourceRows: dsARuntimeRows,
      headers: dsARuntimeHeaders,
      sourceColumnMetadata: dsARuntimeMetadata,
      columnMapping: dsARuntimeMapping,
      corrections: activeCompatibleDataCorrections([dsARuntimeCorrection], dsARuntimeCorrectionContext),
      options: { datasetId: "DS-A", buildTimestamp: "2026-08-17T00:00:00.000Z" }
    });
    const dsARuntimeAction = { ...dsAAction, issueKey: "ISSUE-SAME", issueId: "DQ-DS-A", payload: { datasetId: "DS-A", correctionId: "CORR-DS-A", sourceRowIndexes: [1] } };
    const dsARuntimeDecision = { decisionId: "DEC-DS-A-ACCEPT", datasetId: "DS-A", issueKey: "ISSUE-ACCEPT", issueId: "DQ-ACCEPT", decisionType: "accepted_exception", status: "active" };
    const dsAAcceptAction = { actionId: "REM-DS-A-ACCEPT", datasetId: "DS-A", actionType: "issue_decision", issueKey: "ISSUE-ACCEPT", issueId: "DQ-ACCEPT", createdAt: "2026-08-17T15:00:00.000Z", active: true, payload: { datasetId: "DS-A", decisionId: "DEC-DS-A-ACCEPT" } };
    const dsAMappingAction = { actionId: "REM-DS-A-MAP", datasetId: "DS-A", actionType: "mapping_change", issueKey: "ISSUE-MAP", issueId: "DQ-MAP", createdAt: "2026-08-17T15:01:00.000Z", active: true, payload: { datasetId: "DS-A", resolvedIssueKeys: ["ISSUE-MAP"] } };
    const dsARuntime = explicitDatasetRuntimeContext({
      datasetId: "DS-A",
      correctionContext: dsARuntimeCorrectionContext,
      normalizedRows: dsABuild.normalizedRows,
      enrichedRows: decorateActionRows(dsABuild.analyticalRows),
      corrections: [dsARuntimeCorrection],
      decisions: [dsARuntimeDecision],
      remediationActions: [dsARuntimeAction, dsAAcceptAction, dsAMappingAction],
      excludedSourceRows: dsABuild.excludedSourceRows,
      issueLedger: new Map(),
      recoveryValidationErrors: dsABuild.recoveryValidationErrors,
      recoveryInputNormalizationDiagnostics: dsABuild.recoveryInputNormalizationDiagnostics,
      buildMetadata: dsABuild.buildMetadata
    });
    currentDatasetMeta = { ...(currentDatasetMeta || {}), datasetId: "DS-B" };
    rawRows = [{ Material: "MAT-DS-B-1", Factory: "B", "Stock Value": "999", "Excess Value": "0" }];
    originalHeaders = dsARuntimeHeaders;
    sourceColumnMetadata = buildSourceColumnMetadata(dsARuntimeHeaders);
    normalizedRows = [{ __sourceRowIndex: 1, material_id: "MAT-DS-B-1", plant: "B" }];
    enrichedRows = [{ row_number: 1, material_id: "MAT-DS-B-1" }];
    const dsAIssue = { datasetId: "DS-A", issueKey: "ISSUE-SAME", issueId: "DQ-DS-A", issueType: "missing_required_value", sourceRowIndexes: [1, 2], canonicalFields: ["plant"], status: "open" };
    const dsAState = issueResolutionState(dsAIssue, dsARuntime);
    const dsAResolution = latestResolutionRecord("ISSUE-SAME", "DQ-DS-A", { runtimeContext: dsARuntime });
    reconcileDataQualityIssueLedger({ currentIssues: [dsAIssue], datasetId: "DS-A", runtimeContext: dsARuntime });
    const dsALedgerIssue = ledgerIssuesForWorklist("DS-A", dsARuntime)[0];
    console.assert(dsAState.status === "partially_resolved" && dsAState.resolvedRows === 1, "AP 15.4.2.2 self-test failed: DS-A partial progress did not use explicit runtime context");
    console.assert(dsAResolution.latestActionId === "REM-DS-A", "AP 15.4.2.2 self-test failed: DS-A latest resolution record did not use explicit runtime context");
    console.assert(dsALedgerIssue.ledgerEntry.currentSnapshot.sourceRowSnapshots[0].values.Material === "MAT-DS-A-1", "AP 15.4.2.2 self-test failed: DS-A ledger snapshot borrowed visible DS-B source rows");
    const dsBRuntime = explicitDatasetRuntimeContext({
      datasetId: "DS-B",
      correctionContext: datasetCorrectionContext({ datasetId: "DS-B", sourceRows: rawRows, headers: dsARuntimeHeaders, sourceColumnMetadata, columnMapping: dsARuntimeMapping }),
      normalizedRows,
      enrichedRows,
      corrections: [],
      decisions: [],
      remediationActions: [],
      excludedSourceRows: new Set(),
      issueLedger: new Map(),
      recoveryValidationErrors: [],
      recoveryInputNormalizationDiagnostics: {
        checkedCells: 0,
        negativeValues: 0,
        invalidValues: 0,
        emptyValues: 0,
        examples: [],
        statusKey: "ok"
      },
      buildMetadata: { datasetId: "DS-B" }
    });
    console.assert(statusForIssue({ datasetId: "DS-A", issueKey: "ISSUE-ACCEPT", issueId: "DQ-ACCEPT", sourceRowIndexes: [], status: "open" }, dsARuntime) === "accepted_exception", "AP 15.4.2.2 self-test failed: DS-A accepted exception was not recognized");
    console.assert(statusForIssue({ datasetId: "DS-B", issueKey: "ISSUE-ACCEPT", issueId: "DQ-ACCEPT", sourceRowIndexes: [], status: "open" }, dsBRuntime) === "open", "AP 15.4.2.2 self-test failed: DS-A accepted exception leaked into DS-B");
    console.assert(latestResolutionRecord("ISSUE-MAP", "DQ-MAP", { runtimeContext: dsARuntime }).latestActionId === "REM-DS-A-MAP", "AP 15.4.2.2 self-test failed: DS-A mapping action missing from DS-A context");
    console.assert(!latestResolutionRecord("ISSUE-MAP", "DQ-MAP", { runtimeContext: dsBRuntime }).latestActionId, "AP 15.4.2.2 self-test failed: DS-A mapping action leaked into DS-B");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Excess Value"],
      [{ Material: "MAT-OLD", "Stock Value": "100", "Excess Value": "30" }]
    );
    dataCorrections = [{ ...dsACorrection, datasetId: currentDatasetMeta.datasetId, correctionId: "CORR-OLD", sourceColumn: "Excess Value", sourceColumnId: "Excess Value", sourceKey: "Excess Value", sourceIndex: 2, canonicalField: "excess_value", canonicalFieldAtCreation: "excess_value", mappingTargetAtCreation: "excess_value", correctedValue: "80" }];
    remediationActions = [{ ...dsAAction, datasetId: currentDatasetMeta.datasetId, actionId: "REM-OLD", payload: { datasetId: currentDatasetMeta.datasetId, correctionId: "CORR-OLD", sourceRowIndexes: [1] } }];
    const failedBuildSnapshot = JSON.stringify({
      rawRows,
      originalHeaders,
      sourceColumnMetadata,
      normalizedRows,
      enrichedRows,
      excludedSourceRows: [...excludedSourceRows],
      currentDatasetMeta,
      dataCorrections,
      issueDecisions,
      remediationActions,
      remediationHistory,
      dataQualityIssues,
      dataQualityIssueLedger: [...dataQualityIssueLedger.entries()]
    });
    const failedLoadResult = loadDataset(
      ["Material", "Stock Value", "Excess Value"],
      [{ Material: "MAT-NEW", "Stock Value": "500", "Excess Value": "250" }],
      "Forced failure",
      { sourceType: "self-test", render: false, forceBuildErrorForTest: true, suppressErrorLog: true, suppressFeedback: true }
    );
    const afterFailedBuildSnapshot = JSON.stringify({
      rawRows,
      originalHeaders,
      sourceColumnMetadata,
      normalizedRows,
      enrichedRows,
      excludedSourceRows: [...excludedSourceRows],
      currentDatasetMeta,
      dataCorrections,
      issueDecisions,
      remediationActions,
      remediationHistory,
      dataQualityIssues,
      dataQualityIssueLedger: [...dataQualityIssueLedger.entries()]
    });
    console.assert(failedLoadResult === false, "AP 15.4.2.1 self-test failed: forced dataset build failure did not report failure");
    console.assert(failedBuildSnapshot === afterFailedBuildSnapshot, "AP 15.4.2.1 self-test failed: failed build mutated active dataset state");

    const transactionalSnapshot = () => JSON.stringify({
      rawRows,
      originalHeaders,
      sourceColumnMetadata,
      normalizedRows,
      enrichedRows,
      excludedSourceRows: [...excludedSourceRows],
      currentDatasetMeta,
      dataCorrections,
      issueDecisions,
      remediationActions,
      remediationHistory,
      dataQualityIssues,
      dataQualityIssueLedger: [...dataQualityIssueLedger.entries()],
      filterState: clonePlainRecord(filterState),
      actionStatusSnapshot: [...actionStatusSnapshotForCurrentRows().entries()]
    });
    filterState.search = "AP15422-ROLLBACK";
    dataQualityIssueLedger.set(datasetScopedIssueKey(currentDatasetId(), "ROLLBACK-CHECK"), {
      datasetId: currentDatasetId(),
      datasetScopedIssueKey: datasetScopedIssueKey(currentDatasetId(), "ROLLBACK-CHECK"),
      issueKey: "ROLLBACK-CHECK",
      currentStatus: "open",
      currentlyDetected: true
    });
    const commitFailureBefore = transactionalSnapshot();
    const commitFailureResult = loadDataset(
      ["Material", "Stock Value", "Excess Value"],
      [{ Material: "MAT-COMMIT-FAIL", "Stock Value": "600", "Excess Value": "300" }],
      "Forced commit failure",
      { sourceType: "self-test", render: false, forceCommitFailureForTest: true, suppressErrorLog: true, suppressFeedback: true }
    );
    console.assert(commitFailureResult === false && transactionalSnapshot() === commitFailureBefore, "AP 15.4.2.2 self-test failed: commit failure did not rollback complete runtime state");
    const postCommitFailureBefore = transactionalSnapshot();
    const postCommitFailureResult = loadDataset(
      ["Material", "Stock Value", "Excess Value"],
      [{ Material: "MAT-POST-FAIL", "Stock Value": "700", "Excess Value": "350" }],
      "Forced post-commit failure",
      { sourceType: "self-test", render: false, forcePostCommitFailureForTest: "dataQuality", suppressErrorLog: true, suppressFeedback: true }
    );
    console.assert(postCommitFailureResult === false && transactionalSnapshot() === postCommitFailureBefore, "AP 15.4.2.2 self-test failed: post-commit failure did not rollback complete runtime state");
    const parsedFailure = {
      headers: ["Material", "Stock Value", "Excess Value"],
      rows: [{ Material: "MAT-UPLOAD-FAIL", "Stock Value": "800", "Excess Value": "400" }],
      sourceColumnMetadata: buildSourceColumnMetadata(["Material", "Stock Value", "Excess Value"])
    };
    const cleanUploadBefore = transactionalSnapshot();
    const cleanUploadResult = beginUploadWithParsedData(parsedFailure, "Forced clean upload failure", {
      sourceType: "self-test",
      allowMappingReview: false,
      forceBuildErrorForTest: true,
      suppressErrorLog: true,
      suppressFeedback: true
    });
    console.assert(cleanUploadResult.status === "error" && transactionalSnapshot() === cleanUploadBefore, "AP 15.4.2.2 self-test failed: failed automatic upload returned loaded or mutated state");
    const mappingFailureMapping = createAutomaticColumnMapping({
      headers: parsedFailure.headers,
      rows: parsedFailure.rows,
      sourceColumnMetadata: parsedFailure.sourceColumnMetadata
    });
    const mappingFailureActionCount = remediationActions.length;
    const mappingFailureHistoryCount = remediationHistory.length;
    openColumnMappingAssistant({
      fileName: "Forced mapping failure",
      sourceLabel: "Forced mapping failure",
      sourceType: "self-test",
      headers: parsedFailure.headers,
      rows: parsedFailure.rows,
      sourceColumnMetadata: parsedFailure.sourceColumnMetadata,
      automaticMapping: mappingFailureMapping,
      approvedMapping: cloneColumnMapping(mappingFailureMapping),
      preserveRemediation: true,
      forceBuildErrorForTest: true,
      suppressErrorLog: true,
      suppressFeedback: true
    });
    const mappingFailureResult = continueUploadWithMapping(pendingUploadContext.approvedMapping);
    console.assert(
      mappingFailureResult === false
      && Boolean(pendingUploadContext)
      && $("mappingModal")?.classList.contains("active")
      && remediationActions.length === mappingFailureActionCount
      && remediationHistory.length === mappingFailureHistoryCount,
      "AP 15.4.2.2 self-test failed: failed mapped load closed modal or created workflow history"
    );
    closeColumnMappingAssistant({ force: true });

    const oldDatasetMetaObject = currentDatasetMeta;
    const oldDatasetMetaSnapshot = JSON.stringify(oldDatasetMetaObject);
    const successLoadResult = loadDataset(
      ["Material", "Stock Value", "Excess Value"],
      [{ Material: "MAT-TXN", "Stock Value": "500", "Excess Value": "250" }],
      "Successful transaction",
      { sourceType: "self-test", datasetId: "DS-TXN-B", render: false }
    );
    console.assert(successLoadResult === true, "AP 15.4.2.1 self-test failed: successful transaction did not load");
    console.assert(currentDatasetMeta.datasetId === "DS-TXN-B" && currentDatasetMeta.buildMetadata.datasetId === "DS-TXN-B", "AP 15.4.2.1 self-test failed: successful transaction metadata is incoherent");
    console.assert(rawRows[0].Material === "MAT-TXN" && originalHeaders.includes("Excess Value") && enrichedRows[0].material_id === "MAT-TXN", "AP 15.4.2.1 self-test failed: source and analytical state did not commit together");
    console.assert(JSON.stringify(oldDatasetMetaObject) === oldDatasetMetaSnapshot, "AP 15.4.2.1 self-test failed: previous dataset meta object was mutated");
    console.assert(dataCorrections.length === 0 && remediationActions.length === 0, "AP 15.4.2.1 self-test failed: remediation state reset was not deferred to successful new-dataset commit");
    const remapDatasetId = currentDatasetMeta.datasetId;
    const remapResult = loadDataset(
      originalHeaders,
      rawRows,
      "Same dataset remap",
      {
        sourceType: "self-test",
        sourceColumnMetadata,
        columnMapping: currentDatasetMeta.columnMapping,
        preserveRemediation: true,
        render: false
      }
    );
    console.assert(remapResult === true && currentDatasetMeta.datasetId === remapDatasetId, "AP 15.4.2.1 self-test failed: same-dataset remap did not preserve datasetId");

    loadRemediationSelfTestDataset(
      ["Material", "Stock Value", "Excess Value"],
      [{ Material: "MAT-PREVIEW", "Stock Value": "100", "Excess Value": "30" }]
    );
    const previewApplyDraft = {
      correctionType: "replace_source_value",
      sourceColumn: "Excess Value",
      sourceColumnId: "Excess Value",
      sourceKey: "Excess Value",
      sourceIndex: 2,
      sourceRowIndexes: [1],
      canonicalField: "excess_value",
      canonicalFieldAtCreation: "excess_value",
      mappingTargetAtCreation: "excess_value",
      correctedValue: "80"
    };
    const liveBeforePreview = JSON.stringify({
      rawRows,
      originalHeaders,
      sourceColumnMetadata,
      normalizedRows,
      enrichedRows,
      currentDatasetMeta,
      dataCorrections,
      issueDecisions,
      remediationActions,
      dataQualityIssueLedger: [...dataQualityIssueLedger.entries()],
      remediationHistory,
      excludedSourceRows: [...excludedSourceRows],
      activeRemediationIssueId,
      correctionCount: currentDatasetMeta.buildMetadata?.correctionCount || 0
    });
    const previewApplyImpact = previewDataCorrectionImpact(previewApplyDraft);
    const liveAfterPreview = JSON.stringify({
      rawRows,
      originalHeaders,
      sourceColumnMetadata,
      normalizedRows,
      enrichedRows,
      currentDatasetMeta,
      dataCorrections,
      issueDecisions,
      remediationActions,
      dataQualityIssueLedger: [...dataQualityIssueLedger.entries()],
      remediationHistory,
      excludedSourceRows: [...excludedSourceRows],
      activeRemediationIssueId,
      correctionCount: currentDatasetMeta.buildMetadata?.correctionCount || 0
    });
    console.assert(liveBeforePreview === liveAfterPreview, "AP 15.4.2.1 self-test failed: Preview mutated live state or Issue Ledger");
    createDataCorrection(previewApplyDraft, { feedback: false });
    const committedApplyRow = enrichedRows[0];
    console.assert(toNumber(normalizedRows[0].excess_value, "excess_value") === 80, "AP 15.4.2.1 self-test failed: committed Apply corrected canonical value mismatch");
    console.assert(previewApplyImpact.after.recoveryPotential === sum(enrichedRows, "recovery_potential"), "AP 15.4.2.1 self-test failed: Preview recovery total differs from committed Apply");
    console.assert(committedApplyRow.recovery_potential === 80 && committedApplyRow.gross_recovery_potential === 80, "AP 15.4.2.1 self-test failed: committed Apply recovery fields mismatch");
    console.assert(committedApplyRow.recovery_overlap_value === 0 && committedApplyRow.recovery_available_stock_value === 20 && committedApplyRow.recovery_is_capped === false, "AP 15.4.2.1 self-test failed: committed Apply recovery waterfall fields mismatch");
    console.assert(currentDatasetMeta.buildMetadata.correctionCount === 1, "AP 15.4.2.1 self-test failed: committed Apply correction count mismatch");

    const immutableMetadata = buildInventoryDataset({
      sourceRows: nonCurrentRows,
      headers: nonCurrentHeaders,
      sourceColumnMetadata: nonCurrentMetadata,
      columnMapping: nonCurrentMapping,
      corrections: [dsACorrection],
      options: { datasetId: "DS-IMMUTABLE", buildTimestamp: "2026-08-17T00:00:00.000Z" }
    }).buildMetadata;
    const immutableActiveRowCount = immutableMetadata.activeRowCount;
    const immutableExcludedFirst = immutableMetadata.excludedSourceRowIndexes[0];
    try { immutableMetadata.activeRowCount = 999; } catch { /* Frozen metadata may throw. */ }
    try { immutableMetadata.appliedCorrectionIds.push("CORR-X"); } catch { /* Frozen nested arrays may throw. */ }
    try { immutableMetadata.excludedSourceRowIndexes.push(999); } catch { /* Frozen nested arrays may throw. */ }
    try { immutableMetadata.excludedSourceRowIndexes[0] = 999; } catch { /* Frozen nested arrays may throw. */ }
    console.assert(immutableMetadata.activeRowCount === immutableActiveRowCount, "AP 15.4.2.1 self-test failed: buildMetadata top-level mutation succeeded");
    console.assert(!immutableMetadata.appliedCorrectionIds.includes("CORR-X"), "AP 15.4.2.1 self-test failed: appliedCorrectionIds mutation succeeded");
    console.assert(!immutableMetadata.excludedSourceRowIndexes.includes(999) && immutableMetadata.excludedSourceRowIndexes[0] === immutableExcludedFirst, "AP 15.4.2.1 self-test failed: excludedSourceRowIndexes mutation succeeded");
    let datasetIdInvariantThrown = false;
    try {
      prepareDatasetLoad({
        rows: nonCurrentRows,
        headers: nonCurrentHeaders,
        sourceColumnMetadata: nonCurrentMetadata,
        sourceLabel: "Invariant self-test",
        sourceType: "self-test",
        approvedMapping: nonCurrentMapping,
        options: { forceDatasetIdMismatchForTest: true }
      });
    } catch {
      datasetIdInvariantThrown = true;
    }
    console.assert(datasetIdInvariantThrown, "AP 15.4.2.2 self-test failed: datasetId build invariant did not throw");
  } finally {
    restoreRemediationRuntimeState(snapshot);
  }
}

  window.__obsoliqLegacySelfTests = [
    { name: "runColumnMappingSelfTests", fn: runColumnMappingSelfTests },
    { name: "runInventoryDataModelSelfTests", fn: runInventoryDataModelSelfTests },
    { name: "runDataQualityCalibrationSelfTests", fn: runDataQualityCalibrationSelfTests },
    { name: "runDataQualityRemediationSelfTests", fn: runDataQualityRemediationSelfTests },
    { name: "runUniversalMissingDataRemediationSelfTests", fn: runUniversalMissingDataRemediationSelfTests },
    { name: "runDataQualityIssueLedgerSelfTests", fn: runDataQualityIssueLedgerSelfTests },
    { name: "runRemediationLifecycleHardeningSelfTests", fn: runRemediationLifecycleHardeningSelfTests },
    { name: "runRemediationLifecycleSemanticsCompletionSelfTests", fn: runRemediationLifecycleSemanticsCompletionSelfTests },
    { name: "runDirtySampleDataSelfTests", fn: runDirtySampleDataSelfTests },
    { name: "runArchitectureStabilizationSelfTests", fn: runArchitectureStabilizationSelfTests },
    { name: "runCodeHealthHotfixSelfTests", fn: runCodeHealthHotfixSelfTests },
    { name: "runDatasetBuilderIntegrationSafetyGateSelfTests", fn: runDatasetBuilderIntegrationSafetyGateSelfTests },
    { name: "runDatasetIdentityIntegrityPackageSelfTests", fn: runDatasetIdentityIntegrityPackageSelfTests }
  ];
})();
