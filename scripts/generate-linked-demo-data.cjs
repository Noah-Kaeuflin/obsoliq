const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHash } = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const GENERATOR_VERSION = "linked-demo-generator-v1";
const DEMO_VERSION = "obsoliq-linked-demo-v1";
const DEMO_SET_ID = "OBSOLIQ-SYNTHETIC-DEMO-2026-08";
const ANALYSIS_AS_OF = "2026-08-31";
const FIRST_PERIOD = "2024-09";
const LAST_PERIOD = "2026-08";
const INVENTORY_SOURCE_ID = "SYN-DEMO-INVENTORY-2026-08";
const MATERIAL_MASTER_SOURCE_ID = "SYN-DEMO-MATERIAL-MASTER-2026-08";
const CONSUMPTION_HISTORY_SOURCE_ID = "SYN-DEMO-CONSUMPTION-HISTORY-2026-08";

const MATERIAL_MASTER_HEADERS = Object.freeze([
  "material_id", "plant", "material_description", "base_unit", "program_short", "profit_center",
  "planning_type", "mrp_controller", "production_scheduler", "purchase_organization", "accountable_l1",
  "responsible_l1", "minimum_order_quantity", "safety_stock_target", "status_safety", "supply_type",
  "standard_price", "finance_classification"
]);

const CONSUMPTION_HISTORY_HEADERS = Object.freeze([
  "material_id", "plant", "period", "consumption_quantity", "base_unit", "movement_type",
  "movement_count", "storage_location", "document_id", "document_item"
]);

const SCENARIO_BY_MATERIAL = Object.freeze({
  "MAT-1022": "declining",
  "MAT-1023": "declining",
  "MAT-1024": "declining",
  "MAT-1025": "declining",
  "MAT-1026": "declining",
  "MAT-1029": "intermittent",
  "MAT-1030": "intermittent",
  "MAT-1031": "intermittent",
  "MAT-1033": "intermittent",
  "MAT-1034": "intermittent",
  "MAT-1037": "slow",
  "MAT-1038": "slow",
  "MAT-1040": "slow",
  "MAT-1041": "slow",
  "MAT-1042": "dead",
  "MAT-1043": "nonmoving",
  "MAT-1044": "nonmoving",
  "MAT-1046": "nonmoving",
  "MAT-1047": "new_6m",
  "MAT-1048": "new_9m",
  "MAT-1050": "new_11m",
  "MAT-1051": "no_history",
  "MAT-1052": "dead",
  "MAT-1053": "true_zero",
  "MAT-1055": "boundary_12m",
  "MAT-1057": "boundary_13m",
  "MAT-1058": "reversal"
});

