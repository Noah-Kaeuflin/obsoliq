(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("migrated module and application regression self-tests pass through structured runner", async assert => {
    const app = await helpers.loadApp();
    await helpers.injectAppScript(app, "legacy-app-self-tests.js");
    const moduleTests = [
      { name: "runSourceModelSelfTests", fn: app.ObsoliQ.data.sourceModel.runSourceModelSelfTests },
      { name: "runSourceIngestionSelfTests", fn: app.ObsoliQ.data.ingestion.runSourceIngestionSelfTests },
      { name: "runMappingEngineSelfTests", fn: app.ObsoliQ.mapping.engine.runMappingEngineSelfTests },
      { name: "runDatasetBuilderSelfTests", fn: app.ObsoliQ.data.datasetBuilder.runDatasetBuilderSelfTests },
      { name: "runRecoveryCalculationSelfTests", fn: app.ObsoliQ.recovery.engine.runRecoveryCalculationSelfTests },
      { name: "runRecoveryDatasetValidationSelfTests", fn: app.ObsoliQ.recovery.engine.runRecoveryDatasetValidationSelfTests }
    ];
    const legacyTests = app.__obsoliqLegacySelfTests || [];
    const failures = [];
    for (const item of [...moduleTests, ...legacyTests]) {
      try {
        await helpers.withThrowingConsoleAssert(app, () => item.fn.call(app));
      } catch (error) {
        failures.push(`${item.name}: ${error?.message || error}`);
      }
    }
    assert.equal(failures.length, 0, failures.join("\n"));
    assert.equal(moduleTests.length + legacyTests.length, 19, "Expected migrated regression suite size");
  });
})();
