(function registerPackageImportService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function freezeResult(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => freezeResult(value[key]));
    return Object.freeze(value);
  }

  function createDatasetId(packageType, sourceDescriptor = {}, timestamp = "") {
    const suffix = String(sourceDescriptor.sourceLabel || packageType || "package")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase()
      .slice(0, 32) || "PACKAGE";
    const stamp = String(timestamp || new Date().toISOString()).replace(/[^0-9]/g, "").slice(0, 14);
    return `DS-PKG-${String(packageType || "PACKAGE").replace(/[^a-z0-9]+/gi, "-").toUpperCase()}-${stamp}-${suffix}`;
  }

  function activePackageHasKey(packageRecord, key) {
    return Object.values(packageRecord?.relationshipKeys || {}).some(keys => Array.isArray(keys) && keys.includes(key));
  }

  function relationshipReadiness({ inventoryPackage = null, materialMasterPackage = null } = {}) {
    if (!materialMasterPackage) {
      return freezeResult({ statusKey: "missing", labelKey: "packageMissing", noteKey: "" });
    }
    if (materialMasterPackage.status === "invalid" || materialMasterPackage.packageValidation?.statusKey === "invalid") {
      return freezeResult({ statusKey: "invalid", labelKey: "relationshipPackageInvalid", noteKey: "" });
    }
    const inventoryHasMaterial = activePackageHasKey(inventoryPackage, "material_id");
    const materialHasMaterial = activePackageHasKey(materialMasterPackage, "material_id");
    if (!inventoryHasMaterial || !materialHasMaterial) {
      return freezeResult({ statusKey: "missing_material_key", labelKey: "relationshipMissingMaterialKey", noteKey: "" });
    }
    const inventoryHasPlant = activePackageHasKey(inventoryPackage, "plant");
    const materialHasPlant = activePackageHasKey(materialMasterPackage, "plant");
    if (inventoryHasPlant && materialHasPlant) {
      return freezeResult({ statusKey: "ready_material_plant", labelKey: "relationshipReadyByMaterialPlant", noteKey: "" });
    }
    return freezeResult({
      statusKey: "ready_material",
      labelKey: "relationshipReadyByMaterial",
      noteKey: inventoryHasPlant && !materialHasPlant ? "relationshipPlantSpecificNote" : ""
    });
  }

  function createPackageImportService({
    sourceModel,
    mappingEngine,
    inputTrustService = null,
    consumptionHistoryInterpretationService = null,
    registry,
    packageDefinitions,
    builders,
    clock = () => new Date().toISOString()
  } = {}) {
    if (!sourceModel) throw new Error("Package Import Service requires Source Model.");
    if (!mappingEngine) throw new Error("Package Import Service requires Mapping Engine.");
    if (!registry) throw new Error("Package Import Service requires Data Package Registry.");
    if (!packageDefinitions) throw new Error("Package Import Service requires Package Type Definitions.");

    function packageDefinition(packageType) {
      const definition = packageDefinitions[packageType];
      if (!definition) throw new Error(`Unsupported Data Package Type: ${packageType || "missing"}.`);
      if (definition.importSupported !== true) throw new Error(`Data Package Type is not import-enabled: ${packageType}.`);
      return definition;
    }

    function builderFor(packageType) {
      const definition = packageDefinition(packageType);
      const builder = builders?.[packageType] || builders?.[definition.builderIdentifier];
      if (!builder) throw new Error(`No builder registered for Data Package Type: ${packageType}.`);
      return { definition, builder };
    }

    function mappingPolicyFor(packageType) {
      const { definition, builder } = builderFor(packageType);
      return builder.MATERIAL_MASTER_MAPPING_POLICY
        || builder.CONSUMPTION_HISTORY_MAPPING_POLICY
        || definition.mappingPolicy
        || mappingEngine.DEFAULT_MAPPING_POLICY;
    }

    function fieldDefinitionsFor(packageType) {
      const { builder } = builderFor(packageType);
      return builder.CONSUMPTION_HISTORY_FIELD_DEFINITIONS || null;
    }

    function mappingOptionsFor(packageType, sourceColumnMetadata = []) {
      const fieldDefinitions = fieldDefinitionsFor(packageType);
      return {
        sourceColumnMetadata,
        policy: mappingPolicyFor(packageType),
        ...(fieldDefinitions ? { fieldDefinitions, protectedFieldKeys: [] } : {})
      };
    }

    function validatePackageWithBuilder(builder, input) {
      if (builder.validateMaterialMasterPackage) return builder.validateMaterialMasterPackage(input);
      if (builder.validateConsumptionHistoryPackage) return builder.validateConsumptionHistoryPackage(input);
      return null;
    }

    function buildPackageWithBuilder(builder, input) {
      if (builder.buildMaterialMasterPackage) return builder.buildMaterialMasterPackage(input);
      if (builder.buildConsumptionHistoryPackage) return builder.buildConsumptionHistoryPackage(input);
      throw new Error("Registered Data Package Builder does not expose a supported build method.");
    }

    function interpretationFor(packageType, source, mapping, sourceDescriptor = {}, semanticPolicy = null) {
      if (packageType !== "consumption_history" || !consumptionHistoryInterpretationService) return null;
      return consumptionHistoryInterpretationService.prepareConsumptionHistoryInterpretation({
        packageType,
        headers: source.headers,
        rows: source.rows,
        sourceColumnMetadata: source.sourceColumnMetadata,
        mapping,
        sourceDescriptor,
        semanticPolicy
      });
    }

    function normalizedParsedSource(parsedSource = {}) {
      const headers = Array.isArray(parsedSource.headers) ? parsedSource.headers : [];
      const rows = Array.isArray(parsedSource.rows) ? parsedSource.rows : [];
      const sourceColumnMetadata = Array.isArray(parsedSource.sourceColumnMetadata)
        ? parsedSource.sourceColumnMetadata
        : sourceModel.buildSourceColumnMetadata(headers);
      return {
        headers: cloneData(headers),
        rows: cloneData(rows),
        sourceColumnMetadata: cloneData(sourceColumnMetadata)
      };
    }

    function prepareImport({ packageType, parsedSource, sourceDescriptor = {} } = {}) {
      const source = normalizedParsedSource(parsedSource);
      const automaticMapping = mappingEngine.createAutomaticColumnMapping({
        headers: source.headers,
        rows: source.rows,
        sourceColumnMetadata: source.sourceColumnMetadata,
        ...mappingOptionsFor(packageType, source.sourceColumnMetadata)
      });
      const mappingState = mappingEngine.evaluateMappingState(automaticMapping, {
        headers: source.headers,
        sourceColumnMetadata: source.sourceColumnMetadata,
        ...mappingOptionsFor(packageType, source.sourceColumnMetadata)
      });
      const inputTrustResult = inputTrustService
        ? inputTrustService.assessInputTrust({
          packageType,
          headers: source.headers,
          rows: source.rows,
          sourceColumnMetadata: source.sourceColumnMetadata,
          mapping: automaticMapping,
          mappingPolicy: mappingPolicyFor(packageType),
          fieldDefinitions: fieldDefinitionsFor(packageType) || undefined,
          sourceDescriptor
        })
        : null;
      const interpretationResult = interpretationFor(packageType, source, automaticMapping, sourceDescriptor);
      return freezeResult({
        ok: true,
        status: "prepared",
        packageType,
        sourceDescriptor: cloneData(sourceDescriptor),
        parsedSource: source,
        mappingPolicy: cloneData(mappingPolicyFor(packageType)),
        automaticMapping,
        approvedMapping: mappingEngine.cloneColumnMapping(automaticMapping),
        mappingState,
        inputTrustResult,
        interpretationResult
      });
    }

    function validateMapping({ packageType, parsedSource, mapping, semanticPolicy = null, sourceDescriptor = {} } = {}) {
      const policy = mappingPolicyFor(packageType);
      const source = normalizedParsedSource(parsedSource);
      const mappingValidation = mappingEngine.validateColumnMapping(mapping || [], {
        sourceColumnMetadata: source.sourceColumnMetadata,
        ...mappingOptionsFor(packageType, source.sourceColumnMetadata)
      });
      const inputTrustResult = inputTrustService
        ? inputTrustService.assessInputTrust({
          packageType,
          headers: source.headers,
          rows: source.rows,
          sourceColumnMetadata: source.sourceColumnMetadata,
          mapping: mappingValidation.mapping,
          mappingPolicy: policy,
          fieldDefinitions: fieldDefinitionsFor(packageType) || undefined
        })
        : null;
      const interpretationResult = interpretationFor(packageType, source, mappingValidation.mapping, sourceDescriptor, semanticPolicy);
      const { builder } = builderFor(packageType);
      const packageValidation = validatePackageWithBuilder(builder, {
          sourceRows: source.rows,
          headers: source.headers,
          sourceColumnMetadata: source.sourceColumnMetadata,
          columnMapping: mappingValidation.mapping,
          inputTrustResult,
          semanticInterpretation: interpretationResult,
          semanticPolicy: interpretationResult?.effectivePolicy || semanticPolicy,
          evaluatedAt: clock()
        }) || { status: mappingValidation.valid ? "ready" : "invalid", blockingErrors: mappingValidation.errors, warnings: mappingValidation.warnings };
      return freezeResult({
        ok: mappingValidation.valid
          && packageValidation.status !== "invalid"
          && inputTrustResult?.trustState !== "blocked"
          && interpretationResult?.trustState !== "blocked"
          && interpretationResult?.trustState !== "review_required",
        mappingValidation,
        packageValidation,
        inputTrustResult,
        interpretationResult
      });
    }

    function buildPackage({ packageType, parsedSource, approvedMapping, sourceDescriptor = {}, semanticPolicy = null, forceBuildErrorForTest = false } = {}) {
      if (forceBuildErrorForTest) {
        return freezeResult({ ok: false, errorCode: "BUILD_FAILED", errorMessage: "Forced Package build failure." });
      }
      const { definition, builder } = builderFor(packageType);
      const source = normalizedParsedSource(parsedSource);
      const timestamp = clock();
      const datasetId = sourceDescriptor.datasetId || createDatasetId(packageType, sourceDescriptor, timestamp);
      const inputTrustResult = inputTrustService
        ? inputTrustService.assessInputTrust({
          packageType,
          headers: source.headers,
          rows: source.rows,
          sourceColumnMetadata: source.sourceColumnMetadata,
          mapping: approvedMapping,
          mappingPolicy: mappingPolicyFor(packageType),
          fieldDefinitions: fieldDefinitionsFor(packageType) || undefined,
          sourceDescriptor
        })
        : null;
      if (inputTrustResult?.trustState === "blocked") {
        return freezeResult({
          ok: false,
          errorCode: "INPUT_TRUST_BLOCKED",
          inputTrustResult,
          packageValidation: {
            status: "invalid",
            statusKey: "input_trust_blocked",
            blockingErrors: inputTrustResult.diagnostics.filter(diagnostic => diagnostic.severity === "error"),
            warnings: inputTrustResult.diagnostics.filter(diagnostic => diagnostic.severity !== "error")
          }
        });
      }
      const interpretationResult = interpretationFor(packageType, source, approvedMapping, sourceDescriptor, semanticPolicy);
      if (interpretationResult?.trustState === "blocked") {
        return freezeResult({
          ok: false,
          errorCode: "HISTORY_INTERPRETATION_BLOCKED",
          interpretationResult,
          packageValidation: {
            status: "invalid",
            statusKey: "history_interpretation_blocked",
            blockingErrors: interpretationResult.blockingDiagnostics || [],
            warnings: interpretationResult.reviewDiagnostics || []
          }
        });
      }
      if (interpretationResult?.trustState === "review_required") {
        return freezeResult({
          ok: false,
          errorCode: "HISTORY_INTERPRETATION_REVIEW_REQUIRED",
          interpretationResult,
          packageValidation: {
            status: "invalid",
            statusKey: "history_interpretation_review_required",
            blockingErrors: interpretationResult.reviewDiagnostics || [],
            warnings: []
          }
        });
      }
      const buildResult = buildPackageWithBuilder(builder, {
        sourceRows: source.rows,
        headers: source.headers,
        sourceColumnMetadata: source.sourceColumnMetadata,
        columnMapping: approvedMapping,
        inputTrustResult,
        semanticInterpretation: interpretationResult,
        semanticPolicy: interpretationResult?.effectivePolicy || semanticPolicy,
        sourceDescriptor,
        datasetId,
        buildTimestamp: timestamp
      });
      const packageValidation = buildResult.validation || buildResult.packageValidation || {};
      if (interpretationResult
        && buildResult.buildMetadata?.semanticPolicySignature
        && interpretationResult.semanticPolicySignature !== buildResult.buildMetadata.semanticPolicySignature) {
        return freezeResult({
          ok: false,
          errorCode: "HISTORY_SEMANTIC_SIGNATURE_MISMATCH",
          interpretationResult,
          packageValidation: {
            status: "invalid",
            statusKey: "history_semantic_signature_mismatch",
            blockingErrors: [{ key: "historySemanticSignatureMismatch", code: "historySemanticSignatureMismatch", severity: "error", count: 1 }],
            warnings: []
          }
        });
      }
      if (packageValidation.status === "invalid") {
        return freezeResult({
          ok: false,
          errorCode: "PACKAGE_INVALID",
          packageValidation,
          mappingValidation: packageValidation.mappingValidation
        });
      }
      const packageRecord = {
        packageType,
        datasetId,
        schemaVersion: definition.schemaVersion || buildResult.buildMetadata?.schemaVersion || builder.schemaVersion || "1",
        status: "ready",
        sourceDescriptor: {
          sourceLabel: sourceDescriptor.sourceLabel || "",
          sourceType: sourceDescriptor.sourceType || "upload",
          rows: source.rows.length,
          originalRows: source.rows.length,
          columns: source.headers.length
        },
        sourceData: {
          headers: source.headers,
          sourceColumnMetadata: source.sourceColumnMetadata,
          rows: source.rows
        },
        mapping: {
          columnMapping: buildResult.validation.mappingValidation.mapping,
          mappingValidation: buildResult.validation.mappingValidation,
          baseColumnMapping: []
        },
        buildData: {
          operationType: "package_import",
          packageTypeDefinition: {
            domain: definition.domain,
            temporalMode: definition.temporalMode,
            currentUiSupport: definition.currentUiSupport
          },
          builtAt: timestamp,
          buildMetadata: buildResult.buildMetadata,
          freshness: buildResult.freshness || null,
          inputTrustMetadata: inputTrustResult?.inputTrustMetadata || buildResult.buildMetadata?.inputTrustMetadata || null,
          interpretationMetadata: {
            ...(interpretationResult?.inputTrustMetadata || buildResult.buildMetadata?.interpretationMetadata || {}),
            historyReadiness: buildResult.buildMetadata?.historyReadiness || interpretationResult?.historyReadiness || null
          },
          normalizedRowCount: buildResult.normalizedRows.length,
          analyticalRowCount: 0,
          excludedSourceRows: [],
          packageRows: buildResult.normalizedRows
        },
        qualitySummary: {},
        packageValidation: {
          statusKey: packageValidation.statusKey,
          blockingErrorCount: (packageValidation.blockingErrors || []).length,
          warningCount: (packageValidation.warnings || []).length,
          missingRequiredValueCount: Number(packageValidation.missingMaterialIdCount || 0)
            + Number(packageValidation.missingTemporalValueCount || 0)
            + Number(packageValidation.missingQuantityCount || 0)
            + Number(packageValidation.invalidQuantityCount || 0),
          duplicateRelationshipKeyCount: packageValidation.duplicateRelationshipKeyCount || 0,
          evaluatedAt: packageValidation.evaluatedAt,
          keyGranularity: packageValidation.keyGranularity,
          rowCount: packageValidation.rowCount,
          validRowCount: packageValidation.validRowCount,
          historyReadinessStatus: packageValidation.historyReadinessStatus,
          semanticDiagnosticCount: packageValidation.semanticDiagnosticCount || 0,
          diagnostics: cloneData(packageValidation.diagnostics || [
            ...(packageValidation.blockingErrors || []),
            ...(packageValidation.warnings || [])
          ])
        },
        freshness: buildResult.freshness || {
          importedAt: timestamp,
          temporalCoverage: definition.temporalMode || "unknown"
        },
        relationshipKeys: buildResult.relationshipKeys,
        inputTrustMetadata: inputTrustResult?.inputTrustMetadata || buildResult.buildMetadata?.inputTrustMetadata || null,
        interpretationMetadata: {
          ...(interpretationResult?.inputTrustMetadata || {}),
          historyReadiness: buildResult.buildMetadata?.historyReadiness || interpretationResult?.historyReadiness || null
        },
        createdAt: timestamp,
        updatedAt: timestamp
      };
      return freezeResult({ ok: true, preparedPackage: packageRecord, buildResult });
    }

    function commitPackage({ preparedPackage, forceCommitFailureForTest = false } = {}) {
      if (!preparedPackage) return freezeResult({ ok: false, errorCode: "PACKAGE_MISSING" });
      const snapshot = registry.snapshot();
      try {
        if (forceCommitFailureForTest === "before-register") {
          throw new Error("Forced Package commit failure before registration.");
        }
        const record = registry.registerPackage(preparedPackage);
        if (forceCommitFailureForTest === "after-register") {
          throw new Error("Forced Package commit failure after registration.");
        }
        return freezeResult({ ok: true, packageRecord: record });
      } catch (error) {
        registry.restore(snapshot);
        return freezeResult({
          ok: false,
          errorCode: "COMMIT_FAILED",
          errorMessage: error.message
        });
      }
    }

    function importPackage(input = {}) {
      const built = buildPackage(input);
      if (!built.ok) return built;
      return commitPackage({
        preparedPackage: built.preparedPackage,
        forceCommitFailureForTest: input.forceCommitFailureForTest
      });
    }

    return freezeResult({
      prepareImport,
      validateMapping,
      buildPackage,
      commitPackage,
      importPackage,
      mappingPolicyFor,
      relationshipReadiness
    });
  }

  root.application.packageImportService = Object.freeze({
    version: "1",
    createPackageImportService,
    relationshipReadiness
  });
})(window);
