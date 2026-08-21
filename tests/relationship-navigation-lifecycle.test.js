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
    assert.equal(bridge.getExcessPageStateForTest().filterOverrideCaseId, "", "Visible navigation should not create persistent reveal state");

    bridge.setColumnFilterForTest("excess", "material_action", "__does_not_match_any_case__");
    const hiddenBefore = bridge.getExcessRowsForTest();
    assert.equal(hiddenBefore.some(row => row.case_id === target.case_id), false, "Column filter should hide the target before navigation");

    const hiddenResult = bridge.openExcessCaseByIdForTest(target.case_id);
    const hiddenState = bridge.getExcessPageStateForTest();
    assert.equal(hiddenResult.status, "filter_adjusted", "Hidden target should use controlled Excess filter adjustment");
    assert.equal(hiddenState.activeExcessCaseId, target.case_id, "Hidden target should become active after adjustment");
    assert.equal(hiddenState.pageRows.some(row => row.case_id === target.case_id), true, "Adjusted Excess page should include the intended target");
    assert.equal(hiddenState.filterOverrideCaseId, "", "Navigation reveal state should be consumed immediately");
    assert.deepEqual(bridge.getState().filterState.columnFilters.excess, {}, "Controlled adjustment should leave explicit Excess filters as the source of truth");
    assert.equal(hiddenState.totalRows, bridge.getExcessRowsForTest().length, "Filtered Summary population should match actual active filters");
    const exported = bridge.rowsForExportForTest(bridge.getExcessRowsForTest(), bridge.excessExportColumnsForTest());
    assert.equal(exported.length, hiddenState.totalRows + 1, "Filtered Excess export scope should match actual active filters plus header row");

    bridge.setColumnFilterForTest("excess", "material_action", "__does_not_match_any_case__");
    const hiddenNoAdjust = bridge.openExcessCaseByIdForTest(target.case_id, { adjustFilters: false });
    assert.equal(hiddenNoAdjust.status, "hidden", "Hidden target should not open when controlled filter adjustment is disabled");
    assert.equal(bridge.getExcessPageStateForTest().filterOverrideCaseId, "", "Disabled adjustment should not leave reveal state");
    bridge.clearColumnFiltersForTest("excess");
    bridge.setColumnSortForTest("excess", "material_action", "desc");
    assert.equal(bridge.getExcessPageStateForTest().filterOverrideCaseId, "", "Sort changes should not revive reveal state");
    bridge.setExcessPageForTest(1);
    bridge.renderExcessPageForTest();
    assert.equal(bridge.getExcessPageStateForTest().filterOverrideCaseId, "", "Page changes should not revive reveal state");

    const activeBeforeMissing = bridge.getExcessPageStateForTest().activeExcessCaseId;
    const missingResult = bridge.openExcessCaseByIdForTest("CASE-DOES-NOT-EXIST");
    assert.equal(missingResult.status, "missing", "Missing target should not open an unrelated case");
    assert.equal(bridge.getExcessPageStateForTest().activeExcessCaseId, activeBeforeMissing, "Missing target should preserve the previous active case");

    const afterState = bridge.getState();
    assert.deepEqual(afterState.filterState.overview, initialState.filterState.overview, "Overview filters should remain unchanged");
    assert.equal(afterState.filterState.priority, initialState.filterState.priority, "Action priority filter should remain unchanged");
    assert.equal(afterState.filterState.dataQualityStatus, initialState.filterState.dataQualityStatus, "Data Quality filter should remain unchanged");
    bridge.clearColumnFiltersForTest("excess");
  });
})();
