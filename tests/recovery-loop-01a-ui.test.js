// Synthetic PO fixtures only; existing transaction and application bridges.
(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;
  function approved(app, csv) {
    const b=app.ObsoliQ.data.purchaseOrdersBuilder, parsed=app.ObsoliQ.data.ingestion.parseDelimited(csv);
    const mapping=app.ObsoliQ.mapping.engine.createAutomaticColumnMapping({headers:parsed.headers,rows:parsed.rows,...b.mappingOptions(parsed.sourceColumnMetadata)});
    const result=b.inspect({headers:parsed.headers,sourceRows:parsed.rows,sourceColumnMetadata:parsed.sourceColumnMetadata,columnMapping:mapping});
    return {normalizationPolicy:result.effectivePolicy,purchaseOrderReview:{confirmed:true,binding:result.reviewBinding}};
  }
  function state(bridge) {
    const s=bridge.snapshotDatasetRuntimeState();
    return Object.fromEntries(["rawRows","originalHeaders","sourceColumnMetadata","normalizedRows","enrichedRows","currentDatasetMeta","dataPackageRegistrySnapshot","datasetIdentitySequence","dataQualityIssues","dataCorrections","issueDecisions","remediationActions","remediationHistory","actionStatusSnapshot","historicalMetricsRuntimeState","slowDeadRecoveryCaseRuntime","purchaseOrderReviews","filterState"].map(k=>[k,s[k]]));
  }
  test("RECOVERY-LOOP-01A restores application and registry on PO builder/register failures",async assert=>{
    const app=await helpers.loadApp(), bridge=app.__obsoliqTestBridge;
    await bridge.loadFullDemoForTest();
    const csv=app.ObsoliQ.purchaseOrders.demo.initial, policy=approved(app,csv);
    const options={...policy,packageType:"purchase_orders",allowMappingReview:false,render:false,suppressErrorLog:true,suppressFeedback:true,suppressSuccessFeedback:true};
    assert.equal((await bridge.loadTextDataset(csv,"synthetic-po.csv",options)).status,"loaded","Initial PO package is committed");
    for(const fault of [{forceBuildErrorForTest:true},{forceCommitFailureForTest:"before-register"},{forceCommitFailureForTest:"after-register"}]) {
      const before=state(bridge);
      const result=await bridge.loadTextDataset(csv,"synthetic-po-fault.csv",{...options,...fault});
      assert.equal(result.status,"error","Injected failure blocks PO import");
      const after=state(bridge);
      // DATA_CONTRACT permits only the monotone restore epoch to advance, rejecting late completions.
      assert.equal(after.historicalMetricsRuntimeState.generation,before.historicalMetricsRuntimeState.generation+1,"Restore advances the stale-completion guard exactly once");
      const comparable={...after,historicalMetricsRuntimeState:{...after.historicalMetricsRuntimeState,generation:before.historicalMetricsRuntimeState.generation}};
      assert.ok(JSON.stringify(comparable)===JSON.stringify(before),"Complete selected business state, registry, identity sequence and filters restored");
    }
  });
  test("RECOVERY-LOOP-01A package evidence is exact-case scoped without changing readiness or scenario formulas",async assert=>{
    const app=await helpers.loadApp(), bridge=app.__obsoliqTestBridge;
    await bridge.loadFullDemoForTest();
    const casesBefore=bridge.getExcessRowsForTest(), csv=app.ObsoliQ.purchaseOrders.demo.initial;
    const beforeCore=bridge.getExcessDecisionCoreForTest(casesBefore.find(c=>c.material_id==="MAT-1090"));
    await bridge.loadTextDataset(csv,"synthetic-po.csv",{...approved(app,csv),packageType:"purchase_orders",allowMappingReview:false,render:false,suppressSuccessFeedback:true});
    const model=bridge.getPurchaseOrdersModelForTest(), row=model.rows.find(r=>r.material_id==="MAT-1090"&&r.case_ids.length);
    const evidence=app.ObsoliQ.purchaseOrders.reviewService.caseEvidence(model,row.case_ids[0]);
    assert.equal(evidence.version,"po-package-evidence-v1","Concrete evidence has distinct package contract version");
    assert.equal(evidence.evidence.length,2,"Only two current compatible positions close concrete source evidence");
    assert.ok(evidence.evidence.every(e=>e.sourcePackageId&&e.sourceRevision===1&&e.mappingSignature&&e.policySignature),"Evidence retains source bindings");
    assert.equal(app.ObsoliQ.purchaseOrders.reviewService.caseEvidence(model,"unknown-case").state,"no_case_evidence","Import alone never creates arbitrary case evidence");
    assert.deepEqual(bridge.getExcessRowsForTest(),casesBefore,"Authoritative Excess cases, values, scores, recommendations and readiness unchanged");
    const afterCore=bridge.getExcessDecisionCoreForTest(casesBefore.find(c=>c.material_id==="MAT-1090"));
    assert.deepEqual(afterCore.decisionReadiness,beforeCore.decisionReadiness,"No blanket readiness uplift");
  });
})();
