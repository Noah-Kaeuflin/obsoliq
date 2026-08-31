(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function canonicalize(value, seen = new WeakSet()) {
    if (value === undefined) return { $type: "undefined" };
    if (typeof value === "number" && !Number.isFinite(value)) return { $type: String(value) };
    if (value === null || typeof value !== "object") return value;
    if (seen.has(value)) throw new Error("TRUST-01 state hash cannot contain circular references.");
    seen.add(value);
    let result;
    if (value instanceof Map) {
      result = {
        $type: "Map",
        entries: [...value.entries()]
          .map(([key, entryValue]) => [canonicalize(key, seen), canonicalize(entryValue, seen)])
          .sort((left, right) => JSON.stringify(left[0]).localeCompare(JSON.stringify(right[0])))
      };
    } else if (value instanceof Set) {
      result = {
        $type: "Set",
        values: [...value].map(entry => canonicalize(entry, seen)).sort((left, right) => (
          JSON.stringify(left).localeCompare(JSON.stringify(right))
        ))
      };
    } else if (Array.isArray(value)) {
      result = value.map(entry => canonicalize(entry, seen));
    } else {
      result = Object.fromEntries(Object.keys(value).sort().map(key => [
        key,
        /(?:At|Timestamp|timestamp|durationMs)$/.test(key)
          ? "volatile_time"
          : canonicalize(value[key], seen)
      ]));
    }
    seen.delete(value);
    return result;
  }

  function fnv1a64(text) {
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= BigInt(text.charCodeAt(index));
      hash = BigInt.asUintN(64, hash * prime);
    }
    return hash.toString(16).padStart(16, "0");
  }

  function authoritativeState(bridge) {
    const portfolio = bridge.getInventoryRiskPortfolioForTest();
    const overviewRows = bridge.getOverviewRows();
    const inventoryRows = bridge.getInventoryRows();
    const actionRows = bridge.getActionRows();
    const dataQualityRows = bridge.getDataQualityRows();
    const runtime = bridge.snapshotDatasetRuntimeState();
    delete runtime.datasetUiState;
    delete runtime.filterControlState;
    if (runtime.historicalMetricsRuntimeState) {
      runtime.historicalMetricsRuntimeState.generation = "rollback_epoch";
    }
    return {
      runtime,
      registry: bridge.getRegistrySnapshot(),
      pilotReviews: bridge.snapshotPilotReviewsForTest(),
      portfolioCaseIds: (portfolio.portfolioCases || []).map(item => item.case_id).sort(),
      overviewRows,
      inventoryRows,
      actionRows,
      dataQualityRows,
      issueLedger: bridge.getIssueLedgerEntries(),
      exportScope: {
        inventoryRowCount: bridge.enrichedRowsForExportForTest(inventoryRows).length,
        actionRowCount: bridge.rowsForExportForTest(actionRows, bridge.actionExportColumnsForTest()).length
      }
    };
  }

  function canonicalState(bridge) {
    return canonicalize(authoritativeState(bridge));
  }

  function stateHash(state) {
    return fnv1a64(JSON.stringify(state));
  }

  function firstDifference(left, right, path = "state") {
    if (Object.is(left, right)) return null;
    if (typeof left !== typeof right || left === null || right === null) return { path, left, right };
    if (typeof left !== "object") return { path, left, right };
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(left, key) || !Object.prototype.hasOwnProperty.call(right, key)) {
        return { path: `${path}.${key}`, left: left[key], right: right[key] };
      }
      const difference = firstDifference(left[key], right[key], `${path}.${key}`);
      if (difference) return difference;
    }
    return null;
  }

  const inventoryCsv = [
    "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
    "MAT-TRUST-TXN,Transactional material,2500,PC-T,Program T,500,200,100,50"
  ].join("\n");

  const materialMasterCsv = [
    "Material Number,Plant,Material Description,Profit Center,MRP Controller",
    "MAT-TRUST-TXN,1000,Transactional master,PC-T,MRP-T"
  ].join("\n");

  const consumptionHistoryCsv = [
    "MATNR,WERKS,BUDAT,Period,Verbrauchsmenge,MEINS,BWART,MBLNR,ZEILE",
    "MAT-TRUST-TXN,1000,2026-01-15,,0,EA,261,00049001,0001"
  ].join("\n");

  const scenarios = [
    {
      key: "builder_error",
      run: bridge => bridge.loadTextDataset(inventoryCsv, "trust-builder-error.csv", {
        sourceType: "upload", allowMappingReview: false, forceBuildErrorForTest: true,
        suppressErrorLog: true, suppressFeedback: true
      })
    },
    {
      key: "mapping_signature_mismatch",
      run: bridge => bridge.loadTextDataset(inventoryCsv, "trust-mapping-signature.csv", {
        sourceType: "upload", allowMappingReview: false, forceMappingSignatureMismatchForTest: true,
        suppressErrorLog: true, suppressFeedback: true
      })
    },
    {
      key: "policy_signature_mismatch",
      run: bridge => bridge.loadTextDataset(inventoryCsv, "trust-policy-signature.csv", {
        sourceType: "upload", allowMappingReview: false, forceNormalizationPolicySignatureMismatchForTest: true,
        suppressErrorLog: true, suppressFeedback: true
      })
    },
    {
      key: "dataset_id_mismatch",
      run: bridge => bridge.loadTextDataset(inventoryCsv, "trust-dataset-id.csv", {
        sourceType: "upload", allowMappingReview: false, forceDatasetIdMismatchForTest: true,
        suppressErrorLog: true, suppressFeedback: true
      })
    },
    {
      key: "registry_commit_error",
      run: bridge => bridge.loadTextDataset(inventoryCsv, "trust-registry-commit.csv", {
        sourceType: "upload", allowMappingReview: false, forceCommitFailureForTest: true,
        suppressErrorLog: true, suppressFeedback: true
      })
    },
    {
      key: "post_commit_render_error",
      run: bridge => bridge.loadTextDataset(inventoryCsv, "trust-post-commit-render.csv", {
        sourceType: "upload", allowMappingReview: false, forcePostCommitFailureForTest: "render",
        suppressErrorLog: true, suppressFeedback: true
      })
    },
    {
      key: "package_finalization_error",
      run: bridge => bridge.loadTextDataset(inventoryCsv, "trust-package-finalization.csv", {
        sourceType: "upload", allowMappingReview: false, forcePackageFinalizationFailureForTest: true,
        suppressErrorLog: true, suppressFeedback: true
      })
    },
    {
      key: "header_only_inventory",
      run: bridge => bridge.loadTextDataset(inventoryCsv.split("\n")[0], "trust-header-only.csv", {
        sourceType: "upload", allowMappingReview: false,
        suppressErrorLog: true, suppressFeedback: true
      })
    },
    {
      key: "material_master_enrichment_error",
      run: bridge => bridge.importMaterialMasterTextForTest(materialMasterCsv, "trust-material-master.csv", {
        forceInventoryEnrichmentFailureForTest: "after-package",
        suppressErrorLog: true, suppressFeedback: true
      })
    },
    {
      key: "consumption_history_registry_error",
      run: bridge => bridge.importConsumptionHistoryTextForTest(consumptionHistoryCsv, "trust-history.csv", {
        forceCommitFailureForTest: "after-register",
        suppressErrorLog: true, suppressFeedback: true
      })
    }
  ];

  test("TRUST-01 T02/T03/T09/T11/T12 proves transaction rollback with exact Before/After state hashes", async assert => {
    const evidence = [];
    for (const scenario of scenarios) {
      const app = await helpers.loadSampleApp();
      const bridge = app.__obsoliqTestBridge;
      await bridge.waitForHistoricalMetricsRuntimeForTest();
      const beforeState = canonicalState(bridge);
      const beforeHash = stateHash(beforeState);
      const generationBefore = bridge.historicalMetricsRuntimeSnapshotForTest().generation;
      const result = await scenario.run(bridge);
      await bridge.waitForHistoricalMetricsRuntimeForTest();
      const afterState = canonicalState(bridge);
      const afterHash = stateHash(afterState);
      const generationAfter = bridge.historicalMetricsRuntimeSnapshotForTest().generation;
      const difference = firstDifference(beforeState, afterState);
      evidence.push({
        scenario: scenario.key,
        beforeHash,
        afterHash,
        generationBefore,
        generationAfter,
        difference: difference?.path || "",
        status: result?.status || (result === false ? "blocked" : "error")
      });
      assert.notEqual(result?.status, "loaded", `${scenario.key} must not report a successful import`);
      assert.equal(afterHash, beforeHash, `${scenario.key} must restore the complete authoritative state (first difference: ${difference?.path || "none"}; before=${JSON.stringify(difference?.left)}; after=${JSON.stringify(difference?.right)})`);
      assert.ok(generationAfter >= generationBefore, `${scenario.key} must not roll the stale-completion epoch backwards`);
    }
    window.__TRUST_01_ROLLBACK_EVIDENCE__ = evidence;
    assert.equal(evidence.length, scenarios.length, "All TRUST-01 rollback scenarios must publish hash evidence");
    assert.ok(evidence.every(item => item.beforeHash === item.afterHash), "All TRUST-01 Before/After state hashes must match exactly");
  });
})();
