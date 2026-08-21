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
      return builder.MATERIAL_MASTER_MAPPING_POLICY || definition.mappingPolicy || mappingEngine.DEFAULT_MAPPING_POLICY;
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
      const policy = mappingPolicyFor(packageType);
      const source = normalizedParsedSource(parsedSource);
      const automaticMapping = mappingEngine.createAutomaticColumnMapping({
        headers: source.headers,
        rows: source.rows,
        sourceColumnMetadata: source.sourceColumnMetadata,
        policy
      });
      const mappingState = mappingEngine.evaluateMappingState(automaticMapping, {
        headers: source.headers,
        sourceColumnMetadata: source.sourceColumnMetadata,
        policy
      });
      const inputTrustResult = inputTrustService
        ? inputTrustService.assessInputTrust({
          packageType,
          headers: source.headers,
          rows: source.rows,
          sourceColumnMetadata: source.sourceColumnMetadata,
          mapping: automaticMapping,
          mappingPolicy: policy,
          sourceDescriptor
        })
        : null;
      return freezeResult({
        ok: true,
        status: "prepared",
        packageType,
        sourceDescriptor: cloneData(sourceDescriptor),
        parsedSource: source,
        mappingPolicy: cloneData(policy),
        automaticMapping,
        approvedMapping: mappingEngine.cloneColumnMapping(automaticMapping),
        mappingState,
        inputTrustResult
      });
    }

    function validateMapping({ packageType, parsedSource, mapping } = {}) {
      const policy = mappingPolicyFor(packageType);
      const source = normalizedParsedSource(parsedSource);
      const mappingValidation = mappingEngine.validateColumnMapping(mapping || [], {
        sourceColumnMetadata: source.sourceColumnMetadata,
        policy
      });
      const inputTrustResult = inputTrustService
        ? inputTrustService.assessInputTrust({
          packageType,
          headers: source.headers,
          rows: source.rows,
          sourceColumnMetadata: source.sourceColumnMetadata,
          mapping: mappingValidation.mapping,
          mappingPolicy: policy
        })
        : null;
      const { builder } = builderFor(packageType);
      const packageValidation = builder.validateMaterialMasterPackage
        ? builder.validateMaterialMasterPackage({
          sourceRows: source.rows,
          headers: source.headers,
          sourceColumnMetadata: source.sourceColumnMetadata,
          columnMapping: mappingValidation.mapping,
          inputTrustResult,
          evaluatedAt: clock()
        })
        : { status: mappingValidation.valid ? "ready" : "invalid", blockingErrors: mappingValidation.errors, warnings: mappingValidation.warnings };
      return freezeResult({
        ok: mappingValidation.valid && packageValidation.status !== "invalid" && inputTrustResult?.trustState !== "blocked",
        mappingValidation,
        packageValidation,
        inputTrustResult
      });
    }

    function buildPackage({ packageType, parsedSource, approvedMapping, sourceDescriptor = {}, forceBuildErrorForTest = false } = {}) {
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
      const buildResult = builder.buildMaterialMasterPackage({
        sourceRows: source.rows,
        headers: source.headers,
        sourceColumnMetadata: source.sourceColumnMetadata,
        columnMapping: approvedMapping,
        inputTrustResult,
        sourceDescriptor,
        datasetId,
        buildTimestamp: timestamp
      });
      if (buildResult.validation.status === "invalid") {
        return freezeResult({
          ok: false,
          errorCode: "PACKAGE_INVALID",
          packageValidation: buildResult.validation,
          mappingValidation: buildResult.validation.mappingValidation
        });
      }
      const packageRecord = {
        packageType,
        datasetId,
        schemaVersion: "1",
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
          inputTrustMetadata: inputTrustResult?.inputTrustMetadata || buildResult.buildMetadata?.inputTrustMetadata || null,
          normalizedRowCount: buildResult.normalizedRows.length,
          analyticalRowCount: 0,
          excludedSourceRows: [],
          packageRows: buildResult.normalizedRows
        },
        qualitySummary: {},
        packageValidation: {
          statusKey: buildResult.validation.statusKey,
          blockingErrorCount: buildResult.validation.blockingErrors.length,
          warningCount: buildResult.validation.warnings.length,
          missingRequiredValueCount: buildResult.validation.missingMaterialIdCount,
          duplicateRelationshipKeyCount: buildResult.validation.duplicateRelationshipKeyCount,
          evaluatedAt: buildResult.validation.evaluatedAt,
          keyGranularity: buildResult.validation.keyGranularity,
          rowCount: buildResult.validation.rowCount,
          validRowCount: buildResult.validation.validRowCount
        },
        freshness: {
          importedAt: timestamp,
          temporalCoverage: definition.temporalMode || "unknown"
        },
        relationshipKeys: buildResult.relationshipKeys,
        inputTrustMetadata: inputTrustResult?.inputTrustMetadata || buildResult.buildMetadata?.inputTrustMetadata || null,
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
