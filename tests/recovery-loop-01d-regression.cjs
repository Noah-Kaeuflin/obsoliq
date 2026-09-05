// Focused extension plus unchanged registered dependencies; artifacts stay with the external caller.
const path=require("node:path"),{spawnSync}=require("node:child_process");
const tests=["recovery-loop-01d.test.cjs","recovery-loop-01d-product-smoke.cjs","recovery-loop-01c-regression.cjs"];
let passed=0;
for(const file of tests){
  console.log("RUN "+file);
  const result=spawnSync(process.execPath,[path.join(__dirname,file)],{cwd:path.resolve(__dirname,".."),env:process.env,stdio:"inherit"});
  if(result.error||result.status!==0){console.error(result.error||"FAILED "+file);process.exitCode=1;break;}
  passed++;
}
console.log(JSON.stringify({suite:"RECOVERY-LOOP-01D regression",passed,total:tests.length}));
