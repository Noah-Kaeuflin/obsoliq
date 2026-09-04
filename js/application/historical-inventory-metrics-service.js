(function registerHistoricalInventoryMetricsService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const HISTORICAL_METRIC_MODEL_VERSION = "historical-inventory-metrics-v2";

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function packageRevision(packageRecord = {}) {
    return Number(packageRecord.revision || packageRecord.packageRevision || 0) || 0;
  }

  function packageRows(packageRecord = {}, fallbackRows = []) {
    if (Array.isArray(fallbackRows) && fallbackRows.length) return cloneData(fallbackRows);
    if (Array.isArray(packageRecord?.buildData?.packageRows)) return cloneData(packageRecord.buildData.packageRows);
    if (Array.isArray(packageRecord?.buildData?.analyticalRows)) return cloneData(packageRecord.buildData.analyticalRows);
    return [];
  }

  function historyReadiness(packageRecord = {}) {
    return packageRecord?.buildData?.buildMetadata?.historyReadiness
      || packageRecord?.interpretationMetadata?.historyReadiness
      || packageRecord?.packageValidation?.historyReadiness
      || null;
  }

  function historyTrustState(packageRecord = {}) {
    return packageRecord?.interpretationMetadata?.trustState
      || packageRecord?.buildData?.interpretationMetadata?.trustState
      || packageRecord?.buildData?.buildMetadata?.interpretationTrust?.trustState
      || "trusted";
  }

  function semanticPolicySignature(packageRecord = {}) {
    return packageRecord?.buildData?.buildMetadata?.semanticPolicySignature
      || packageRecord?.interpretationMetadata?.semanticPolicySignature
      || "";
  }

  function analysisAsOfForHistory(packageRecord = {}, fallback = null) {
    return fallback
      || packageRecord?.freshness?.analysisAsOf
      || packageRecord?.buildData?.freshness?.analysisAsOf
      || historyReadiness(packageRecord)?.analysisAsOf
      || null;
  }

  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  }

  function unavailableRuntime(reason, input = {}, versions = {}) {
    const signature = historicalMetricInputSignature({
      inventoryPackage: input.inventoryPackage || null,
      historyPackage: input.historyPackage || null,
      analysisAsOf: input.analysisAsOf || null,
      semanticPolicySignature: input.semanticPolicySignature || ""
    }, versions);
    return {
      status: "unavailable",
      reason,
      historicalMetricModelVersion: HISTORICAL_METRIC_MODEL_VERSION,
      historicalMetricsInputSignature: signature,
      inventoryHistoryRelationshipResult: null,
      historicalMetricsByInventoryEntityKey: {},
      historicalMetricEntityKeyByInventoryRowKey: {},
      historicalMetricsByInventoryRowKey: {},
      historicalMetricProvenanceByInventoryEntityKey: {},
      historicalMetricProvenanceByInventoryRowKey: {},
      historicalMetricsSummary: {
        status: "unavailable",
        reason,
        metricsAvailableCount: 0,
        metricsLimitedCount: 0,
        metricsUnavailableCount: 0
      },
      historicalMetricsRuntimeStatus: "unavailable",
      diagnostics: [{ key: reason, severity: "info" }]
    };
  }

  function historicalMetricInputSignature(input = {}, versions = {}) {
    const inventoryPackage = input.inventoryPackage || {};
    const historyPackage = input.historyPackage || {};
    const analysisAsOf = input.analysisAsOf || {};
    return `historical-inventory-metrics:${HISTORICAL_METRIC_MODEL_VERSION}:${stableJson({
      inventoryPackageId: inventoryPackage.packageId || "",
      inventoryPackageRevision: packageRevision(inventoryPackage),
      historyPackageId: historyPackage.packageId || "",
      historyPackageRevision: packageRevision(historyPackage),
      semanticPolicySignature: input.semanticPolicySignature || semanticPolicySignature(historyPackage),
      relationshipModelVersion: versions.relationshipModelVersion || "",
      aggregationModelVersion: versions.aggregationModelVersion || "",
      historicalMetricModelVersion: HISTORICAL_METRIC_MODEL_VERSION,
      windowModelVersion: versions.windowModelVersion || "",
      analysisAsOfDate: analysisAsOf.date || "",
      analysisAsOfSource: analysisAsOf.source || "",
      analysisAsOfSourcePackageId: analysisAsOf.sourcePackageId || "",
      analysisAsOfSourcePackageRevision: analysisAsOf.sourcePackageRevision || null
    })}`;
  }

  function validateInputs(input = {}) {
    const inventoryPackage = input.inventoryPackage || null;
    const historyPackage = input.historyPackage || null;
    const analysisAsOf = analysisAsOfForHistory(historyPackage || {}, input.analysisAsOf || null);
    if (!inventoryPackage || inventoryPackage.packageType !== "inventory_snapshot") return { ok: false, reason: "inventory_package_missing", analysisAsOf };
    if (!historyPackage || historyPackage.packageType !== "consumption_history") return { ok: false, reason: "history_package_missing", analysisAsOf };
    if (historyPackage.status === "invalid" || historyPackage.packageValidation?.statusKey === "invalid") return { ok: false, reason: "history_package_invalid", analysisAsOf };
    if (historyTrustState(historyPackage) !== "trusted") return { ok: false, reason: "history_interpretation_not_trusted", analysisAsOf };
    const readiness = historyReadiness(historyPackage);
    if (!readiness || readiness.status === "not_ready" || readiness.status === "review_required") return { ok: false, reason: "history_not_ready", analysisAsOf };
    if (!validDate(analysisAsOf?.date)) return { ok: false, reason: "missing_as_of", analysisAsOf };
    if (analysisAsOf.source === "inventory_snapshot") {
      if (analysisAsOf.sourcePackageId !== inventoryPackage.packageId || Number(analysisAsOf.sourcePackageRevision) !== packageRevision(inventoryPackage)) {
        return { ok: false, reason: "analysis_as_of_inventory_provenance_mismatch", analysisAsOf };
      }
    }
    return { ok: true, analysisAsOf, readiness };
  }

  function createHistoricalInventoryMetricsService(dependencies = {}) {
    const relationshipEngine = dependencies.relationshipEngine;
    const aggregationEngine = dependencies.aggregationEngine;
    if (!relationshipEngine) throw new Error("Historical Inventory Metrics Service requires the relationship engine.");
    if (!aggregationEngine) throw new Error("Historical Inventory Metrics Service requires the aggregation engine.");

    function buildHistoricalMetricRuntime(input = {}) {
      const inventoryPackage = input.inventoryPackage || null;
      const historyPackage = input.historyPackage || null;
      const semanticSignature = input.semanticPolicySignature || semanticPolicySignature(historyPackage || {});
      const validation = validateInputs(input);
      const signature = historicalMetricInputSignature({
        inventoryPackage,
        historyPackage,
        analysisAsOf: validation.analysisAsOf,
        semanticPolicySignature: semanticSignature
      }, {
        relationshipModelVersion: relationshipEngine.RELATIONSHIP_MODEL_VERSION,
        aggregationModelVersion: aggregationEngine.AGGREGATION_MODEL_VERSION,
        windowModelVersion: aggregationEngine.WINDOW_MODEL_VERSION
      });
      if (!validation.ok) {
        return {
          ...unavailableRuntime(validation.reason, { inventoryPackage, historyPackage, analysisAsOf: validation.analysisAsOf, semanticPolicySignature: semanticSignature }, {
            relationshipModelVersion: relationshipEngine.RELATIONSHIP_MODEL_VERSION,
            aggregationModelVersion: aggregationEngine.AGGREGATION_MODEL_VERSION,
            windowModelVersion: aggregationEngine.WINDOW_MODEL_VERSION
          }),
          historicalMetricsInputSignature: signature
        };
      }
      const evaluatedAt = input.evaluatedAt || new Date().toISOString();
      const inventoryRows = packageRows(inventoryPackage, input.inventoryRows);
      const historyRows = packageRows(historyPackage, input.historyRows);
      const relationshipResult = relationshipEngine.buildInventoryHistoryRelationship({
        inventoryPackage,
        historyPackage,
        inventoryRows,
        historyRows,
        evaluatedAt
      });
      if (relationshipResult.status !== "executed") {
        return {
          ...unavailableRuntime(relationshipResult.reason || "relationship_input_not_ready", { inventoryPackage, historyPackage, analysisAsOf: validation.analysisAsOf, semanticPolicySignature: semanticSignature }, {
            relationshipModelVersion: relationshipEngine.RELATIONSHIP_MODEL_VERSION,
            aggregationModelVersion: aggregationEngine.AGGREGATION_MODEL_VERSION,
            windowModelVersion: aggregationEngine.WINDOW_MODEL_VERSION
          }),
          historicalMetricsInputSignature: signature
        };
      }
      const aggregateResult = aggregationEngine.buildHistoricalAggregates({
        relationshipResult,
        historyRows,
        analysisAsOf: validation.analysisAsOf,
        historyReadiness: validation.readiness,
        inventoryPackageId: inventoryPackage.packageId,
        inventoryPackageRevision: packageRevision(inventoryPackage),
        historyPackageId: historyPackage.packageId,
        historyPackageRevision: packageRevision(historyPackage),
        semanticPolicySignature: semanticSignature,
        historicalMetricModelVersion: HISTORICAL_METRIC_MODEL_VERSION,
        evaluatedAt
      });
      const metricsByInventoryEntityKey = aggregateResult.metricsByInventoryEntityKey || {};
      const rowEntityIndex = {};
      const rowMetrics = {};
      const rowProvenance = {};
      Object.values(relationshipResult.inventoryEntitiesByKey || {}).forEach(entity => {
        (entity.rowKeys || []).forEach(rowKey => {
          rowEntityIndex[rowKey] = entity.inventoryEntityKey;
          if (metricsByInventoryEntityKey[entity.inventoryEntityKey]) {
            rowMetrics[rowKey] = metricsByInventoryEntityKey[entity.inventoryEntityKey];
            rowProvenance[rowKey] = aggregateResult.provenanceByInventoryEntityKey?.[entity.inventoryEntityKey] || {};
          }
        });
      });
      const summary = {
        status: aggregateResult.status === "executed"
          ? (aggregateResult.summary.metricsUnavailableCount ? "limited" : "available")
          : "unavailable",
        relationshipMatchRate: relationshipResult.relationshipMatchRate,
        matchedInventoryEntityCount: relationshipResult.matchedInventoryEntityCount,
        exactMatchCount: relationshipResult.exactMatchCount,
        fallbackMatchCount: relationshipResult.fallbackMatchCount,
        unmatchedInventoryCount: relationshipResult.unmatchedInventoryCount,
        ambiguousCount: relationshipResult.ambiguousCount,
        invalidKeyCount: relationshipResult.invalidKeyCount,
        ...aggregateResult.summary,
        inventoryPackageRevision: packageRevision(inventoryPackage),
        historyPackageRevision: packageRevision(historyPackage),
        analysisAsOfDate: validation.analysisAsOf.date,
        relationshipModelVersion: relationshipEngine.RELATIONSHIP_MODEL_VERSION,
        historicalMetricModelVersion: HISTORICAL_METRIC_MODEL_VERSION
      };
      return {
        status: summary.status,
        reason: "",
        historicalMetricModelVersion: HISTORICAL_METRIC_MODEL_VERSION,
        historicalMetricsInputSignature: signature,
        inventoryHistoryRelationshipResult: relationshipResult,
        historicalMetricsByInventoryEntityKey: metricsByInventoryEntityKey,
        historicalMetricEntityKeyByInventoryRowKey: rowEntityIndex,
        historicalMetricsByInventoryRowKey: rowMetrics,
        historicalMetricProvenanceByInventoryEntityKey: aggregateResult.provenanceByInventoryEntityKey || {},
        historicalMetricProvenanceByInventoryRowKey: rowProvenance,
        historicalMetricsSummary: summary,
        historicalMetricsRuntimeStatus: summary.status,
        diagnostics: [],
        evaluatedAt
      };
    }

    return Object.freeze({
      version: "1",
      HISTORICAL_METRIC_MODEL_VERSION,
      historicalMetricInputSignature,
      validateInputs,
      buildHistoricalMetricRuntime
    });
  }

  root.application.historicalInventoryMetricsService = Object.freeze({
    version: "1",
    HISTORICAL_METRIC_MODEL_VERSION,
    createHistoricalInventoryMetricsService,
    historicalMetricInputSignature
  });
})(window);
