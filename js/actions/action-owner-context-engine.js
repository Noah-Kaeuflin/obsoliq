(function registerActionOwnerContextEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.actions = root.actions || {};

  const ENGINE_VERSION = "1";
  const OWNER_FIELD_PRECEDENCE = Object.freeze({
    "Material Planning": ["mrp_controller", "planner", "production_scheduler", "responsible_l1", "accountable_l1"],
    "Supply Chain Planning": ["mrp_controller", "planner", "production_scheduler", "responsible_l1", "accountable_l1"],
    Procurement: ["purchasing_group", "purchase_organization", "responsible_l1", "accountable_l1"],
    "Quality Management": ["responsible_l1", "accountable_l1", "responsible_function"],
    "Supply Chain + Finance": ["responsible_l1", "accountable_l1", "responsible_function"],
    "Supply Chain": ["responsible_l1", "accountable_l1", "responsible_function", "mrp_controller", "planner"],
    default: ["responsible_l1", "accountable_l1", "responsible_function", "mrp_controller", "planner", "purchase_organization"]
  });

  function hasValue(value) {
    return String(value ?? "").trim() !== "";
  }

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function provenanceFieldSource(provenance = {}, fieldKey) {
    if (provenance?.fields?.[fieldKey]) return "material_master";
    if (provenance?.confirmedFields?.[fieldKey]) return "material_master";
    return "";
  }

  function fieldConfidenceFromProvenance(provenance = {}, source = "") {
    const matchType = String(provenance?.matchType || "");
    if (source === "inventory") return "High";
    if (!source) return "Low";
    if (matchType === "exact_material_plant") return "High";
    if (matchType === "material_level_exact" || matchType === "material_unique_fallback") return "Medium";
    return "Medium";
  }

  function ownerReferenceFor(row = {}, ownerFunction = "", provenance = {}) {
    const fields = OWNER_FIELD_PRECEDENCE[ownerFunction] || OWNER_FIELD_PRECEDENCE.default;
    for (const fieldKey of fields) {
      if (!hasValue(row[fieldKey])) continue;
      const source = provenanceFieldSource(provenance, fieldKey) || "inventory";
      return {
        ownerReference: String(row[fieldKey]).trim(),
        ownerReferenceField: fieldKey,
        ownerSource: source,
        ownerAssignmentConfidence: fieldConfidenceFromProvenance(provenance, source)
      };
    }
    return {
      ownerReference: "",
      ownerReferenceField: "",
      ownerSource: "none",
      ownerAssignmentConfidence: "Low"
    };
  }

  function buildActionOwnerContext(input = {}) {
    const row = input.row || {};
    const ownerFunction = input.ownerFunction || row.owner_function || "";
    const provenance = input.enrichmentProvenance || row.__obsoliq_enrichment || {};
    const context = ownerReferenceFor(row, ownerFunction, provenance);
    return {
      owner_reference: context.ownerReference,
      owner_reference_field: context.ownerReferenceField,
      owner_source: context.ownerSource,
      owner_assignment_confidence: context.ownerAssignmentConfidence,
      owner_context_metadata: {
        engineVersion: ENGINE_VERSION,
        ownerFunction,
        fieldPrecedence: [...(OWNER_FIELD_PRECEDENCE[ownerFunction] || OWNER_FIELD_PRECEDENCE.default)],
        materialMasterPackageId: provenance?.materialMasterPackageId || "",
        materialMasterPackageRevision: provenance?.materialMasterPackageRevision || "",
        materialMasterDatasetId: provenance?.materialMasterDatasetId || "",
        matchType: provenance?.matchType || ""
      }
    };
  }

  root.actions.actionOwnerContextEngine = Object.freeze({
    version: ENGINE_VERSION,
    ownerFieldPrecedence: cloneData(OWNER_FIELD_PRECEDENCE),
    buildActionOwnerContext
  });
})(window);
