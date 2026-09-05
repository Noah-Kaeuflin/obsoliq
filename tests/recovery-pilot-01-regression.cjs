// Run against the actual worktree and pre-generated external fixtures, without product writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),input=process.env.OBSOLIQ_PILOT_FILES,output=process.env.OBSOLIQ_PILOT_RESULTS;
if(!input||!output)throw Error('External OBSOLIQ_PILOT_FILES and OBSOLIQ_PILOT_RESULTS required');
const paths=require('../scripts/sha256-manifest-lib.cjs').EXPECTED_PACKAGE_PATHS;
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=Object.fromEntries([...paths,'SHA256SUMS.txt'].map(file=>[file,sha(path.join(root,file))]));
const catalog=JSON.parse(fs.readFileSync(path.join(input,'PILOT_FILES.json'),'utf8'));
for(const file of catalog.files)if(sha(path.join(input,file.path))!==file.sha256)throw Error('Pilot download hash mismatch '+file.path);
for(const file of catalog.inputs)if(sha(path.join(root,file.path))!==file.sha256)throw Error('Generator input drift '+file.path);
const tests=['recovery-pilot-01-ingestion.cjs','recovery-pilot-01-product-smoke.cjs','recovery-loop-01d-regression.cjs'];let passed=0;
for(const file of tests){console.log('RUN '+file);const r=spawnSync(process.execPath,[path.join(__dirname,file)],{cwd:root,env:process.env,stdio:'inherit'});if(r.error||r.status!==0){console.error(r.error||'FAILED '+file);process.exitCode=1;break;}passed++;}
const changed=Object.keys(before).filter(file=>sha(path.join(root,file))!==before[file]);
const changedInputs=catalog.files.filter(file=>sha(path.join(input,file.path))!==file.sha256).map(f=>f.path);
if(changed.length||changedInputs.length)process.exitCode=1;
fs.mkdirSync(output,{recursive:true});
const result={suite:'RECOVERY-PILOT-01 dependency regression',passed,total:tests.length,packageDependencies:before,inputDependencies:catalog,changed,changedInputs};
fs.writeFileSync(path.join(output,'DEPENDENCIES.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,packageDependencies:Object.keys(before).length,inputDependencies:catalog.files.length}));
