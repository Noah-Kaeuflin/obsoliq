// SYNTHETIC ONLY. Repository contract tests; no product-tree artifacts.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const context=vm.createContext({console});context.window=context;
const files=["js/core/canonical-model.js","js/core/value-utils.js","js/data/source-model.js","js/data/source-ingestion.js","js/data/schema-profiler.js","js/data/input-normalization-engine.js","js/mapping/mapping-engine.js","js/data/data-package-registry.js","js/data/consumption-history-semantics-engine.js","js/data/consumption-history-relationship-engine.js","js/data/purchase-orders-builder.js","js/application/input-trust-service.js","js/application/package-import-service.js","js/purchase-orders/purchase-order-review-service.js"];
files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file}));
const O=context.ObsoliQ,b=O.data.purchaseOrdersBuilder,R=O.purchaseOrders.reviewService;
const clone=value=>JSON.parse(JSON.stringify(value)),hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
let count=0;const checks=[];function eq(a,v,label){assert.deepEqual(clone(a),clone(v),label);checks.push(label);count++;}
function ok(value,label){assert.ok(value,label);checks.push(label);count++;}
const registry=O.data.packageRegistry.createDataPackageRegistry(),trust=O.application.inputTrustService.createInputTrustService({canonical:O.core.canonical,schemaProfiler:O.data.schemaProfiler,inputNormalizationEngine:O.data.inputNormalizationEngine,mappingEngine:O.mapping.engine,clock:()=>""});
const importer=O.application.packageImportService.createPackageImportService({sourceModel:O.data.sourceModel,mappingEngine:O.mapping.engine,inputTrustService:trust,registry,packageDefinitions:O.data.packageRegistry.DATA_PACKAGE_TYPE_DEFINITIONS,builders:{purchase_orders:b},clock:()=>"2026-09-05T00:00:00Z"});
const inventory={packageId:"INV",datasetId:"DS",revision:1,relationshipKeys:{material:["material_id"],organization:["plant"]}};
const inventoryRows=[{material_id:"000123",plant:"0010",base_unit:"EA",stock_quantity:20,row_number:1}];
const cases=[{case_id:"CASE",material_id:"000123",plant:"0010"}];
function model(q=12,date="2026-10-01",tail="",items="") {
 const csv="purchase_order,purchase_order_item,material_id,plant,open_quantity,base_unit,delivery_date,item_status\n00045001,00010,000123,0010,"+q+",EA,"+date+",open"+tail+"\n00045001,00020,000123,0010,4,EA,2026-10-01,open"+items;
 const parsed=O.data.ingestion.parseDelimited(csv),columnMapping=O.mapping.engine.createAutomaticColumnMapping({headers:parsed.headers,rows:parsed.rows,...b.mappingOptions(parsed.sourceColumnMetadata)});
 const input={sourceRows:parsed.rows,headers:parsed.headers,sourceColumnMetadata:parsed.sourceColumnMetadata,columnMapping},inspection=b.inspect(input);
 const result=importer.importPackage({packageType:"purchase_orders",parsedSource:parsed,approvedMapping:columnMapping,normalizationPolicy:inspection.effectivePolicy,purchaseOrderReview:{confirmed:true,binding:inspection.reviewBinding},sourceDescriptor:{classification:"synthetic",sourceLabel:"synthetic.csv"}});
 ok(result.ok,"fixture imported");
 return R.buildModel({inventoryPackage:inventory,poPackage:result.packageRecord,inventoryRows,cases});
}
let m=model(),ticks=0;
const service=R.createReviewService({clock:()=>new Date(Date.UTC(2026,8,5,0,0,ticks++)).toISOString()});
const handoff=which=>service.handoff({model:which,caseRecord:cases[0],actionRow:inventoryRows[0],positionIds:[which.rows[0].position_id]});
eq(handoff(m).added,1,"existing case handoff");
const id=service.list(m)[0].review_id,pos=m.rows[0].position_id;
const open=(which=m,recheck=false)=>service.beginDecision({model:which,reviewId:id,positionId:pos,recheck}).editor;
const base={direction:"request_reduction",reason:'Synthetic reason: "Prüfung"\n=not execution',owner:"Synthetic Procurement",work_state:"documented",reduction_quantity:"8",evidence_reference:"=HYPERLINK(\"synthetic\")",evidence_type:"synthetic manual note",review_date:"2026-09-20",evidence_date:"2026-09-05"};
const save=(input,editor=open(),which=m,confirmed=false)=>service.saveDecision({model:which,editor,input,confirmed});
const before=hash({inventoryRows,registry:registry.snapshot()});
for(const [change,error] of [[{reason:" "},"reason_required"],[{owner:" "},"owner_required"],[{direction:""},"direction_required"],[{reduction_quantity:""},"reduction_required"],[{work_state:"Implemented"},"work_state_invalid"],[{review_date:"2026-02-30"},"review_date_invalid"],[{evidence_date:"invalid"},"evidence_date_invalid"]]){
 const state=hash(service.snapshot());ok(save({...base,...change}).errors.includes(error),error);eq(hash(service.snapshot()),state,"validation atomic "+error);
}
for(const value of [-1,0,"-0",13,"Infinity","NaN","12abc","1,234","1e309",true,{}, "2 EA"])ok(save({...base,reduction_quantity:value}).errors.includes("reduction_invalid"),"invalid reduction "+String(value));
eq(save({...base,work_state:"open",reason:"",owner:"",direction:"",reduction_quantity:""}).status,"ready","incomplete draft");
eq(service.list(m)[0].positions[0].currently_documented,false,"draft not documented");
const e=open();eq(save(base,e).status,"ready","current complete decision");
eq(service.list(m)[0].positions[0].source_status,"current","saving does not stale own source");
eq(service.list(m)[0].positions[0].currently_documented,true,"current documented");
const snapshot=hash(service.snapshot());eq(handoff(m).added,0,"repeat handoff no duplicate");eq(hash(service.snapshot()),snapshot,"handoff preserves input");
eq(save(base).unchanged,true,"same content save idempotent");eq(hash(service.snapshot()),snapshot,"same content unchanged including timestamp");
eq(save({...base,reason:"Old editor"},e).status,"blocked","concurrent editor stale version");
eq(service.handoff({model:m,caseRecord:cases[0],actionRow:inventoryRows[0],positionIds:[m.rows[1].position_id]}).added,1,"additional position");eq(service.list(m)[0].positions[0].decision.reason,base.reason,"additional position preserves decision");
eq(save({...base,reason:"Synthetic updated reason"}).status,"ready","amend decision");eq(service.list(m)[0].positions[0].decision_history.length,1,"prior documented version retained");
eq(hash({inventoryRows,registry:registry.snapshot()}),before,"save does not change Inventory or registry");
const editing=open(),newModel=model(6);const oldState=hash(service.snapshot());
eq(service.list(newModel)[0].positions[0].source_status,"stale","new source stale");
eq(service.list(newModel)[0].positions[0].currently_documented,false,"stale not currently documented");
eq(save(base,editing,newModel).errors,["source_changed"],"import during editor prevents save");
eq(hash(service.snapshot()),oldState,"stale save atomic");
eq(handoff(newModel).added,0,"new source handoff does not make a second active decision");
eq(hash(service.snapshot()),oldState,"new source handoff does not overwrite old binding");
const recheck=open(newModel,true);
eq(recheck.source_snapshot.open_quantity,6,"recheck current quantity");
eq(recheck.current_source.open_quantity,6,"current evidence distinct from accepted source");
eq(recheck.previous_source.open_quantity,12,"previous quantity retained");
eq(save(base,recheck,newModel).errors,["recheck_required"],"explicit recheck confirmation required");
ok(save(base,recheck,newModel,true).errors.includes("reduction_invalid"),"8 cannot reduce new 6");
eq(save({...base,reduction_quantity:"4"},recheck,newModel,true).status,"ready","reconfirmed valid 4");
eq(service.list(newModel)[0].positions[0].source_status,"current","new current binding");
eq(service.list(newModel)[0].positions[0].decision_history.length,2,"old documented sources retained");
m=newModel;
for(const state of ["unmatched","ambiguous","excluded","unit_conflict","invalid_source"]){
 const unavailable=clone(m);unavailable.rows[0].link_status=state;
 eq(service.list(unavailable)[0].positions[0].source_status,"unassignable","unassignable "+state);
 eq(service.beginDecision({model:unavailable,reviewId:id,positionId:pos,recheck:true}).status,"blocked","cannot rebind "+state);
}
const gone=clone(m);gone.rows=gone.rows.slice(1);eq(service.list(gone)[0].positions[0].source_status,"unassignable","disappeared");
const moved=clone(m);moved.rows[0].material_id="OTHER";eq(service.list(moved)[0].positions[0].source_status,"unassignable","same order/item other material blocked");
const current=open();eq(save({...base,direction:"request_postponement",requested_delivery_date:"2026-09-01"},current).errors,["delivery_not_later"],"must move after date");
ok(save({...base,direction:"request_postponement",requested_delivery_date:"2026-02-30"}).errors.includes("delivery_invalid"),"calendar date checked");
eq(save({...base,direction:"request_postponement",requested_delivery_date:"2026-11-01"}).status,"ready","valid postponed request");
eq(service.list(m)[0].positions[0].decision.reduction_quantity,null,"no leftover reduction for postponement");
const missingDate=model(6,"");const missingEdit=open(missingDate,true);
eq(save({...base,direction:"request_postponement",requested_delivery_date:"2026-12-01"},missingEdit,missingDate,true).status,"ready","missing prior date allowed with UI limitation");
m=missingDate;
const output=R.exportReviews(service.list(m),[{row_number:1,status:"Open"}],"DS")[0];
eq(output.action_status,"Open","not Implemented");eq(output.source_status,"current","export source state");eq(output.purchase_order,"00045001","export zero prefix");
eq(output.evidence_reference,base.evidence_reference,"free text passed to existing CSV safety boundary");ok(output.documented_history.includes("Synthetic"),"history exported");
const editCancel=open(),unchanged=hash(service.snapshot());editCancel.values.reason="unsaved";eq(hash(service.snapshot()),unchanged,"editor cancel is nonmutating clone");
for(const direction of ["keep","request_cancellation"]) {
 eq(save({...base,direction}).status,"ready","documented "+direction);
 eq(service.list(m)[0].positions[0].decision.reduction_quantity,null,"no reduction inferred for "+direction);
}
eq(save({...base,direction:"keep",work_state:"question_required",reason:"",owner:""}).status,"ready","clarification draft may remain incomplete");
eq(service.list(m)[0].positions[0].currently_documented,false,"clarification is not documented");
const finalState=service.snapshot();service.restore(finalState);eq(hash(service.snapshot()),hash(finalState),"snapshot roundtrip decisions and history");
const result={status:"PASS",assertions:count,checks,stateSignature:hash(finalState),dependencies:files.map(file=>({path:file,sha256:crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex")}))};
console.log(JSON.stringify(result,null,2));
