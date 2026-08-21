(function registerExcessScenarioEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.excess = root.excess || {};

  const ENGINE_VERSION = "1";

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function hasAnyValue(row = {}, keys = []) {
    return keys.some(key => String(row[key] ?? "").trim() !== "");
  }

  function observedInputs(row = {}, keys = []) {
    return Object.fromEntries(keys
      .filter(key => String(row[key] ?? "").trim() !== "")
      .map(key => [key, row[key]]));
  }

  function scenario(id, labelKey, availability, impactValue = 0, noteKey = "", detail = {}) {
    const available = availability === "available";
    const calculatedAt = detail.calculatedAt || new Date().toISOString();
    return {
      scenario_id: id,
      scenarioType: id,
      label_key: labelKey,
      availability,
      available,
      estimated_impact_value: available ? Math.max(0, impactValue) : 0,
      calculatedOutputs: {
        estimated_impact_value: available ? Math.max(0, impactValue) : 0,
        ...(detail.calculatedOutputs || {})
      },
      observedInputs: detail.observedInputs || {},
      userAssumptions: detail.userAssumptions || [],
      missingEvidence: detail.missingEvidence || [],
      requiredPackages: detail.requiredPackages || [],
      limitations: detail.limitations || [],
      note_key: noteKey,
      nonPredictiveLabelKey: "scenarioNonPredictive",
      model_version: ENGINE_VERSION,
      modelVersion: ENGINE_VERSION,
      calculatedAt
    };
  }

  function buildScenarioSet(excessCase = {}) {
    const row = excessCase.source_row || {};
    const net = number(excessCase.net_addressable_excess_value);
    const gross = number(excessCase.gross_excess_value);
    const reductionAvailable = net > 0 ? "available" : "unavailable";
    const poValueKeys = ["open_po_value", "open_purchase_order_value", "open_po_qty", "open_purchase_order_quantity"];
    const poDetailKeys = ["open_purchase_order_number", "purchase_order_number", "po_number", "purchase_order_item", "po_item", "supplier"];
    const demandKeys = ["historical_consumption", "last_consumption_date", "consumption_quantity_12m", "consumption_12m", "future_demand", "forecast", "demand_forecast"];
    const safetyTargetKeys = ["safety_stock", "safety_stock_target"];
    const moqKeys = ["minimum_order_quantity", "moq"];
    const hasPoSignal = hasAnyValue(row, poValueKeys);
    const hasPoDetails = hasPoSignal && hasAnyValue(row, poDetailKeys);
    const hasDemandSignal = hasAnyValue(row, demandKeys);
    const hasSafetyTarget = hasAnyValue(row, safetyTargetKeys);
    const hasMoq = hasAnyValue(row, moqKeys);
    const calculatedAt = new Date().toISOString();

    return [
      scenario("excess_reduction_percent", "scenarioReducePercent", reductionAvailable, net * 0.25, "scenarioReducePercentNote", {
        calculatedAt,
        observedInputs: { net_addressable_excess_value: net },
        userAssumptions: ["assumption_reduce_25_percent"],
        calculatedOutputs: {
          baseline_value: net,
          user_reduction_percent: 25,
          addressed_value: Math.max(0, net * 0.25),
          remaining_value: Math.max(0, net - net * 0.25)
        }
      }),
      scenario("excess_reduction_absolute", "scenarioReduceAbsolute", reductionAvailable, Math.min(net, 50000), "scenarioReduceAbsoluteNote", {
        calculatedAt,
        observedInputs: { net_addressable_excess_value: net },
        userAssumptions: ["assumption_reduce_50000_or_cap"],
        calculatedOutputs: {
          baseline_value: net,
          user_reduction_value: Math.min(net, 50000),
          addressed_value: Math.min(net, 50000),
          remaining_value: Math.max(0, net - Math.min(net, 50000))
        }
      }),
      scenario("safety_stock_adjustment", "scenarioSafetyStock", hasSafetyTarget && net > 0 ? "available" : hasMoq && net > 0 ? "limited" : "unavailable", Math.min(net, gross * 0.15), hasSafetyTarget ? "scenarioSafetyStockNote" : "scenarioSafetyStockUnavailable", {
        calculatedAt,
        observedInputs: observedInputs(row, [...safetyTargetKeys, ...moqKeys]),
        userAssumptions: hasSafetyTarget ? ["assumption_safety_stock_classification"] : [],
        missingEvidence: hasSafetyTarget ? [] : ["safety_stock"],
        requiredPackages: hasSafetyTarget ? [] : ["planning_parameters"],
        limitations: ["classification_context_not_physical_reduction"]
      }),
      scenario("purchase_order_review", "scenarioPurchaseOrder", hasPoDetails && net > 0 ? "available" : "unavailable", Math.min(net, number(row.open_po_value || row.open_purchase_order_value || net * 0.2)), hasPoDetails ? "scenarioPurchaseOrderNote" : "scenarioPurchaseOrderUnavailable", {
        calculatedAt,
        observedInputs: observedInputs(row, [...poValueKeys, ...poDetailKeys]),
        missingEvidence: hasPoDetails ? [] : ["purchase_order_details"],
        requiredPackages: hasPoDetails ? [] : ["purchase_orders"]
      }),
      scenario("demand_validation", "scenarioDemandValidation", hasDemandSignal && net > 0 ? "available" : "unavailable", Math.min(net, gross * 0.1), hasDemandSignal ? "scenarioDemandValidationNote" : "scenarioDemandValidationUnavailable", {
        calculatedAt,
        observedInputs: observedInputs(row, demandKeys),
        missingEvidence: hasDemandSignal ? [] : ["consumption_history", "demand_forecast"],
        requiredPackages: hasDemandSignal ? [] : ["consumption_history", "demand_forecast"],
        limitations: hasDemandSignal ? [] : ["risk_flags_are_not_forecast"]
      })
    ];
  }

  root.excess.excessScenarioEngine = Object.freeze({
    version: ENGINE_VERSION,
    buildScenarioSet
  });
})(window);
