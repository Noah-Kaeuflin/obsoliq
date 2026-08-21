/* ObsoliQ Canonical Data Model
 * File-compatible classic script module. Owns the stable inventory field contract.
 */
(function registerCanonicalModel(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.core = root.core || {};

const inventoryFieldDefinitions = Object.freeze({
  material_id: {
    label: { de: "Materialnummer", en: "Material Number" },
    type: "text",
    requirement: "required",
    analysis_group: "core",
    importable: true,
    aliases: ["material", "material number", "material id", "matnr"]
  },
  stock_value: {
    label: { de: "Bestandswert", en: "Inventory Value" },
    type: "currency",
    requirement: "required",
    analysis_group: "core",
    importable: true,
    aliases: ["stock value", "stock value eur", "stock value keur", "stock value k eur", "inventory value", "bestandswert", "lagerbestandswert"]
  },
  plant: {
    label: { de: "Werk", en: "Plant" },
    type: "text",
    requirement: "recommended",
    analysis_group: "core",
    importable: true,
    aliases: ["plant", "werk", "werksnummer"]
  },
  profit_center: {
    label: { de: "Profit Center", en: "Profit Center" },
    type: "text",
    requirement: "recommended",
    analysis_group: "core",
    importable: true,
    aliases: ["profit center", "profitcentre"]
  },
  div: {
    label: { de: "Division", en: "Division" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["div", "division"]
  },
  material_description: {
    label: { de: "Materialbeschreibung", en: "Material Description" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["material description", "material descripti", "description", "material text", "materialbeschreibung"]
  },
  program_short: {
    label: { de: "Programm", en: "Program" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["program short", "program", "material group", "material group short", "programm"]
  },
  division_sector: {
    label: { de: "Sparte / Bereich", en: "Division / Sector" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["sparte secteur d", "division sector", "sector"]
  },
  planning_type: {
    label: { de: "Planungstyp", en: "Planning Type" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["planif type", "planning type", "mrp type"]
  },
  mrp_controller: {
    label: { de: "Disponent", en: "MRP Controller" },
    type: "text",
    requirement: "recommended",
    analysis_group: "workflow",
    importable: true,
    aliases: ["mrp controller", "disponent", "planner"]
  },
  production_scheduler: {
    label: { de: "Produktionssteuerung", en: "Production Scheduler" },
    type: "text",
    requirement: "optional",
    analysis_group: "workflow",
    importable: true,
    aliases: ["prod sched", "production scheduler"]
  },
  gac_purchasing: {
    label: { de: "Einkauf / GAC", en: "GAC / Purchasing" },
    type: "text",
    requirement: "optional",
    analysis_group: "workflow",
    importable: true,
    aliases: ["gac purchasing"]
  },
  purchase_organization: {
    label: { de: "Einkaufsorganisation", en: "Purchasing Organization" },
    type: "text",
    requirement: "recommended",
    analysis_group: "workflow",
    importable: true,
    aliases: ["purchase organis", "purchase organization", "purchasing organization", "ekorg"]
  },
  accountable_l1: {
    label: { de: "Verantwortlich L1", en: "Accountable L1" },
    type: "text",
    requirement: "recommended",
    analysis_group: "workflow",
    importable: true,
    aliases: ["accountable l1"]
  },
  accountable_l2: {
    label: { de: "Verantwortlich L2", en: "Accountable L2" },
    type: "text",
    requirement: "optional",
    analysis_group: "workflow",
    importable: true,
    aliases: ["accountable l2"]
  },
  accountable_l3: {
    label: { de: "Verantwortlich L3", en: "Accountable L3" },
    type: "text",
    requirement: "optional",
    analysis_group: "workflow",
    importable: true,
    aliases: ["accountable l3"]
  },
  responsible_l1: {
    label: { de: "Zuständig L1", en: "Responsible L1" },
    type: "text",
    requirement: "recommended",
    analysis_group: "workflow",
    importable: true,
    aliases: ["responsible l1"]
  },
  responsible_l2: {
    label: { de: "Zuständig L2", en: "Responsible L2" },
    type: "text",
    requirement: "optional",
    analysis_group: "workflow",
    importable: true,
    aliases: ["responsible l2"]
  },
  responsible_l3: {
    label: { de: "Zuständig L3", en: "Responsible L3" },
    type: "text",
    requirement: "optional",
    analysis_group: "workflow",
    importable: true,
    aliases: ["responsible l3"]
  },
  availability: {
    label: { de: "Verfügbarkeit", en: "Availability" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["availability"]
  },
  pup_pmp: {
    label: { de: "PUP / PMP", en: "PUP / PMP" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["pup pmp"]
  },
  standard_price: {
    label: { de: "Standardpreis", en: "Standard Price" },
    type: "currency",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["std price", "standard price"]
  },
  par: {
    label: { de: "PAR", en: "PAR" },
    type: "number",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["par"]
  },
  avg_monthly_consumption: {
    label: { de: "Durchschnittlicher Monatsverbrauch", en: "Average Monthly Consumption" },
    type: "number",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["monthlyconsum", "monthly consum", "average monthly consumption", "avg monthly consumption"]
  },
  minimum_order_quantity: {
    label: { de: "Mindestbestellmenge", en: "Minimum Order Quantity" },
    type: "number",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["minimum lot size", "minimum order quantity", "moq"]
  },
  supply_type: {
    label: { de: "Beschaffungsart", en: "Supply Type" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["supply type", "procurement type"]
  },
  finance_classification: {
    label: { de: "Finance-Klassifizierung", en: "Finance Classification" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["finance classific", "finance classification"]
  },
  no_need_flag: {
    label: { de: "Ohne-Bedarf-Kennzeichen", en: "No-Demand Flag" },
    type: "boolean",
    requirement: "optional",
    analysis_group: "recovery",
    importable: true,
    aliases: ["no need flag", "no demand flag"]
  },
  direct_no_need_value: {
    label: { de: "Direkter Ohne-Bedarf-Wert", en: "Direct No Demand Value" },
    type: "currency",
    requirement: "optional",
    analysis_group: "recovery",
    importable: true,
    aliases: ["no need value", "no demand value", "ohne bedarf", "no need eur", "no demand eur", "direct no need value", "direct no demand value"]
  },
  strategic: {
    label: { de: "Strategisch", en: "Strategic" },
    type: "boolean",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["strategic"]
  },
  status_safety: {
    label: { de: "Sicherheitsstatus", en: "Safety Status" },
    type: "text",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["status safety", "safety status"]
  },
  safety_stock_target: {
    label: { de: "Sicherheitsbestandsziel", en: "Safety Stock Target" },
    type: "number",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["safety stock target"]
  },
  stock_quantity: {
    label: { de: "Bestandsmenge", en: "Stock Quantity" },
    type: "number",
    requirement: "optional",
    analysis_group: "core",
    importable: true,
    aliases: ["stock quantity", "stock quantity qty", "inventory quantity"]
  },
  good_stock_value: {
    label: { de: "Frei verwendbarer Bestand", en: "Good Stock Value" },
    type: "currency",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["good stock eur", "good stock", "good stock value"]
  },
  bad_stock_value: {
    label: { de: "Gesperrt / QI", en: "Blocked / QI Value" },
    type: "currency",
    requirement: "recommended",
    analysis_group: "recovery",
    importable: true,
    aliases: ["bad stock eur", "bad stock", "bad stock value", "blocked stock value", "quality inspection stock value"]
  },
  safety_stock_fill_qty: {
    label: { de: "Sicherheitsbestand Füllmenge", en: "Safety Stock Fill Quantity" },
    type: "number",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["safety stock fill qty"]
  },
  safety_stock_fill_value: {
    label: { de: "Sicherheitsbestand Füllwert", en: "Safety Stock Fill Value" },
    type: "currency",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["safety stock fill eur", "safety stock fill value"]
  },
  safety_stock_mis_qty: {
    label: { de: "Sicherheitsbestand Fehlmenge", en: "Safety Stock Missing Quantity" },
    type: "number",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["safety stock mis qty"]
  },
  safety_stock_mis_value: {
    label: { de: "Sicherheitsbestand Fehlwert", en: "Safety Stock Missing Value" },
    type: "currency",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["safety stock mis eur", "safety stock mis value"]
  },
  no_need_conso_qty: {
    label: { de: "Ohne Bedarf mit Verbrauch – Menge", en: "No Demand with Consumption Quantity" },
    type: "number",
    requirement: "optional",
    analysis_group: "recovery",
    importable: true,
    aliases: ["no need conso qty"]
  },
  no_need_conso_value: {
    label: { de: "Ohne Bedarf mit Verbrauch", en: "No Demand with Consumption Value" },
    type: "currency",
    requirement: "recommended",
    analysis_group: "recovery",
    importable: true,
    aliases: ["no need conso eur", "no need conso value"]
  },
  no_need_no_con_qty: {
    label: { de: "Ohne Bedarf ohne Verbrauch – Menge", en: "No Demand without Consumption Quantity" },
    type: "number",
    requirement: "optional",
    analysis_group: "recovery",
    importable: true,
    aliases: ["no need no con qty"]
  },
  no_need_no_con_value: {
    label: { de: "Ohne Bedarf ohne Verbrauch", en: "No Demand without Consumption Value" },
    type: "currency",
    requirement: "recommended",
    analysis_group: "recovery",
    importable: true,
    aliases: ["no need no con eur", "no need no con value"]
  },
  excess_qty: {
    label: { de: "Überbestandsmenge", en: "Excess Quantity" },
    type: "number",
    requirement: "optional",
    analysis_group: "recovery",
    importable: true,
    aliases: ["excess qty", "excess quantity"]
  },
  excess_value: {
    label: { de: "Überbestand", en: "Excess Stock Value" },
    type: "currency",
    requirement: "recommended",
    analysis_group: "recovery",
    importable: true,
    aliases: ["excess eur", "excess value", "excess stock value", "overstock value"]
  },
  no_plan_qty: {
    label: { de: "Ohne Plan – Menge", en: "Unplanned Quantity" },
    type: "number",
    requirement: "optional",
    analysis_group: "recovery",
    importable: true,
    aliases: ["no plan qty", "unplanned qty"]
  },
  no_plan_value: {
    label: { de: "Ohne Plan", en: "Unplanned Value" },
    type: "currency",
    requirement: "recommended",
    analysis_group: "recovery",
    importable: true,
    aliases: ["no plan eur", "no plan value", "unplanned value"]
  },
  coverage_months: {
    label: { de: "Reichweite in Monaten", en: "Coverage Months" },
    type: "number",
    requirement: "optional",
    analysis_group: "context",
    importable: true,
    aliases: ["coverage months", "months of coverage", "reichweite monate"]
  },

  inventory_row_key: { label: { de: "Technischer Zeilenschlüssel", en: "Technical Row Key" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  row_number: { label: { de: "Zeilennummer", en: "Row Number" }, type: "number", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  no_need_value: { label: { de: "Berechneter Ohne-Bedarf-Wert", en: "Calculated No Demand Value" }, type: "currency", requirement: "derived", analysis_group: "derived", importable: false, aliases: [], skipCanonicalAlias: true },
  category: { label: { de: "Kategorie", en: "Category" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  primary_category: { label: { de: "Primärkategorie", en: "Primary Category" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  gross_recovery_potential: { label: { de: "Brutto-Recovery-Potenzial", en: "Gross Recovery Potential" }, type: "currency", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  recovery_potential: { label: { de: "Recovery-Potenzial", en: "Recovery Potential" }, type: "currency", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  recovery_overlap_value: { label: { de: "Überschneidung / Deckelung", en: "Overlap / Capped Value" }, type: "currency", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  recovery_available_stock_value: { label: { de: "Nicht adressierter Bestandswert", en: "Unaddressed Inventory Value" }, type: "currency", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  recovery_is_capped: { label: { de: "Recovery gedeckelt", en: "Recovery Capped" }, type: "boolean", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  net_no_need_value: { label: { de: "Netto Ohne Bedarf", en: "Net No Demand" }, type: "currency", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  net_no_plan_value: { label: { de: "Netto Ohne Plan", en: "Net Unplanned" }, type: "currency", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  net_excess_value: { label: { de: "Netto Überbestand", en: "Net Excess Stock" }, type: "currency", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  net_bad_stock_value: { label: { de: "Netto Gesperrt / QI", en: "Net Blocked / QI" }, type: "currency", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  open_purchase_order_issue: { label: { de: "Offene-Bestellung-Risiko", en: "Open Purchase Order Issue" }, type: "boolean", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  root_cause: { label: { de: "Ursache", en: "Root Cause" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  recommended_action: { label: { de: "Empfohlene Maßnahme", en: "Recommended Action" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  next_step: { label: { de: "Nächster Schritt", en: "Next Step" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  decision_type: { label: { de: "Entscheidungstyp", en: "Decision Type" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  owner_function: { label: { de: "Verantwortlicher Bereich", en: "Owner Function" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  priority: { label: { de: "Priorität", en: "Priority" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  confidence: { label: { de: "Sicherheit", en: "Confidence" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] },
  status: { label: { de: "Status", en: "Status" }, type: "text", requirement: "derived", analysis_group: "derived", importable: false, aliases: [] }
});

const INVENTORY_FIELD_TYPES = new Set(["text", "number", "boolean", "date", "currency", "percentage"]);
const INVENTORY_FIELD_REQUIREMENTS = new Set(["required", "recommended", "optional", "derived"]);
const INVENTORY_ANALYSIS_GROUPS = new Set(["core", "recovery", "workflow", "context", "derived"]);

function normalizeHeaderToken(header) {
  return String(header ?? "")
    .replace(/\u20ac/g, "EUR")
    .replace(/[()\[\]\/._-]+/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function validateInventoryFieldDefinitions(definitions) {
  const errors = [];
  const aliasOwners = new Map();

  Object.entries(definitions).forEach(([fieldKey, definition]) => {
    if (!INVENTORY_FIELD_TYPES.has(definition.type)) {
      errors.push(`Unknown type '${definition.type}' for ${fieldKey}.`);
    }
    if (!INVENTORY_FIELD_REQUIREMENTS.has(definition.requirement)) {
      errors.push(`Unknown requirement '${definition.requirement}' for ${fieldKey}.`);
    }
    if (!INVENTORY_ANALYSIS_GROUPS.has(definition.analysis_group)) {
      errors.push(`Unknown analysis group '${definition.analysis_group}' for ${fieldKey}.`);
    }
    if (definition.requirement === "derived" && definition.importable !== false) {
      errors.push(`Derived field ${fieldKey} must not be importable.`);
    }
    if (definition.requirement !== "derived" && definition.importable === false) {
      errors.push(`Non-derived field ${fieldKey} must be importable.`);
    }
    if (definition.type === "percentage" && !["ratio", "percent_points"].includes(definition.percentageStorage || "percent_points")) {
      errors.push(`Percentage field ${fieldKey} must define percentageStorage as ratio or percent_points.`);
    }

    const candidates = [definition.skipCanonicalAlias ? null : fieldKey, definition.label?.de, definition.label?.en, ...(definition.aliases || [])];
    candidates.filter(Boolean).forEach(alias => {
      const token = normalizeHeaderToken(alias);
      if (!token) return;
      const existingOwner = aliasOwners.get(token);
      if (existingOwner && existingOwner !== fieldKey) {
        errors.push(`Alias '${alias}' is assigned to both ${existingOwner} and ${fieldKey}.`);
      } else {
        aliasOwners.set(token, fieldKey);
      }
    });
  });

  return errors;
}

function buildInventoryNormalizeMap(definitions) {
  const map = {};
  Object.entries(definitions).forEach(([fieldKey, definition]) => {
    const candidates = [definition.skipCanonicalAlias ? null : fieldKey, definition.label?.de, definition.label?.en, ...(definition.aliases || [])];
    candidates.filter(Boolean).forEach(alias => {
      const token = normalizeHeaderToken(alias);
      if (token && !map[token]) map[token] = fieldKey;
    });
  });
  return Object.freeze(map);
}

const inventoryFieldDefinitionErrors = validateInventoryFieldDefinitions(inventoryFieldDefinitions);
const normalizeMap = buildInventoryNormalizeMap(inventoryFieldDefinitions);
const numericKeys = Object.freeze(
  Object.entries(inventoryFieldDefinitions)
    .filter(([, definition]) => definition.importable !== false && ["number", "currency", "percentage"].includes(definition.type))
    .map(([fieldKey]) => fieldKey)
);
const currencyKeys = Object.freeze(
  Object.entries(inventoryFieldDefinitions)
    .filter(([, definition]) => definition.importable !== false && definition.type === "currency")
    .map(([fieldKey]) => fieldKey)
);
const percentageKeys = Object.freeze(
  Object.entries(inventoryFieldDefinitions)
    .filter(([, definition]) => definition.importable !== false && definition.type === "percentage")
    .map(([fieldKey]) => fieldKey)
);
const protectedImportFieldKeys = new Set(
  Object.entries(inventoryFieldDefinitions)
    .filter(([, definition]) => definition.importable === false)
    .map(([fieldKey]) => fieldKey)
);

function safeImportFieldKey(fieldKey) {
  return protectedImportFieldKeys.has(fieldKey) ? `source_${fieldKey}` : fieldKey;
}

function importableFieldEntries() {
  return Object.entries(inventoryFieldDefinitions)
    .filter(([, definition]) => definition.importable !== false);
}

  root.core.canonical = Object.freeze({
    version: "1",
    inventoryFieldDefinitions,
    normalizeHeaderToken,
    validateInventoryFieldDefinitions,
    inventoryFieldDefinitionErrors,
    normalizeMap,
    numericKeys,
    currencyKeys,
    percentageKeys,
    protectedImportFieldKeys,
    safeImportFieldKey,
    importableFieldEntries
  });
})(window);
