/* RECOVERY-LOOP-01A: one explicitly reviewed open PO item per physical source row. */
(function (global) {
  const root = global.ObsoliQ;
  const mapping = root.mapping.engine;
  const source = root.data.sourceModel;
  const normalizer = root.data.inputNormalizationEngine;
  const semantics = root.data.consumptionHistorySemanticsEngine;
  const VERSION = "purchase-orders-v1";
  const definitions = Object.freeze(Object.fromEntries([
    ["purchase_order", "Bestellung", "Purchase order", "text", ["Purchase Order", "Bestellnummer", "EBELN"]],
    ["purchase_order_item", "Position", "Item", "text", ["PO Item", "Bestellposition", "EBELP"]],
    ["material_id", "Material", "Material", "text", ["Material", "Materialnummer", "MATNR"]],
    ["plant", "Werk", "Plant", "text", ["Plant", "Werk", "WERKS"]],
    ["open_quantity", "Offene Menge", "Open quantity", "number", ["Open Quantity", "Offene Menge", "Restmenge"]],
    ["base_unit", "Einheit", "Unit", "text", ["Unit", "Einheit", "MEINS"]],
    ["supplier", "Lieferant", "Supplier", "text", ["Supplier", "Lieferant", "LIFNR"]],
    ["delivery_date", "Lieferdatum", "Delivery date", "text", ["Delivery Date", "Lieferdatum", "EINDT"]],
    ["buyer", "Einkäufer", "Buyer", "text", ["Buyer", "Einkäufer", "EKGRP"]],
    ["item_status", "Positionsstatus", "Item status", "text", ["Item Status", "Positionsstatus"]],
    ["open_value", "Offener Positionswert", "Open item value", "currency", ["Open Value", "Offener Positionswert"]],
    ["source_currency", "Quellwährung", "Source currency", "text", ["Currency", "Währung", "WAERS"]],
    ["schedule_line", "Einteilung (nicht unterstützt)", "Schedule line (unsupported)", "text", ["Schedule Line", "Einteilung", "ETENR"]],
    ["source_system", "Quellsystem", "Source system", "text", ["Source System", "Quellsystem", "LOGSYS"]]
  ].map(([key, de, en, type, aliases], index) => [key, Object.freeze({
    label: { de, en }, type, aliases, importable: true,
    requirement: index < 6 ? "required" : "optional", analysis_group: "procurement"
  })])));
  const policy = Object.freeze({ requiredFields: Object.keys(definitions).slice(0, 6), organizationFields: ["plant"], workflowFields: [], recoveryInputFields: [] });
  const text = value => String(value ?? "").trim();
  const clone = value => JSON.parse(JSON.stringify(value));
  function trust() {
    return root.application.inputTrustService.createInputTrustService({
      canonical: root.core.canonical, schemaProfiler: root.data.schemaProfiler,
      inputNormalizationEngine: normalizer, mappingEngine: mapping, clock: () => ""
    });
  }
  const options = metadata => ({ policy, fieldDefinitions: definitions, protectedFieldKeys: [], sourceColumnMetadata: metadata });
  const signature = value => trust().normalizationPolicySignature(value);
  function sourceSignature(input) {
    return signature({ version: VERSION, headers: input.headers || [], metadata: input.sourceColumnMetadata || [], rows: input.sourceRows || [] });
  }
  function inspect(input = {}) {
    const metadata = input.sourceColumnMetadata || [];
    const validation = mapping.validateColumnMapping(input.columnMapping || [], options(metadata));
    const entries = validation.mapping.filter(entry => entry.status === "mapped" && !entry.ignored && !entry.protected);
    const invalidIdentity = entries.some(entry => !source.physicalSourceIdentityForMappingEntry(entry, metadata));
    const mapped = validation.valid && !invalidIdentity ? mapping.applyApprovedColumnMapping({
      headers: input.headers || [], rows: input.sourceRows || [], mapping: validation.mapping, ...options(metadata)
    }) : [];
    const service = trust();
    const assessment = service.prepareInputTrustAssessment({
      headers: input.headers || [], rows: input.sourceRows || [], sourceColumnMetadata: metadata,
      mapping: validation.mapping, packageType: "purchase_orders", mappingPolicy: policy, fieldDefinitions: definitions
    });
    const fields = {};
    for (const entry of entries) {
      const key = entry.selectedCanonicalField;
      const proposed = assessment.proposedNormalizationPolicies?.fields?.[key];
      if (!proposed) continue;
      const override = input.normalizationPolicy?.fields?.[key];
      const accepted = service.normalizationPolicyMatchesSourceIdentity({ policy: override, mappingEntry: entry, sourceColumnMetadata: metadata });
      fields[key] = { ...proposed, scaleSource: "auto" };
      // Only interpretation controls may override the current physical identity.
      if (accepted) for (const property of ["numericLocale", "localeOverride", "scaleSource", "sourceScaleFactor", "sourceCurrency", "dateFormat", "excelDateSystem"]) {
        if (Object.prototype.hasOwnProperty.call(override, property)) fields[key][property] = override[property];
      }
    }
    const effectivePolicy = { fields };
    const normalized = normalizer.normalizeRows({ rows: mapped, columnMapping: validation.mapping, sourceColumnMetadata: metadata, fieldDefinitions: definitions, mappingPolicy: policy, normalizationPolicy: effectivePolicy });
    const duplicate = new Map();
    for (const row of normalized.normalizedRows) {
      const key = signature([text(row.purchase_order), text(row.purchase_order_item)]);
      duplicate.set(key, (duplicate.get(key) || 0) + 1);
    }
    const systems = new Set(mapped.map(row => text(row.source_system)).filter(Boolean));
    const currencies = new Set(mapped.map(row => text(row.source_currency).toUpperCase()).filter(Boolean));
    const rows = normalized.normalizedRows.map((value, index) => {
      const raw = mapped[index];
      const row = Object.fromEntries(Object.keys(definitions).map(key => [key, ["open_quantity", "open_value"].includes(key) ? value[key] ?? null : text(raw[key])]));
      const reasons = [];
      for (const key of ["purchase_order", "purchase_order_item", "material_id", "plant", "base_unit"]) if (!row[key]) reasons.push("missing_" + key);
      row.position_id = signature([row.purchase_order, row.purchase_order_item]);
      row.base_unit = semantics.normalizedUnit(row.base_unit);
      row.quantity_status = value.__numericParseResults?.open_quantity?.status || (typeof row.open_quantity === "number" && Number.isFinite(row.open_quantity) ? "valid" : raw.open_quantity == null || !text(raw.open_quantity) ? "missing" : "invalid");
      if (row.quantity_status !== "valid") reasons.push("quantity_" + row.quantity_status);
      else if (row.open_quantity < 0) reasons.push("negative_open_quantity");
      else if (row.open_quantity === 0) reasons.push("zero_open_quantity");
      if (duplicate.get(row.position_id) > 1) reasons.push("duplicate_position");
      if (systems.size > 1) reasons.push("multiple_source_systems");
      if (row.schedule_line) reasons.push("unsupported_schedule_line");
      if (/^(closed|geschlossen|completed|complete|abgeschlossen|deleted|gelöscht|cancelled|canceled|storniert)$/i.test(row.item_status)) reasons.push("closed_item");
      else if (row.item_status && !/^(open|offen|partial|partially delivered|teilgeliefert|released|freigegeben)$/i.test(row.item_status)) reasons.push("unknown_item_status");
      const datePolicy = fields.delivery_date || {};
      const date = datePolicy.dateFormat === "excel-serial" && !["1900", "1904"].includes(datePolicy.excelDateSystem)
        ? { status: "invalid", normalizedDate: "" }
        : semantics.parsePostingDate(row.delivery_date, datePolicy.dateFormat || "auto", { excelDateSystem: datePolicy.excelDateSystem || "" });
      row.delivery_date_raw = row.delivery_date;
      row.delivery_date = date.status === "valid" ? date.normalizedDate : "";
      row.delivery_date_status = date.status;
      row.source_currency = row.source_currency.toUpperCase();
      const parsedValue = root.core.valueUtils.parseLocalizedNumericValue({
        rawValue: raw.open_value, fieldDefinition: definitions.open_value,
        normalizationPolicy: fields.open_value || {},
        headerHints: root.core.valueUtils.extractSourceHeaderHints(fields.open_value?.sourceColumn || "")
      });
      const detectedCurrency = parsedValue.detectedCurrency || fields.open_value?.sourceCurrency || "";
      row.value_status = typeof row.open_value === "number" && Number.isFinite(row.open_value) ? "valid" : text(raw.open_value) ? "invalid" : "missing";
      if (!/^[A-Z]{3}$/.test(row.source_currency) || currencies.size > 1 || (detectedCurrency && detectedCurrency !== row.source_currency)) row.value_status = "currency_unavailable";
      if (row.value_status !== "valid") row.open_value = null;
      row.source_row_index = input.sourceRows[index]?.__sourceRowIndex ?? index + 1;
      row.package_row_key = "PO-" + row.source_row_index;
      row.exclusion_reasons = [...new Set(reasons)];
      row.usable = !reasons.length;
      return row;
    });
    const mappingSignature = mapping.columnMappingSignature(validation.mapping, options(metadata));
    const normalizationPolicySignature = signature(effectivePolicy);
    const reviewBinding = signature({ source: sourceSignature(input), mappingSignature, normalizationPolicySignature });
    const blockingErrors = [...validation.errors];
    if (invalidIdentity) blockingErrors.push({ key: "poInvalidIdentity" });
    if (!rows.some(row => row.usable)) blockingErrors.push({ key: "poNoUsableRows" });
    return {
      rows, effectivePolicy, reviewBinding, mappingSignature, normalizationPolicySignature,
      validation: { status: blockingErrors.length ? "invalid" : "ready", statusKey: blockingErrors.length ? "invalid" : "ready",
        mappingValidation: validation, blockingErrors, warnings: [], rowCount: rows.length, validRowCount: rows.filter(row => row.usable).length,
        keyGranularity: "purchase_order_item", diagnostics: rows.flatMap(row => row.exclusion_reasons.map(code => ({ code, sourceRowIndex: row.source_row_index }))) }
    };
  }
  function validatePurchaseOrdersPackage(input) { return inspect(input).validation; }
  function buildPurchaseOrdersPackage(input = {}) {
    const result = inspect(input);
    if (input.purchaseOrderReview?.confirmed !== true || input.purchaseOrderReview.binding !== result.reviewBinding) {
      result.validation.blockingErrors.push({ key: "poReviewRequired" });
      result.validation.status = result.validation.statusKey = "invalid";
    }
    return {
      normalizedRows: result.rows, validation: result.validation,
      relationshipKeys: { material: ["material_id"], organization: ["plant"], position: ["purchase_order", "purchase_order_item"] },
      buildMetadata: { schemaVersion: VERSION, packageType: "purchase_orders", datasetId: input.datasetId || "",
        mappingSignature: result.mappingSignature, normalizationPolicySignature: result.normalizationPolicySignature,
        normalizationPolicy: result.effectivePolicy, sourceSignature: sourceSignature(input),
        purchaseOrderReview: clone(input.purchaseOrderReview || null), builtAt: input.buildTimestamp || "" }
    };
  }
  root.data.purchaseOrdersBuilder = Object.freeze({
    version: VERSION, PURCHASE_ORDERS_FIELD_DEFINITIONS: definitions, PURCHASE_ORDERS_MAPPING_POLICY: policy,
    mappingOptions: options, signature, sourceSignature, inspect, validatePurchaseOrdersPackage, buildPurchaseOrdersPackage
  });
})(window);
