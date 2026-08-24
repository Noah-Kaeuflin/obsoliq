(function registerSlowDeadRuntimeState(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const RUNTIME_STATUSES = Object.freeze([
    "not_calculated",
    "calculating",
    "available",
    "limited",
    "unavailable",
    "error"
  ]);

  function normalizeStatus(status) {
    return RUNTIME_STATUSES.includes(status) ? status : "not_calculated";
  }

  function normalizeCodes(codes = []) {
    return [...new Set((codes || []).map(code => String(code || "").trim()).filter(Boolean))];
  }

  function createState(patch = {}) {
    const status = normalizeStatus(patch.status || "not_calculated");
    const hasCurrentResult = ["available", "limited"].includes(status);
    const result = hasCurrentResult ? (patch.result || null) : null;
    const reasonCode = patch.reasonCode || patch.reason || (status === "not_calculated" ? "not_evaluated" : status);
    return {
      status,
      inputSignature: patch.inputSignature || "",
      requestedInputSignature: patch.requestedInputSignature || "",
      completedInputSignature: hasCurrentResult ? (patch.completedInputSignature || patch.inputSignature || "") : "",
      historicalMetricsInputSignature: patch.historicalMetricsInputSignature || "",
      result,
      summary: hasCurrentResult ? (patch.summary || result?.summary || null) : null,
      reasonCode,
      reason: patch.reason || reasonCode,
      limitationCodes: normalizeCodes(patch.limitationCodes || []),
      errorCode: status === "error" ? (patch.errorCode || reasonCode || "slow_dead_runtime_error") : "",
      errorMessage: status === "error" ? (patch.errorMessage || "") : "",
      errorSource: status === "error" ? (patch.errorSource || "slow_dead_runtime") : "",
      generation: Number(patch.generation || 0),
      buildCount: Number(patch.buildCount || 0),
      requestedAt: patch.requestedAt || "",
      startedAt: patch.startedAt || "",
      completedAt: patch.completedAt || "",
      updatedAt: patch.updatedAt || "",
      durationMs: Object.prototype.hasOwnProperty.call(patch, "durationMs") ? patch.durationMs : null
    };
  }

  function fromHistoricalDependency(runtimeState = null) {
    const status = runtimeState?.status || "not_calculated";
    const inputSignature = runtimeState?.inputSignature || runtimeState?.requestedInputSignature || "";
    const base = {
      inputSignature,
      requestedInputSignature: runtimeState?.requestedInputSignature || inputSignature,
      historicalMetricsInputSignature: runtimeState?.completedInputSignature || "",
      limitationCodes: runtimeState?.limitationCodes || []
    };
    if (status === "calculating") {
      return createState({ ...base, status: "calculating", reasonCode: "waiting_for_historical_metrics", reason: runtimeState?.reason || "waiting_for_historical_metrics", requestedAt: runtimeState?.requestedAt || "", startedAt: runtimeState?.startedAt || "", durationMs: runtimeState?.durationMs ?? null });
    }
    if (status === "unavailable") {
      const reasonCode = runtimeState?.reasonCode || "historical_metrics_unavailable";
      return createState({ ...base, status: "unavailable", reasonCode, reason: runtimeState?.reason || reasonCode, completedAt: runtimeState?.completedAt || "" });
    }
    if (status === "error") {
      return createState({ ...base, status: "error", reasonCode: "historical_metrics_error", reason: runtimeState?.reason || "historical_metrics_error", errorCode: runtimeState?.errorCode || runtimeState?.reasonCode || "historical_metrics_error", errorMessage: runtimeState?.errorMessage || "", errorSource: "historical_runtime", completedAt: runtimeState?.completedAt || "", durationMs: runtimeState?.durationMs ?? null });
    }
    return createState({ ...base, status: "not_calculated", reasonCode: "historical_runtime_not_calculated", reason: runtimeState?.reason || "historical_runtime_not_calculated" });
  }

  root.application.slowDeadRuntimeState = Object.freeze({
    version: "1",
    RUNTIME_STATUSES,
    createState,
    fromHistoricalDependency
  });
})(window);
