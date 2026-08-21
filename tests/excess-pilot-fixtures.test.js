(function () {
  const { test } = window.ObsoliQTests;

  test("AP 16.3b pilot fixtures cover cases A-L with explicit expectation contracts", async assert => {
    const fixtures = window.ObsoliQExcessPilotFixtures?.cases || [];
    assert.equal(fixtures.length, 12, "Pilot matrix should contain exactly cases A-L");
    assert.deepEqual(fixtures.map(item => item.fixtureId), ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"], "Pilot fixtures should be deterministic and ordered");
    fixtures.forEach(item => {
      assert.ok(item.description, `${item.fixtureId} should describe the business case`);
      assert.ok(item.inventoryInput, `${item.fixtureId} should include inventory input`);
      assert.ok(Object.prototype.hasOwnProperty.call(item, "materialMasterInput"), `${item.fixtureId} should include Material Master input boundary`);
      assert.ok(Array.isArray(item.expectedFacts), `${item.fixtureId} should define expected facts`);
      assert.ok(Array.isArray(item.expectedLimitations), `${item.fixtureId} should define expected limitations`);
      assert.ok(Array.isArray(item.expectedScoreConstraints), `${item.fixtureId} should define score constraints`);
      assert.ok(item.expectedScenarioAvailability && typeof item.expectedScenarioAvailability === "object", `${item.fixtureId} should define scenario availability expectations`);
      assert.ok(item.expectedOwnerContext && typeof item.expectedOwnerContext === "object", `${item.fixtureId} should define owner context expectations`);
      assert.ok(item.expectedRelationshipState && typeof item.expectedRelationshipState === "object", `${item.fixtureId} should define relationship state expectations`);
      assert.ok(Number(item.inventoryInput.net_addressable_excess_value) <= Number(item.inventoryInput.gross_excess_value), `${item.fixtureId} should not define net excess above gross excess`);
    });
    assert.ok(!String(window.sampleCsv || "").includes("MAT-A,Pilot material A"), "Pilot fixtures must not enter sample bootstrap data");
  });
})();
