(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("AP 16.3b.1 Relationship navigation opens the intended Excess case under visible and hidden filter states", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const initialState = bridge.getState();
    const rows = bridge.getExcessPageStateForTest().pageRows;
    const target = rows[1] || rows[0];
    assert.ok(target?.case_id, "Sample Excess page should have a target case");

    const visibleResult = bridge.openExcessCaseByIdForTest(target.case_id);
    assert.equal(visibleResult.status, "opened", "Visible target should open without filter adjustment");
    assert.equal(bridge.getExcessPageStateForTest().activeExcessCaseId, target.case_id, "Visible target should become active");

    bridge.setColumnFilterForTest("excess", "material_action", "__does_not_match_any_case__");
    const hiddenBefore = bridge.getExcessRowsForTest();
    assert.equal(hiddenBefore.some(row => row.case_id === target.case_id), false, "Column filter should hide the target before navigation");

    const hiddenResult = bridge.openExcessCaseByIdForTest(target.case_id);
    const hiddenState = bridge.getExcessPageStateForTest();
    assert.equal(hiddenResult.status, "filter_adjusted", "Hidden target should use controlled Excess filter adjustment");
    assert.equal(hiddenState.activeExcessCaseId, target.case_id, "Hidden target should become active after adjustment");
    assert.equal(hiddenState.pageRows.some(row => row.case_id === target.case_id), true, "Adjusted Excess page should include the intended target");
    assert.equal(hiddenState.filterOverrideCaseId, target.case_id, "Adjustment should be scoped to the Excess target override");

    const missingResult = bridge.openExcessCaseByIdForTest("CASE-DOES-NOT-EXIST");
    assert.equal(missingResult.status, "missing", "Missing target should not open an unrelated case");
    assert.equal(bridge.getExcessPageStateForTest().activeExcessCaseId, target.case_id, "Missing target should preserve the previous active case");

    const afterState = bridge.getState();
    assert.deepEqual(afterState.filterState.overview, initialState.filterState.overview, "Overview filters should remain unchanged");
    assert.equal(afterState.filterState.priority, initialState.filterState.priority, "Action priority filter should remain unchanged");
    assert.equal(afterState.filterState.dataQualityStatus, initialState.filterState.dataQualityStatus, "Data Quality filter should remain unchanged");
    bridge.clearColumnFiltersForTest("excess");
  });
})();
