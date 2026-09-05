// Synthetic-only feedback and correction fixtures. No artifacts are written.
const assert = require("node:assert/strict");
const { R, B, clone, hash, model, clock, makeService, save, decision, restore, resign } = require("./recovery-loop-01c.test.cjs");
const checks = [];
function eq(actual, expected, label) { assert.deepEqual(clone(actual), clone(expected), label); checks.push(label); }
function ok(value, label) { assert.ok(value, label); checks.push(label); }
const input = { kind: "partial_reported", description: '=SYNTHETIC "4 gemeldet"\n<img src=x onerror=alert(1)>', remaining: "4 Einheiten noch offen gemeldet",
  reporter: "+Synthetischer Einkauf", reported_on: "2026-09-05", implemented_on: "", reference_type: "synthetic", reference: "", correction_reason: "" };
const row = (s,m) => s.list(m)[0].positions.find(row => row.purchase_order_item === "00010");
async function begin(s,m,version=1,correctsId="") {
  const record=s.list(m)[0]; return s.beginFeedback({model:m,reviewId:record.review_id,positionId:row(s,m).position_id,version,correctsId});
}
async function add(s,m,values=input,version=1,correctsId="") {
  const result=await begin(s,m,version,correctsId); eq(result.status,"ready","historical editor opens");
  return s.saveFeedback({editor:result.editor,input:values});
}
(async()=>{
  const m=model(), sourceHash=hash(m), s=makeService(m);
  eq((await begin(s,m)).status,"blocked","draft cannot receive report");
  eq(save(s,m,decision).status,"ready","document v1");
  const before=hash(s.snapshot()), editor=(await begin(s,m)).editor;
  for(const [values,error] of [[{},"feedback_kind_required"],[{...input,description:""},"feedback_description_required"],[{...input,reporter:""},"feedback_reporter_required"],
    [{...input,reported_on:""},"feedback_reported_on_required"],[{...input,reported_on:"2026-02-30"},"feedback_date_invalid"],[{...input,remaining:""},"feedback_remaining_required"],
    [{...input,implemented_on:"not-date"},"feedback_date_invalid"]]) ok(s.saveFeedback({editor,input:values}).errors.includes(error),error);
  eq(hash(s.snapshot()),before,"invalid input nonmutating");
  const first=s.saveFeedback({editor,input}); eq(first.status,"ready","valid report saved");
  const firstHash=hash(s.snapshot());
  eq(s.saveFeedback({editor,input}).unchanged,true,"same editor duplicate no-op"); eq(hash(s.snapshot()),firstHash,"no duplicate state change");
  eq(s.saveFeedback({editor,input:{...input,description:"other"}}).status,"blocked","consumed editor cannot rewrite report");
  eq(row(s,m).source_status,"current","report is not source identity");
  eq(row(s,m).decision_version,1,"report does not version decision");
  eq(row(s,m).feedback[0].target.decision_version,1,"immutable decision version");
  eq(row(s,m).feedback[0].recorded_at,clock(),"automatic capture timestamp");
  eq(row(s,m).feedback[0].reference,"","missing reference stays missing");
  const duplicateEditor=(await begin(s,m)).editor;
  const corrected=await add(s,m,{...input,description:"Korrektur: 3 gemeldet",remaining:"5 offen",correction_reason:"Synthetische Zahl berichtigt"},1,first.id);
  eq(corrected.status,"ready","correction appended"); eq(row(s,m).feedback.length,2,"original retained"); eq(row(s,m).feedback[0].description,input.description,"original still readable");
  eq(row(s,m).feedback[1].corrects_id,first.id,"correction reference");
  eq(s.saveFeedback({editor:duplicateEditor,input}).status,"blocked","concurrent feedback invalidates editor");
  eq((await begin(s,m,1,first.id)).status,"blocked","superseded report cannot fork correction");
  const correctionEditor=(await begin(s,m,1,corrected.id)).editor;
  ok(s.saveFeedback({editor:correctionEditor,input}).errors.includes("feedback_correction_required"),"correction reason mandatory");
  const stale=model("A",6), feedbackBefore=clone(row(s,m).feedback);
  eq(row(s,stale).feedback,feedbackBefore,"12 to 6 no automatic reports"); eq(row(s,stale).source_status,"stale","source decline only stale");
  const missing={rows:[],sourceValid:false}; eq(row(s,missing).feedback,feedbackBefore,"missing PO no cancellation report");
  eq((await add(s,missing,{...input,kind:"not_implemented_reported"})).status,"ready","historical report with missing live PO");
  eq(row(s,missing).source_status,"unassignable","historical report cannot restore currentness");
  const pending=(await begin(s,stale)).editor;
  const r=s.list(stale)[0], d=s.beginDecision({model:stale,reviewId:r.review_id,positionId:row(s,stale).position_id,recheck:true}).editor;
  eq(s.saveDecision({model:stale,editor:d,input:{...decision,reduction_quantity:4},confirmed:true}).status,"ready","v2 fresh request of4");
  eq(s.saveFeedback({editor:pending,input}).status,"blocked","decision change rejects stale feedback editor");
  ok(row(s,stale).feedback.every(f=>f.target.decision_version===1),"old reports not carried to v2");
  eq((await begin(s,stale,1)).editor.source_status,"stale","v1 uses its own historical source state after v2 recheck");
  eq((await begin(s,stale,2)).editor.source_status,"current","v2 current source state independent of v1");
  eq((await add(s,stale,{...input,kind:"full_reported"})).status,"ready","can still report on historical v1");
  eq((await add(s,stale,{...input,kind:"full_reported",reference:"SYN-REF-001"},2)).status,"ready","explicit v2 report");
  eq(row(s,stale).feedback.filter(f=>f.target.decision_version===2).length,1,"only explicit report belongs to v2");
  const bytes=(await s.createBackup()).json, doc=JSON.parse(bytes), target=R.createReviewService({clock});
  eq(doc.format,B.FORMAT,"v2 format"); eq(doc.entries[0].feedback?.length+doc.entries[1].feedback?.length,5,"all feedback included");
  eq((await restore(target,bytes,model("F",6))).result.status,"ready","fresh v2 restore");
  eq(JSON.parse((await target.createBackup()).json).entries,doc.entries,"v2 full roundtrip");
  const restoredHash=hash(target.snapshot()); eq((await restore(target,bytes,model("F",6))).result.unchanged,true,"v2 duplicate no-op");
  eq(hash(target.snapshot()),restoredHash,"duplicate restore byte-identical");
  const legacy=clone(doc); legacy.format=B.LEGACY_FORMAT; legacy.entries.forEach(e=>delete e.feedback); const v1=await resign(legacy);
  eq((await restore(target,v1,model("F",6))).result.unchanged,true,"v1 matching import retains local reports");
  eq(hash(target.snapshot()),restoredHash,"v1 cannot erase feedback");
  const legacyOnly=R.createReviewService(); eq((await restore(legacyOnly,v1,model("F",6))).result.status,"ready","v1 fresh compatibility");
  ok(legacyOnly.list(model("F",6)).every(r=>r.positions.every(p=>p.feedback.length===0)),"v1 has no invented reports");
  eq((await restore(legacyOnly,bytes,model("F",6))).result.status,"ready","same decision gains missing reports additively");
  const badLegacy=clone(legacy); badLegacy.entries.find(e=>e.decision?.work_state==="documented").decision.reason="conflicting";
  eq((await restore(target,await resign(badLegacy),model("F",6))).preview.status,"conflict","v1 contradictory decision conflicts");
  eq(hash(target.snapshot()),restoredHash,"v1 conflict no changes");
  for(const [label,mutate] of [
    ["missing decision version",f=>f[0].target.decision_version=999], ["wrong binding",f=>f[0].target.decision_signature="0".repeat(64)],
    ["duplicate report",f=>f.push(clone(f[0]))], ["missing correction",f=>f[1].corrects_id="00000000-0000-0000-0000-000000000000"],
    ["cycle",f=>f[0].corrects_id=f[1].id], ["cross-version correction",f=>{f[4].corrects_id=f[0].id;f[4].correction_reason="invalid";}],
    ["bad timestamp",f=>f[0].recorded_at="2026-02-30T00:00:00.000Z"]]) {
    const bad=clone(doc); mutate(bad.entries.find(e=>e.feedback.length).feedback);
    eq((await restore(target,await resign(bad),model("F",6))).preview.status,"blocked",label+" rejected");
    eq(hash(target.snapshot()),restoredHash,label+" atomic");
  }
  const changedReport=clone(doc); changedReport.entries.find(e=>e.feedback.length).feedback[0].description="different text same id";
  eq((await restore(target,await resign(changedReport),model("F",6))).preview.status,"conflict","same report ID differing content conflicts");
  eq(hash(target.snapshot()),restoredHash,"report conflict atomic");
  const failed=R.createReviewService({restoreFault:()=>{throw Error("synthetic restore fault");}}), failedHash=hash(failed.snapshot());
  eq((await restore(failed,bytes,m)).result.status,"blocked","restore fault rejected"); eq(hash(failed.snapshot()),failedHash,"restore fault full rollback");
  const oldEditor=(await begin(target,model("F",6),1)).editor;
  target.restore(target.snapshot()); eq(target.saveFeedback({editor:oldEditor,input}).status,"blocked","snapshot epoch invalidates editor");
  const exportRows=R.exportFeedback(s.list(stale)); eq(exportRows.length,5,"one CSV row per report");
  eq(exportRows[0].correction_state,"superseded","CSV original superseded"); eq(exportRows[0].requested_reduction_quantity,8,"CSV historical quantity not current request");
  ok(exportRows.every(e=>!("open_value" in e)&&!("recovery_potential" in e)),"no duplicated financial amounts");
  eq(hash(m),sourceHash,"original model unchanged");
  const keep=makeService(m); save(keep,m,{...decision,direction:"keep"});
  ok(keep.saveFeedback({editor:(await begin(keep,m)).editor,input}).errors.includes("feedback_kind_required"),"partial reduction wording invalid for keep");
  eq((await add(keep,m,{...input,kind:"keep_reported"})).status,"ready","retention-specific report");
  const incomplete=clone(keep.snapshot()); incomplete[0][1].positions[0].source.packageId=""; keep.restore(incomplete);
  eq((await begin(keep,m)).status,"blocked","incomplete historic identity fails closed");
  const raced=makeService(m);save(raced,m,decision);
  const preparing=begin(raced,m);save(raced,m,{...decision,reason:"changed while opening"});
  eq((await preparing).status,"blocked","async open cannot retain replaced row");
  const rolled=makeService(m);save(rolled,m,decision);const rollback=rolled.snapshot(),used=(await begin(rolled,m)).editor;
  eq(rolled.saveFeedback({editor:used,input}).status,"ready","report before snapshot rollback");rolled.restore(rollback);
  eq(rolled.saveFeedback({editor:used,input}).status,"blocked","consumed editor after rollback cannot claim phantom success");
  console.log(JSON.stringify({suite:"RECOVERY-LOOP-01D",passed:checks.length,checks,sourceHash,restoredHash},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