const SOURCE_HEADER_BY_MASTER_FIELD = Object.freeze({
  material_id: "Material",
  plant: "Plant",
  material_description: "Material Descripti",
  program_short: "Program short",
  profit_center: "Profit Center",
  planning_type: "Planif. Type",
  mrp_controller: "MRP Controller",
  production_scheduler: "Prod. Sched",
  purchase_organization: "Purchase Organis",
  accountable_l1: "Accountable L1",
  responsible_l1: "Responsible L1",
  minimum_order_quantity: "Minimum Lot Size",
  safety_stock_target: "Safety Stock Target",
  status_safety: "Status Safety",
  supply_type: "Supply Type",
  standard_price: "STD Price",
  finance_classification: "Finance Classific"
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeLf(value) {
  return String(value).replace(/\r\n?/g, "\n");
}

function readSampleCsv() {
  const source = normalizeLf(fs.readFileSync(path.join(ROOT, "sample-data.js"), "utf8"));
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "sample-data.js" });
  const csv = sandbox.window.sampleCsv;
  if (typeof csv !== "string" || !csv.trim()) throw new Error("window.sampleCsv is unavailable.");
  return normalizeLf(csv);
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const text = normalizeLf(csv);
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("Unterminated quoted CSV field.");
  row.push(cell);
  if (row.some(value => value !== "")) rows.push(row);
  const [headers = [], ...values] = rows;
  return { headers, rows: values };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(headers, rows) {
  return [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\n");
}

function monthIndex(period) {
  const match = String(period).match(/^(\d{4})-(\d{2})$/);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
}

function periodsBetween(startPeriod, endPeriod) {
  const start = monthIndex(startPeriod);
  const end = monthIndex(endPeriod);
  const periods = [];
  for (let value = start; value <= end; value += 1) {
    periods.push(`${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, "0")}`);
  }
  return periods;
}

const ALL_PERIODS = Object.freeze(periodsBetween(FIRST_PERIOD, LAST_PERIOD));
const AS_OF_MONTH_INDEX = monthIndex(LAST_PERIOD);

function scenarioFor(materialId) {
  return SCENARIO_BY_MATERIAL[materialId] || "stable";
}

function observedPeriodsForScenario(scenario) {
  if (scenario === "no_history") return [];
  if (scenario === "new_6m") return ALL_PERIODS.slice(-6);
  if (scenario === "new_9m") return ALL_PERIODS.slice(-9);
  if (scenario === "new_11m") return ALL_PERIODS.slice(-11);
  if (scenario === "boundary_12m") return ALL_PERIODS.slice(-12);
  if (scenario === "boundary_13m") return ALL_PERIODS.slice(-13);
  return [...ALL_PERIODS];
}

function quantityFor(scenario, period) {
  const index = ALL_PERIODS.indexOf(period);
  if (scenario === "declining") return index >= 21 ? 80 : index >= 18 ? 160 : 200;
  if (scenario === "intermittent") return index === 18 || index === 23 ? 120 : 0;
  if (scenario === "slow") return index === 15 ? 20 : 0;
  if (scenario === "nonmoving") return index === 10 ? 50 : 0;
  if (scenario === "dead") return index === 3 ? 50 : 0;
  if (scenario === "true_zero") return 0;
  return 100;
}

function sourceValue(headers, row, sourceHeader) {
  const index = headers.indexOf(sourceHeader);
  return index >= 0 ? row[index] ?? "" : "";
}

function uniqueInventoryMaterials(inventory) {
  const seen = new Set();
  return inventory.rows.filter(row => {
    const materialId = sourceValue(inventory.headers, row, "Material").trim();
    if (!/^MAT-\d{4}$/.test(materialId) || seen.has(materialId)) return false;
    seen.add(materialId);
    return true;
  });
}

function syntheticPlantForMaterial(materialId) {
  const match = String(materialId || "").match(/^MAT-(\d{4})$/);
  return match ? `PLANT-${String(Number(match[1]) % 4 + 1).padStart(2, "0")}` : "";
}

function buildFullDemoInventory(sampleCsv) {
  const sample = parseCsv(sampleCsv);
  const headers = [...sample.headers, "Plant"];
  const rows = sample.rows.map(row => [
    ...row,
    syntheticPlantForMaterial(sourceValue(sample.headers, row, "Material").trim())
  ]);
  return { headers, rows, csv: buildCsv(headers, rows) };
}

function buildMaterialMaster(inventory) {
  return uniqueInventoryMaterials(inventory).map(row => MATERIAL_MASTER_HEADERS.map(field => {
    if (field === "base_unit") return "EA";
    return sourceValue(inventory.headers, row, SOURCE_HEADER_BY_MASTER_FIELD[field] || "");
  }));
}

function historyRowsForMaterial(materialId, plant) {
  const scenario = scenarioFor(materialId);
  const periods = observedPeriodsForScenario(scenario);
  const rows = [];
  periods.forEach((period, periodIndex) => {
    rows.push([
      materialId,
      plant,
      period,
      quantityFor(scenario, period),
      "EA",
      "261",
      "1",
      "SYN-01",
      `SYN-${materialId.slice(4)}-${String(periodIndex + 1).padStart(3, "0")}`,
      "0001"
    ]);
    if (scenario === "reversal" && period === "2026-07") {
      rows.push([
        materialId,
        plant,
        period,
        "25",
        "EA",
        "262",
        "1",
        "SYN-01",
        `SYN-${materialId.slice(4)}-REV-001`,
        "0002"
      ]);
    }
  });
  return rows;
}

function buildHistory(materialRows) {
  return materialRows.flatMap(row => historyRowsForMaterial(row[0], row[1]));
}

function netQuantity(row) {
  const quantity = Number(row[3]);
  return row[5] === "262" ? -Math.abs(quantity) : Math.abs(quantity);
}

function expectedConditionForScenario(scenario) {
  if (scenario === "intermittent") return "intermittent_expected";
  if (scenario === "slow") return "slow_moving_candidate";
  if (scenario === "nonmoving") return "non_moving_candidate";
  if (scenario === "dead") return "dead_stock_candidate";
  if (["new_6m", "new_9m", "new_11m", "no_history", "true_zero"].includes(scenario)) return "insufficient_evidence";
  return null;
}

function expectedEligibility(condition) {
  if (!condition) return "no_case";
  if (condition === "insufficient_evidence") return "evidence_required";
  if (condition === "intermittent_expected") return "monitor_only";
  return "reviewable_case_candidate";
}

function expectedActionEligibility(condition) {
  if (!condition) return "none";
  if (condition === "insufficient_evidence" || condition === "intermittent_expected") return "eligible";
  return "review_required";
}

function expectationForMaterial(materialId, plant, historyRows) {
  const scenario = scenarioFor(materialId);
  const materialHistory = historyRows.filter(row => row[0] === materialId);
  const periods = [...new Set(materialHistory.map(row => row[2]))].sort();
  const rolling = materialHistory.filter(row => monthIndex(row[2]) >= AS_OF_MONTH_INDEX - 11 && monthIndex(row[2]) <= AS_OF_MONTH_INDEX);
  const sumForMonths = monthCount => materialHistory
    .filter(row => monthIndex(row[2]) >= AS_OF_MONTH_INDEX - monthCount + 1 && monthIndex(row[2]) <= AS_OF_MONTH_INDEX)
    .reduce((total, row) => total + netQuantity(row), 0);
  const positivePeriods = [...new Set(materialHistory.filter(row => netQuantity(row) > 0).map(row => row[2]))].sort();
  const lastPositive = positivePeriods.at(-1) || "";
  const coverage = periods.length ? monthIndex(periods.at(-1)) - monthIndex(periods[0]) + 1 : null;
  const completeness = rolling.length || periods.length
    ? [...new Set(rolling.map(row => row[2]))].length / 12
    : null;
  const condition = expectedConditionForScenario(scenario);
  return {
    inventory_entity_key: `material:${materialId}|plant:${plant}`,
    material_id: materialId,
    plant,
    cohort: scenario,
    inventory_unit_source: "material_master_fill",
    expected_unit_status: "single",
    expected_history_coverage_months: coverage,
    expected_history_completeness: completeness,
    expected_net_consumption_3m: periods.length ? sumForMonths(3) : null,
    expected_net_consumption_6m: periods.length ? sumForMonths(6) : null,
    expected_net_consumption_12m: periods.length ? sumForMonths(12) : null,
    expected_months_since_last_consumption: lastPositive ? AS_OF_MONTH_INDEX - monthIndex(lastPositive) : null,
    expected_condition_code: condition,
    expected_evidence_strength: condition === "insufficient_evidence"
      ? "insufficient"
      : ["dead_stock_candidate", "non_moving_candidate"].includes(condition)
        ? "medium"
        : condition
          ? "high"
          : "not_applicable",
    expected_recovery_case_eligibility: expectedEligibility(condition),
    expected_action_eligibility: expectedActionEligibility(condition),
    expected_missing_evidence: condition === "insufficient_evidence",
    expected_relationship_type: scenario === "no_history" ? "unmatched" : "exact_material_plant",
    expected_material_master_match: true
  };
}

function cohortCounts(expectations) {
  return expectations.reduce((counts, item) => {
    counts[item.cohort] = (counts[item.cohort] || 0) + 1;
    return counts;
  }, {});
}

function conditionCounts(expectations) {
  return expectations.reduce((counts, item) => {
    const key = item.expected_condition_code || "no_case";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function assertGeneratorContract(inventoryCsv, inventory, masterRows, historyRows, expectations) {
  if (inventory.rows.length !== 102) throw new Error(`Expected 102 Inventory rows, found ${inventory.rows.length}.`);
  if (masterRows.length !== 98) throw new Error(`Expected 98 unique valid Material Master rows, found ${masterRows.length}.`);
  if (new Set(masterRows.map(row => `${row[0]}|${row[1]}`)).size !== masterRows.length) throw new Error("Material Master relationship keys are not unique.");
  if (masterRows.some(row => !row[1] || row[3] !== "EA")) throw new Error("Golden Material Master plant/unit contract is invalid.");
  const plantByMaterial = new Map(masterRows.map(row => [row[0], row[1]]));
  if (historyRows.some(row => row[1] !== plantByMaterial.get(row[0]) || row[4] !== "EA" || !["261", "262"].includes(row[5]))) throw new Error("Consumption History identity/unit/movement contract is invalid.");
  if (!historyRows.some(row => row[3] === 0 || row[3] === "0")) throw new Error("True numeric zero evidence is missing.");
  if (!historyRows.some(row => row[5] === "262")) throw new Error("Reversal evidence is missing.");
  const counts = cohortCounts(expectations);
  const minimums = { stable: 20, declining: 5, intermittent: 5, slow: 4, nonmoving: 3, dead: 2 };
  Object.entries(minimums).forEach(([cohort, minimum]) => {
    if ((counts[cohort] || 0) < minimum) throw new Error(`Cohort ${cohort} is below ${minimum}.`);
  });
  if (["primary_category", "condition_code", "risk_class", "evidence_readiness"].some(field => inventory.headers.includes(field))) {
    throw new Error("Inventory raw source contains derived risk output fields.");
  }
  if (/\r/.test(inventoryCsv)) throw new Error("Inventory payload is not LF-normalized.");
}

function buildOutputs() {
  const sampleCsv = readSampleCsv();
  const inventory = buildFullDemoInventory(sampleCsv);
  const inventoryCsv = inventory.csv;
  const masterRows = buildMaterialMaster(inventory);
  const historyRows = buildHistory(masterRows);
  const materialMasterCsv = buildCsv(MATERIAL_MASTER_HEADERS, masterRows);
  const consumptionHistoryCsv = buildCsv(CONSUMPTION_HISTORY_HEADERS, historyRows);
  const controlledEntities = masterRows.map(row => expectationForMaterial(row[0], row[1], historyRows));
  assertGeneratorContract(inventoryCsv, inventory, masterRows, historyRows, controlledEntities);

  const sourceHashes = {
    inventory_snapshot_csv: sha256(inventoryCsv),
    material_master_csv: sha256(materialMasterCsv),
    consumption_history_csv: sha256(consumptionHistoryCsv)
  };
  const expectations = {
    schema_version: "obsoliq-linked-demo-expectations-v1",
    classification: "synthetic",
    human_expert_validated: false,
    customer_data: false,
    personal_data: false,
    demo_set_id: DEMO_SET_ID,
    generator_version: GENERATOR_VERSION,
    analysis_as_of: ANALYSIS_AS_OF,
    timezone: "UTC",
    first_full_demo_month: FIRST_PERIOD,
    last_full_demo_month: LAST_PERIOD,
    source_ids: {
      inventory_snapshot: INVENTORY_SOURCE_ID,
      material_master: MATERIAL_MASTER_SOURCE_ID,
      consumption_history: CONSUMPTION_HISTORY_SOURCE_ID
    },
    source_hashes: sourceHashes,
    compatibility_sample_hash: sha256(sampleCsv),
    row_counts: {
      inventory_snapshot: inventory.rows.length,
      material_master: masterRows.length,
      consumption_history: historyRows.length
    },
    cohorts: cohortCounts(controlledEntities),
    expected_condition_counts: conditionCounts(controlledEntities),
    controlled_entities: controlledEntities,
    boundary_entities: {
      coverage_11: "MAT-1050",
      coverage_12: "MAT-1055",
      coverage_13: "MAT-1057",
      coverage_24: "MAT-1001",
      true_zero: "MAT-1053",
      no_history: "MAT-1051",
      reversal: "MAT-1058"
    }
  };
  const expectationsJson = `${JSON.stringify(expectations, null, 2)}\n`;
  const materialTemplateCsv = `${MATERIAL_MASTER_HEADERS.join(",")}\n`;
  const historyTemplateCsv = `${CONSUMPTION_HISTORY_HEADERS.join(",")}\n`;
  const contentHashes = {
    ...sourceHashes,
    expectations_json: sha256(expectationsJson),
    material_master_template_csv: sha256(materialTemplateCsv),
    consumption_history_template_csv: sha256(historyTemplateCsv)
  };
  const descriptor = {
    version: DEMO_VERSION,
    classification: "synthetic",
    demoSetId: DEMO_SET_ID,
    analysisAsOf: ANALYSIS_AS_OF,
    timezone: "UTC",
    generatorVersion: GENERATOR_VERSION,
    sourceIds: {
      inventorySnapshot: INVENTORY_SOURCE_ID,
      materialMaster: MATERIAL_MASTER_SOURCE_ID,
      consumptionHistory: CONSUMPTION_HISTORY_SOURCE_ID
    },
    contentHashes,
    sources: {
      inventorySnapshot: {
        sourceId: INVENTORY_SOURCE_ID,
        sourceLabel: "ObsoliQ Demo - Inventory Snapshot.csv",
        sourceType: "synthetic_demo",
        classification: "synthetic",
        rowCount: inventory.rows.length,
        csv: inventoryCsv
      },
      materialMaster: {
        sourceId: MATERIAL_MASTER_SOURCE_ID,
        sourceLabel: "ObsoliQ Demo - Material Master.csv",
        sourceType: "synthetic_demo",
        classification: "synthetic",
        rowCount: masterRows.length,
        csv: materialMasterCsv
      },
      consumptionHistory: {
        sourceId: CONSUMPTION_HISTORY_SOURCE_ID,
        sourceLabel: "ObsoliQ Demo - Consumption History.csv",
        sourceType: "synthetic_demo",
        classification: "synthetic",
        rowCount: historyRows.length,
        csv: consumptionHistoryCsv
      }
    },
    templates: {
      materialMaster: {
        filename: "obsoliq-material-master-template.csv",
        classification: "structural-template",
        csv: materialTemplateCsv
      },
      consumptionHistory: {
        filename: "obsoliq-consumption-history-template.csv",
        classification: "structural-template",
        csv: historyTemplateCsv
      }
    },
    expectations
  };
  const demoDataJs = `// Generated by scripts/generate-linked-demo-data.cjs. Do not edit manually.\nwindow.ObsoliQFullDemo = Object.freeze(${JSON.stringify(descriptor, null, 2)});\n`;

  return {
    "demo-data.js": demoDataJs,
    "data/demo/inventory-snapshot.csv": inventoryCsv,
    "data/demo/material-master.csv": materialMasterCsv,
    "data/demo/consumption-history.csv": consumptionHistoryCsv,
    "data/demo/demo-expectations.json": expectationsJson,
    "data/templates/material-master-template.csv": materialTemplateCsv,
    "data/templates/consumption-history-template.csv": historyTemplateCsv
  };
}

function writeOutputs(outputs = buildOutputs()) {
  Object.entries(outputs).forEach(([relativePath, content]) => {
    const target = path.join(ROOT, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  });
  return outputs;
}

if (require.main === module) {
  const outputs = writeOutputs();
  console.log(JSON.stringify({
    status: "PASS",
    generatorVersion: GENERATOR_VERSION,
    outputs: Object.fromEntries(Object.entries(outputs).map(([name, content]) => [name, {
      bytes: Buffer.byteLength(content),
      sha256: sha256(content)
    }]))
  }, null, 2));
}

module.exports = Object.freeze({
  ROOT,
  GENERATOR_VERSION,
  DEMO_VERSION,
  DEMO_SET_ID,
  ANALYSIS_AS_OF,
  MATERIAL_MASTER_HEADERS,
  CONSUMPTION_HISTORY_HEADERS,
  SCENARIO_BY_MATERIAL,
  buildOutputs,
  writeOutputs,
  sha256
});
