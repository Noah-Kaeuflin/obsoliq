(function registerExcessScenarioEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.excess = root.excess || {};

  const ENGINE_VERSION = "1";
  const numericEvidence = root.core?.valueUtils?.numericEvidence;

  if (typeof numericEvidence !== "function") {
    throw new Error("Excess Scenario Engine requires ObsoliQ.core.valueUtils.numericEvidence.");
  }

  function number(value, key = "scenario_value") {
    const evidence = numericEvidence(value, {
      fieldKey: key,
      fieldDefinition: { type: "currency", fieldKey: key }
    });
    return evidence.status === "valid" ? evidence.normalizedValue : null;
  }

  function finiteCalculation(value) {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : null;
  }

  function firstPresentNumber(row = {}, keys = []) {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
      return number(row[key], key);
    }
    return null;
  }

  function hasAnyValue(row = {}, keys = []) {
    return keys.some(key => String(row[key] ?? "").trim() !== "");
  }

  function observedInputs(row = {}, keys = []) {
    return Object.fromEntries(keys
      .filter(key => String(row[key] ?? "").trim() !== "")
      .map(key => [key, row[key]]));
  }

  function scenario(id, labelKey, availability, impactValue = null, noteKey = "", detail = {}) {
    const available = availability === "available";
    const calculatedAt = detail.calculatedAt || new Date().toISOString();
    const normalizedImpact = available && typeof impactValue === "number" && Number.isFinite(impactValue)
      ? Math.max(0, impactValue)
      : null;
    return {
      scenario_id: id,
      scenarioType: id,
      label_key: labelKey,
      availability,
      available,
      estimated_impact_value: normalizedImpact,
      calculatedOutputs: {
        estimated_impact_value: normalizedImpact,
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
    const net = number(excessCase.net_addressable_excess_value, "net_addressable_excess_value");
    const gross = number(excessCase.gross_excess_value, "gross_excess_value");
    const hasNet = net !== null && net > 0;
    const hasGrossAndNet = hasNet && gross !== null;
    const reductionAvailable = hasNet ? "available" : "unavailable";
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
    const reductionPercentValue = hasNet ? finiteCalculation(net * 0.25) : null;
    const reductionAbsoluteValue = hasNet ? finiteCalculation(Math.min(net, 50000)) : null;
    const safetyStockValue = hasGrossAndNet ? finiteCalculation(Math.min(net, gross * 0.15)) : null;
    const explicitPoValue = firstPresentNumber(row, ["open_po_value", "open_purchase_order_value"]);
    const poBaselineValue = explicitPoValue !== null
      ? explicitPoValue
      : hasNet
        ? finiteCalculation(net * 0.2)
        : null;
    const purchaseOrderValue = hasNet && poBaselineValue !== null
      ? finiteCalculation(Math.min(net, poBaselineValue))
      : null;
    const demandValidationValue = hasGrossAndNet
      ? finiteCalculation(Math.min(net, gross * 0.1))
      : null;

    return [
      scenario("excess_reduction_percent", "scenarioReducePercent", reductionAvailable, reductionPercentValue, "scenarioReducePercentNote", {
        calculatedAt,
        observedInputs: { net_addressable_excess_value: net },
        userAssumptions: ["assumption_reduce_25_percent"],
        calculatedOutputs: {
          baseline_value: net,
          user_reduction_percent: 25,
          addressed_value: reductionPercentValue,
          remaining_value: hasNet ? finiteCalculation(net - reductionPercentValue) : null
        }
      }),
      scenario("excess_reduction_absolute", "scenarioReduceAbsolute", reductionAvailable, reductionAbsoluteValue, "scenarioReduceAbsoluteNote", {
        calculatedAt,
        observedInputs: { net_addressable_excess_value: net },
        userAssumptions: ["assumption_reduce_50000_or_cap"],
        calculatedOutputs: {
          baseline_value: net,
          user_reduction_value: reductionAbsoluteValue,
          addressed_value: reductionAbsoluteValue,
          remaining_value: hasNet ? finiteCalculation(net - reductionAbsoluteValue) : null
        }
      }),
      scenario("safety_stock_adjustment", "scenarioSafetyStock", hasSafetyTarget && hasGrossAndNet ? "available" : hasMoq && hasGrossAndNet ? "limited" : "unavailable", safetyStockValue, hasSafetyTarget ? "scenarioSafetyStockNote" : "scenarioSafetyStockUnavailable", {
        calculatedAt,
        observedInputs: observedInputs(row, [...safetyTargetKeys, ...moqKeys]),
        userAssumptions: hasSafetyTarget ? ["assumption_safety_stock_classification"] : [],
        missingEvidence: hasSafetyTarget ? [] : ["safety_stock"],
        requiredPackages: hasSafetyTarget ? [] : ["planning_parameters"],
        limitations: ["classification_context_not_physical_reduction"]
      }),
      scenario("purchase_order_review", "scenarioPurchaseOrder", hasPoDetails && hasNet && purchaseOrderValue !== null ? "available" : "unavailable", purchaseOrderValue, hasPoDetails ? "scenarioPurchaseOrderNote" : "scenarioPurchaseOrderUnavailable", {
        calculatedAt,
        observedInputs: observedInputs(row, [...poValueKeys, ...poDetailKeys]),
        missingEvidence: hasPoDetails ? [] : ["purchase_order_details"],
        requiredPackages: hasPoDetails ? [] : ["purchase_orders"]
      }),
      scenario("demand_validation", "scenarioDemandValidation", hasDemandSignal && hasGrossAndNet ? "available" : "unavailable", demandValidationValue, hasDemandSignal ? "scenarioDemandValidationNote" : "scenarioDemandValidationUnavailable", {
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
