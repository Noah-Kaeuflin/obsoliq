// SYNTHETIC ONLY. Targeted RECOVERY-LOOP-01A contracts; no filesystem outputs.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console }); context.window = context;
for (const file of [
  "js/core/canonical-model.js", "js/core/value-utils.js", "js/data/source-model.js", "js/data/source-ingestion.js",
  "js/data/schema-profiler.js", "js/data/input-normalization-engine.js", "js/mapping/mapping-engine.js",
  "js/data/data-package-registry.js", "js/data/consumption-history-semantics-engine.js",
  "js/data/consumption-history-relationship-engine.js", "js/data/purchase-orders-builder.js",
  "js/application/input-trust-service.js", "js/application/package-import-service.js", "js/purchase-orders/purchase-order-review-service.js"
]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
const O = context.ObsoliQ, b = O.data.purchaseOrdersBuilder, parse = O.data.ingestion.parseDelimited;
const copy = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x)), hash = x => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex");
let assertions = 0; const checks = [];
function eq(a,expected,label) { assertions++; assert.deepEqual(copy(a),copy(expected),label); checks.push(label); }
function ok(value,label) { assertions++; assert.ok(value,label); checks.push(label); }
const header = "purchase_order,purchase_order_item,material_id,plant,open_quantity,base_unit";
function prepare(csv) {
  const parsed = parse(csv);
  const columnMapping = O.mapping.engine.createAutomaticColumnMapping({ headers: parsed.headers, rows: parsed.rows, ...b.mappingOptions(parsed.sourceColumnMetadata) });
  const input = { sourceRows: parsed.rows, headers: parsed.headers, sourceColumnMetadata: parsed.sourceColumnMetadata, columnMapping };
  const inspected = b.inspect(input);
  return { input: { ...input, normalizationPolicy: inspected.effectivePolicy, purchaseOrderReview: { confirmed: true, binding: inspected.reviewBinding } }, inspected, parsed };
}
const good = prepare(header+"\n00045001,00010,000123,0010,12,EA");
const built = b.buildPurchaseOrdersPackage(good.input);
eq(built.validation.status,"ready","reviewed build");
eq(built.normalizedRows[0].purchase_order,"00045001","order leading zeros");
eq(built.normalizedRows[0].purchase_order_item,"00010","item leading zeros");
eq(built.normalizedRows[0].material_id,"000123","material leading zeros");
eq(built.normalizedRows[0].plant,"0010","plant leading zeros");
eq(built.normalizedRows[0].open_quantity,12,"strict quantity");
eq(b.buildPurchaseOrdersPackage({ ...good.input, purchaseOrderReview:null }).validation.status,"invalid","confirmation required");
const rawHash=hash(good.input.sourceRows);b.inspect(good.input);eq(hash(good.input.sourceRows),rawHash,"raw immutable");
for(const value of [null,undefined,""," ","Infinity","NaN","12abc","1,234"]) {
  const input=copy(good.input);input.sourceRows[0].open_quantity=value;
  const inspected=b.inspect(input);eq(inspected.rows[0].usable,false,"unavailable "+String(value));
  eq(inspected.rows[0].open_quantity,null,"unavailable is not zero "+String(value));
}
for(const value of [0,-0,-3]) {
  const input=copy(good.input);input.sourceRows[0].open_quantity=value;
  const row=b.inspect(input).rows[0];eq(row.open_quantity,value,"numeric value retained "+value);eq(row.usable,false,"not open review "+value);
}
for(const invalid of ["0",-1,0.5,null,true]) {
  const input=copy(good.input);input.columnMapping[0].sourceIndex=invalid;
  eq(b.inspect(input).validation.status,"invalid","strict physical index "+invalid);
}
const identity=copy(good.input);identity.columnMapping[0].sourceKey="wrong";
eq(b.inspect(identity).validation.status,"invalid","wrong physical source key");
const dup=prepare(header+",open_quantity\n00045001,00010,000123,0010,2,EA,7");
let mapped=dup.input.columnMapping.map(entry=>({...entry,selectedCanonicalField:entry.sourceIndex===6?"":entry.selectedCanonicalField,ignored:entry.sourceIndex===6}));
const dupInput={...dup.input,columnMapping:mapped,normalizationPolicy:null};const first=b.inspect(dupInput);
eq(first.rows[0].open_quantity,2,"duplicate first physical column");
mapped=mapped.map(entry=>({...entry,selectedCanonicalField:entry.sourceIndex===4?"":entry.sourceIndex===6?"open_quantity":entry.selectedCanonicalField,ignored:entry.sourceIndex===4}));
const remapped=b.inspect({...dupInput,columnMapping:mapped,normalizationPolicy:first.effectivePolicy});
eq(remapped.rows[0].open_quantity,7,"duplicate second physical column");
ok(first.reviewBinding!==remapped.reviewBinding,"remap invalidates confirmation");
eq(b.buildPurchaseOrdersPackage({...dupInput,columnMapping:mapped,purchaseOrderReview:{confirmed:true,binding:first.reviewBinding}}).validation.status,"invalid","stale remap commit blocked");
const double=prepare(header.replace("open_quantity","Open Quantity in thousands")+"\n00045001,00010,000123,0010,1.2k,EA");
double.input.columnMapping[4].selectedCanonicalField="open_quantity";
double.input.columnMapping[4].ignored=false;
const doubleRow=b.inspect(double.input).rows[0];
eq(doubleRow.open_quantity,null,"double scaling unavailable");
eq(doubleRow.usable,false,"double scaling excluded");
const noOpen=prepare(header.replace("open_quantity","Order Quantity")+"\n00045001,00010,000123,0010,2,EA");
eq(noOpen.inspected.validation.status,"invalid","ordered is not open quantity");
const rows=prepare(header+"\n00045001,00010,000123,0010,2,EA\n00045001,00010,000123,0010,3,EA");
eq(rows.inspected.rows.map(row=>row.usable),[false,false],"all duplicate positions excluded");
const schedules=prepare(header+",schedule_line\n00045001,00010,000123,0010,2,EA,001");
eq(schedules.inspected.rows[0].exclusion_reasons.includes("unsupported_schedule_line"),true,"schedule unsupported");
const multi=prepare(header+",source_system\n00045001,00010,000123,0010,2,EA,A\n00045002,00010,000123,0010,3,EA,B");
eq(multi.inspected.rows.every(row=>!row.usable),true,"mixed systems excluded");
const dates=prepare(header+",delivery_date\n00045001,00010,000123,0010,2,EA,45000");
eq(dates.inspected.rows[0].delivery_date,"","serial date not guessed");
const dateInput=copy(dates.input);Object.assign(dateInput.normalizationPolicy.fields.delivery_date,{dateFormat:"excel-serial",excelDateSystem:"1904"});
ok(b.inspect(dateInput).rows[0].delivery_date.startsWith("2027"),"explicit 1904 date");
const missingUnit=prepare(header+"\n00045001,00010,000123,0010,2,");
eq(missingUnit.inspected.rows[0].base_unit,"","no invented unit");
const registry=O.data.packageRegistry.createDataPackageRegistry();
const trust=O.application.inputTrustService.createInputTrustService({canonical:O.core.canonical,schemaProfiler:O.data.schemaProfiler,inputNormalizationEngine:O.data.inputNormalizationEngine,mappingEngine:O.mapping.engine,clock:()=>""});
const service=O.application.packageImportService.createPackageImportService({sourceModel:O.data.sourceModel,mappingEngine:O.mapping.engine,inputTrustService:trust,registry,packageDefinitions:O.data.packageRegistry.DATA_PACKAGE_TYPE_DEFINITIONS,builders:{purchase_orders:b},clock:()=>"2026-09-05T00:00:00Z"});
const importInput={packageType:"purchase_orders",parsedSource:good.parsed,approvedMapping:good.input.columnMapping,normalizationPolicy:good.input.normalizationPolicy,purchaseOrderReview:good.input.purchaseOrderReview,sourceDescriptor:{sourceLabel:"synthetic.csv",classification:"synthetic"}};
const imported=service.importPackage(importInput);ok(imported.ok,"productive service commit");eq(registry.getStats().packageCount,1,"one package");
const before=hash(registry.snapshot());
for(const fault of ["before-register","after-register"]) {eq(service.importPackage({...importInput,forceCommitFailureForTest:fault}).ok,false,"register fault "+fault);eq(hash(registry.snapshot()),before,"rollback ID/revision/retention "+fault);}
eq(service.importPackage({...importInput,forceBuildErrorForTest:true}).ok,false,"builder fault");
eq(hash(registry.snapshot()),before,"builder rollback");
eq(service.importPackage({...importInput,normalizationPolicy:{}}).ok,false,"policy mismatch");
eq(hash(registry.snapshot()),before,"policy rollback");
const empty=parse(header+"\n");eq(service.importPackage({...importInput,parsedSource:empty}).ok,false,"header only");eq(hash(registry.snapshot()),before,"header only no ID");
const R=O.purchaseOrders.reviewService;
const inventoryPackage={packageId:"INV",packageType:"inventory_snapshot",datasetId:"DS",revision:1,relationshipKeys:{material:["material_id"],organization:["plant"]}};
const inventoryRows=[{material_id:"000123",plant:"0010",base_unit:"EA",stock_quantity:4,row_number:1},{material_id:"000123",plant:"0010",base_unit:"EA",stock_quantity:6,row_number:2}];
const cases=[{case_id:"CASE",material_id:"000123",plant:"0010"}];
const model=R.buildModel({inventoryPackage,poPackage:imported.packageRecord,inventoryRows,cases});
eq(model.rows[0].link_status,"matched","exact entity match");eq(model.rows[0].inventory_row_keys.length,2,"uses grouped inventory rows");
eq(R.buildModel({inventoryPackage,poPackage:imported.packageRecord,inventoryRows:[{...inventoryRows[0],base_unit:"KG"}],cases}).rows[0].link_status,"unit_conflict","unit mismatch");
eq(R.buildModel({inventoryPackage,poPackage:imported.packageRecord,inventoryRows:[],cases}).rows[0].link_status,"unmatched","unmatched");
const requests=R.createReviewService(), handoff={model,caseRecord:cases[0],actionRow:inventoryRows[0],positionIds:[model.rows[0].position_id]};
eq(requests.handoff(handoff).added,1,"handoff existing case");eq(requests.handoff(handoff).added,0,"idempotent handoff");
const next=R.buildModel({inventoryPackage:{...inventoryPackage,revision:2},poPackage:imported.packageRecord,inventoryRows,cases});
eq(requests.list(next)[0].positions[0].review_state,"stale","inventory revision stale");
const updated=service.importPackage(importInput);const nextPO=R.buildModel({inventoryPackage,poPackage:updated.packageRecord,inventoryRows,cases});
eq(requests.list(nextPO)[0].positions[0].review_state,"stale","PO source change stale");
eq(requests.list(model)[0].positions[0].review_state,"current","current source");
const corrupt=copy(imported.packageRecord);corrupt.sourceData.rows[0].open_quantity="999";
eq(R.validSource(corrupt),false,"source tampering");
const exportRows=R.exportReviews(requests.list(model),[{row_number:1,status:"Open"}],"DS");
eq(exportRows[0].source_revision,1,"export revision");eq(exportRows[0].purchase_order,"00045001","export ID");
ok(!Object.prototype.hasOwnProperty.call(exportRows[0],"recovery_potential"),"no savings claim");
eq(prepare(header+"\n00045001,00010,000123,0010,1.2k,EA").inspected.rows[0].open_quantity,1200,"cell scale preserved by automatic interpretation");
for(const [raw,expected] of [['"1.234,56"',1234.56],['"1,234.56"',1234.56],['"1 234,56"',1234.56],["1'234.56",1234.56]]) {
  eq(prepare(header+"\n00045001,00010,000123,0010,"+raw+",EA").inspected.rows[0].open_quantity,expected,"explicit locale evidence "+raw);
}
const mixedLocale=prepare(header+'\n1,1,M,P,"1.234,56",EA\n2,1,M,P,"1,234.56",EA');
ok(mixedLocale.inspected.rows.every(r=>r.open_quantity===null&&!r.usable),"mixed locale never guessed per row");
const money=prepare(header+",open_value,source_currency\n1,1,M,P,2,EA,0,EUR\n2,1,M,P,2,EA,,EUR");
eq(money.inspected.rows.map(r=>r.open_value),[0,null],"optional financial zero versus missing");
const mixedCurrency=prepare(header+",open_value,source_currency\n1,1,M,P,2,EA,10,EUR\n2,1,M,P,2,EA,20,USD");
eq(mixedCurrency.inspected.rows.map(r=>r.open_value),[null,null],"no mixed currency financial inference");
const reordered=prepare("plant,material_id,purchase_order_item,purchase_order,open_quantity,base_unit\n0010,000123,00010,00045001,12,EA");
eq(b.buildPurchaseOrdersPackage({...reordered.input,purchaseOrderReview:good.input.purchaseOrderReview}).validation.status,"invalid","reordered source requires fresh confirmation");
eq(R.buildModel({inventoryPackage,poPackage:imported.packageRecord,inventoryRows:[...inventoryRows,{...inventoryRows[0],plant:"0020",row_number:3}],cases:[...cases,{case_id:"OTHER-PLANT",material_id:"000123",plant:"0020"}]}).rows[0].case_ids,["CASE"],"no cross-plant case links");
eq(R.buildModel({inventoryPackage,poPackage:imported.packageRecord,inventoryRows:[inventoryRows[0],{...inventoryRows[1],base_unit:"KG"}],cases}).rows[0].link_status,"unit_conflict","grouped conflicting unit excluded");
const collision=prepare(header+"\n1,1,A|plant:B,C,2,EA");
const collisionPackage=service.importPackage({...importInput,parsedSource:collision.parsed,approvedMapping:collision.input.columnMapping,normalizationPolicy:collision.input.normalizationPolicy,purchaseOrderReview:collision.input.purchaseOrderReview}).packageRecord;
eq(R.buildModel({inventoryPackage,poPackage:collisionPackage,inventoryRows:[{material_id:"A|plant:B",plant:"C",base_unit:"EA"},{material_id:"A",plant:"B|plant:C",base_unit:"EA"}]}).rows[0].link_status,"ambiguous","ambiguous grouped key never chooses first row");
console.log(JSON.stringify({status:"PASS",assertions,checks,deterministicSignature:hash({normalized:built.normalizedRows,relationships:model,exportRows})},null,2));
