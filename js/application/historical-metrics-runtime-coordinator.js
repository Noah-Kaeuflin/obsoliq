(function registerHistoricalMetricsRuntimeCoordinator(global) {
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

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function defaultClock() {
    return new Date().toISOString();
  }

  function defaultScheduler(task) {
    return setTimeout(task, 0);
  }

  function normalizeStatus(status) {
    return RUNTIME_STATUSES.includes(status) ? status : "not_calculated";
  }

  function normalizeLimitationCodes(codes = []) {
    return [...new Set((codes || []).map(code => String(code || "").trim()).filter(Boolean))];
  }

  function createInitialState() {
    return {
      status: "not_calculated",
      inputSignature: "",
      requestedInputSignature: "",
      completedInputSignature: "",
      result: null,
      relationshipResult: null,
      summary: null,
      reasonCode: "not_evaluated",
      reason: "not_evaluated",
      limitationCodes: [],
      errorCode: "",
      errorMessage: "",
      generation: 0,
      requestedAt: "",
      startedAt: "",
      completedAt: "",
      durationMs: null,
      buildRequestCount: 0,
      actualBuildCount: 0,
      duplicateRequestCount: 0,
      staleCompletionCount: 0,
      lastReason: ""
    };
  }

  function resultStatus(result = null) {
    const status = result?.status || result?.historicalMetricsRuntimeStatus || result?.historicalMetricsSummary?.status || "";
    if (status === "available") return "available";
    if (status === "limited") return "limited";
    if (status === "unavailable") return "unavailable";
    return "available";
  }

  function resultReason(result = null) {
    return result?.reason
      || result?.historicalMetricsSummary?.reason
      || result?.diagnostics?.find?.(item => item?.key)?.key
      || "";
  }

  function resultLimitations(result = null) {
    const summary = result?.historicalMetricsSummary || {};
    const codes = [
      ...(summary.limitationCodes || []),
      ...(result?.diagnostics || []).map(item => item?.key)
    ];
    return normalizeLimitationCodes(codes);
  }

  function createHistoricalMetricsRuntimeCoordinator({
    buildRuntime,
    scheduleTask = defaultScheduler,
    clock = defaultClock,
    onStateChange = null
  } = {}) {
    if (typeof buildRuntime !== "function") {
      throw new Error("Historical Metrics Runtime Coordinator requires a buildRuntime function.");
    }

    let state = createInitialState();
    let activeBuildPromise = null;
    const listeners = new Set();

    function snapshot() {
      return cloneData(state);
    }

    function notify() {
      const cloned = snapshot();
      if (typeof onStateChange === "function") onStateChange(cloned);
      listeners.forEach(listener => listener(cloned));
    }

    function commit(patch = {}) {
      state = {
        ...state,
        ...patch,
        status: normalizeStatus(patch.status || state.status),
        limitationCodes: normalizeLimitationCodes(patch.limitationCodes || state.limitationCodes || [])
      };
      if (patch.reasonCode && !patch.reason) state.reason = patch.reasonCode;
      notify();
      return snapshot();
    }

    function invalidate({ reason = "input_changed", nextInputSignature = "" } = {}) {
      const nextGeneration = state.generation + 1;
      activeBuildPromise = null;
      return commit({
        status: "not_calculated",
        inputSignature: nextInputSignature || "",
        requestedInputSignature: nextInputSignature || "",
        completedInputSignature: "",
        result: null,
        relationshipResult: null,
        summary: null,
        reasonCode: reason,
        reason,
        limitationCodes: [],
        errorCode: "",
        errorMessage: "",
        generation: nextGeneration,
        requestedAt: "",
        startedAt: "",
        completedAt: "",
        durationMs: null,
        lastReason: reason
      });
    }

    function setUnavailable({ inputSignature = "", reasonCode = "unavailable", limitationCodes = [], reason = "input_unavailable" } = {}) {
      if (state.status === "unavailable" && state.inputSignature === inputSignature && state.reasonCode === reasonCode) {
        state = { ...state, duplicateRequestCount: state.duplicateRequestCount + 1 };
        return snapshot();
      }
      activeBuildPromise = null;
      const now = clock();
      return commit({
        status: "unavailable",
        inputSignature,
        requestedInputSignature: inputSignature,
        completedInputSignature: inputSignature,
        result: null,
        relationshipResult: null,
        summary: { status: "unavailable", reason: reasonCode },
        reasonCode,
        reason: reasonCode,
        limitationCodes,
        errorCode: "",
        errorMessage: "",
        generation: state.generation + 1,
        requestedAt: now,
        startedAt: "",
        completedAt: now,
        durationMs: 0,
        lastReason: reason
      });
    }

    function shouldDeduplicate(inputSignature, force) {
      if (force) return false;
      if (state.inputSignature !== inputSignature && state.requestedInputSignature !== inputSignature) return false;
      if (["available", "limited", "unavailable"].includes(state.status) && state.completedInputSignature === inputSignature) return true;
      if (state.status === "calculating" && state.requestedInputSignature === inputSignature) return true;
      if (state.status === "error" && state.requestedInputSignature === inputSignature) return true;
      return false;
    }

    function requestBuild({ inputSignature = "", buildInput = {}, reason = "input_changed", force = false } = {}) {
      if (!inputSignature) {
        return setUnavailable({ inputSignature: "", reasonCode: "input_signature_missing", reason });
      }
      state = { ...state, buildRequestCount: state.buildRequestCount + 1 };
      if (shouldDeduplicate(inputSignature, force)) {
        state = { ...state, duplicateRequestCount: state.duplicateRequestCount + 1 };
        return snapshot();
      }
      const changedSignature = state.inputSignature && state.inputSignature !== inputSignature;
      const nextGeneration = state.generation + 1;
      const requestedAt = clock();
      commit({
        status: "calculating",
        inputSignature,
        requestedInputSignature: inputSignature,
        completedInputSignature: "",
        result: null,
        relationshipResult: null,
        summary: null,
        reasonCode: changedSignature ? "input_changed" : reason,
        reason: changedSignature ? "input_changed" : reason,
        limitationCodes: [],
        errorCode: "",
        errorMessage: "",
        generation: nextGeneration,
        requestedAt,
        startedAt: "",
        completedAt: "",
        durationMs: null,
        lastReason: reason
      });

      activeBuildPromise = new Promise(resolve => {
        scheduleTask(() => {
          const activeAtStart = state.generation === nextGeneration && state.requestedInputSignature === inputSignature;
          if (!activeAtStart) {
            state = { ...state, staleCompletionCount: state.staleCompletionCount + 1 };
            resolve(snapshot());
            return;
          }
          const startedAt = clock();
          const startedMs = Date.now();
          commit({
            status: "calculating",
            startedAt,
            actualBuildCount: state.actualBuildCount + 1
          });
          try {
            const result = buildRuntime({ ...cloneData(buildInput), inputSignature });
            const activeAtCommit = state.generation === nextGeneration && state.requestedInputSignature === inputSignature;
            if (!activeAtCommit) {
              state = { ...state, staleCompletionCount: state.staleCompletionCount + 1 };
              resolve(snapshot());
              return;
            }
            const completedAt = clock();
            const finalResult = cloneData(result || {});
            finalResult.historicalMetricsInputSignature = inputSignature;
            const status = resultStatus(finalResult);
            const reasonCode = resultReason(finalResult);
            resolve(commit({
              status,
              inputSignature,
              requestedInputSignature: inputSignature,
              completedInputSignature: inputSignature,
              result: finalResult,
              relationshipResult: finalResult.inventoryHistoryRelationshipResult || null,
              summary: finalResult.historicalMetricsSummary || null,
              reasonCode,
              reason: reasonCode,
              limitationCodes: resultLimitations(finalResult),
              errorCode: "",
              errorMessage: "",
              completedAt,
              durationMs: Math.max(0, Date.now() - startedMs)
            }));
          } catch (error) {
            const activeAtError = state.generation === nextGeneration && state.requestedInputSignature === inputSignature;
            if (!activeAtError) {
              state = { ...state, staleCompletionCount: state.staleCompletionCount + 1 };
              resolve(snapshot());
              return;
            }
            const completedAt = clock();
            resolve(commit({
              status: "error",
              inputSignature,
              requestedInputSignature: inputSignature,
              completedInputSignature: "",
              result: null,
              relationshipResult: null,
              summary: null,
              reasonCode: "runtime_build_failed",
              reason: "runtime_build_failed",
              limitationCodes: [],
              errorCode: error?.code || "runtime_build_failed",
              errorMessage: error?.message || String(error),
              completedAt,
              durationMs: Math.max(0, Date.now() - startedMs)
            }));
          }
        });
      });
      return snapshot();
    }

    function retry(input = {}) {
      return requestBuild({ ...input, force: true, reason: input.reason || "retry" });
    }

    function restore(snapshotState = null) {
      const nextState = snapshotState && typeof snapshotState === "object" ? cloneData(snapshotState) : createInitialState();
      state = {
        ...createInitialState(),
        ...nextState,
        status: normalizeStatus(nextState?.status),
        generation: Number(nextState?.generation || 0) + 1,
        limitationCodes: normalizeLimitationCodes(nextState?.limitationCodes || [])
      };
      activeBuildPromise = null;
      notify();
      return snapshot();
    }

    function dispose() {
      listeners.clear();
      activeBuildPromise = null;
      state = createInitialState();
    }

    function subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function whenIdle() {
      return activeBuildPromise || Promise.resolve(snapshot());
    }

    return Object.freeze({
      version: "1",
      RUNTIME_STATUSES,
      requestBuild,
      invalidate,
      setUnavailable,
      retry,
      getState: snapshot,
      snapshot,
      restore,
      dispose,
      subscribe,
      whenIdle
    });
  }

  root.application.historicalMetricsRuntimeCoordinator = Object.freeze({
    version: "1",
    RUNTIME_STATUSES,
    createHistoricalMetricsRuntimeCoordinator
  });
})(window);
